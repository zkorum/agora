import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
    Dto,
    type AccessProjectDocumentRequest,
    type AccessProjectDocumentResponse,
} from "@/shared/types/dto.js";
import type { ProjectDocumentAccessAuthorization } from "./projectDocument.js";
import {
    preferredProjectDocumentEncodings,
    type ProjectDocumentEncoding,
} from "./projectDocumentCompression.js";

export interface ProjectDocumentAccessRouteService {
    access: ({
        request,
        authorization,
        acceptedEncodings,
    }: {
        request: AccessProjectDocumentRequest;
        authorization: ProjectDocumentAccessAuthorization;
        acceptedEncodings: readonly ProjectDocumentEncoding[];
    }) => Promise<AccessProjectDocumentResponse>;
    authenticateFacilitator: ({
        request,
    }: {
        request: FastifyRequest;
    }) => Promise<{
        userId: string;
    }>;
}

export function registerProjectDocumentAccessRoute({
    server,
    service,
    apiVersion,
}: {
    server: FastifyInstance;
    service: ProjectDocumentAccessRouteService;
    apiVersion: string;
}): void {
    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/project/document/access`,
        schema: {
            body: Dto.accessProjectDocumentRequest,
            response: {
                200: Dto.accessProjectDocumentResponse,
            },
        },
        config: {
            rateLimit: {
                max: 60,
                timeWindow: "1 minute",
                // Public participants can share a workshop's NAT address. The
                // file transfer is offloaded to S3; keep this quota for owners.
                allowList: (request) => {
                    const body = Dto.accessProjectDocumentRequest.safeParse(
                        request.body,
                    );
                    return body.success && body.data.audience === "participant";
                },
            },
        },
        handler: async (request, reply) => {
            reply.header("Cache-Control", "no-store");
            const acceptedEncodings = preferredProjectDocumentEncodings(
                request.headers["accept-encoding"],
            );
            if (request.body.audience === "participant") {
                return await service.access({
                    request: request.body,
                    authorization: { type: "public" },
                    acceptedEncodings,
                });
            }
            const { userId } = await service.authenticateFacilitator({
                request,
            });
            return await service.access({
                request: request.body,
                authorization: { type: "facilitator", userId },
                acceptedEncodings,
            });
        },
    });
}
