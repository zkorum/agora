import { httpErrors } from "@fastify/sensible";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import type { SupportedDisplayLanguageCodes } from "@/shared/languages.js";
import { Dto } from "@/shared/types/dto.js";
import type { createConversationDraftService } from "./conversationDraft.js";

export function registerConversationDraftRoutes({
    server,
    apiVersion,
    service,
    authenticate,
    displayLanguage,
}: {
    server: FastifyInstance;
    apiVersion: string;
    service: ReturnType<typeof createConversationDraftService>;
    authenticate: (request: FastifyRequest) => Promise<string>;
    displayLanguage: (request: FastifyRequest) => SupportedDisplayLanguageCodes;
}): void {
    server.register(
        (scope, _options, done) => {
            const routes = scope.withTypeProvider<ZodTypeProvider>();
            const identities = new WeakMap<FastifyRequest, string>();

            routes.addHook("onRequest", async (request, reply) => {
                reply.header("Cache-Control", "no-store");
                // Authenticate before parsing potentially large draft documents.
                identities.set(request, await authenticate(request));
            });

            function userId(request: FastifyRequest): string {
                const id = identities.get(request);
                if (id === undefined) throw httpErrors.unauthorized();
                return id;
            }

            routes.post(
                "/create",
                {
                    schema: {
                        body: Dto.createConversationDraftRequest,
                        response: { 200: Dto.conversationDraft },
                    },
                },
                async (request) =>
                    await service.create({
                        request: request.body,
                        userId: userId(request),
                    }),
            );
            routes.post(
                "/list",
                {
                    schema: {
                        body: Dto.listConversationDraftsRequest,
                        response: { 200: Dto.listConversationDraftsResponse },
                    },
                },
                async (request) =>
                    await service.list({
                        request: request.body,
                        userId: userId(request),
                    }),
            );
            routes.post(
                "/get",
                {
                    schema: {
                        body: Dto.conversationDraftRequest,
                        response: { 200: Dto.conversationDraft },
                    },
                },
                async (request) =>
                    await service.get({
                        request: request.body,
                        userId: userId(request),
                    }),
            );
            routes.post(
                "/save",
                {
                    schema: {
                        body: Dto.saveConversationDraftRequest,
                        response: { 200: Dto.conversationDraft },
                    },
                },
                async (request) =>
                    await service.save({
                        request: request.body,
                        userId: userId(request),
                    }),
            );
            routes.post(
                "/discard",
                {
                    schema: {
                        body: Dto.mutateConversationDraftRequest,
                        response: { 200: Dto.discardConversationDraftResponse },
                    },
                },
                async (request) =>
                    await service.discard({
                        request: request.body,
                        userId: userId(request),
                    }),
            );
            routes.post(
                "/publish",
                {
                    schema: {
                        body: Dto.publishConversationDraftRequest,
                        response: { 200: Dto.publishConversationDraftResponse },
                    },
                },
                async (request) =>
                    await service.publish({
                        request: request.body,
                        userId: userId(request),
                        displayLanguage: displayLanguage(request),
                    }),
            );
            done();
        },
        { prefix: `/api/${apiVersion}/conversation/draft` },
    );
}
