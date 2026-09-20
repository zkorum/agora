import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
    Dto,
    type AccessProjectDocumentRequest,
    type AccessProjectDocumentResponse,
} from "@/shared/types/dto.js";
import type { ProjectDocumentAccessAuthorization } from "./projectDocument.js";

export interface ProjectDocumentAccessRouteService {
    access: ({
        request,
        authorization,
    }: {
        request: AccessProjectDocumentRequest;
        authorization: ProjectDocumentAccessAuthorization;
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
            },
        },
        handler: async (request, reply) => {
            reply.header("Cache-Control", "no-store");
            if (request.body.audience === "participant") {
                return await service.access({
                    request: request.body,
                    authorization: { type: "public" },
                });
            }
            const { userId } = await service.authenticateFacilitator({
                request,
            });
            return await service.access({
                request: request.body,
                authorization: { type: "facilitator", userId },
            });
        },
    });
}
