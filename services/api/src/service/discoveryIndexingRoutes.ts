import type { FastifyInstance, FastifyReply } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { zodProjectSlug, zodSlugId } from "@/shared/types/zod.js";

const conversationIndexingRequest = z.strictObject({
    conversationSlugId: zodSlugId.min(1).regex(/^[A-Za-z0-9_-]+$/),
});
// Give these wire contracts distinct names so codegen does not merge them
// into unrelated client types with the same structural shape.
const projectIndexingRequest = z
    .strictObject({ projectSlug: zodProjectSlug })
    .meta({ title: "ProjectIndexingRequest" });
const indexingResponse = z.strictObject({ isIndexed: z.boolean() });
const projectIndexingResponse = indexingResponse.meta({
    title: "ProjectIndexingResponse",
});

export type ConversationIndexingRequest = z.infer<
    typeof conversationIndexingRequest
>;
export type ProjectIndexingRequest = z.infer<typeof projectIndexingRequest>;

export function registerDiscoveryIndexingRoutes({
    server,
    apiVersion,
    isConversationIndexable,
    isProjectIndexable,
}: {
    server: FastifyInstance;
    apiVersion: string;
    isConversationIndexable: (
        request: ConversationIndexingRequest,
    ) => Promise<boolean>;
    isProjectIndexable: (request: ProjectIndexingRequest) => Promise<boolean>;
}): void {
    const routes = server.withTypeProvider<ZodTypeProvider>();
    routes.route({
        method: "POST",
        url: `/api/${apiVersion}/conversation/indexing`,
        bodyLimit: 1024,
        schema: {
            security: [],
            description:
                "Resolve the indexing policy for conversation HTML responses",
            body: conversationIndexingRequest,
            response: { 200: indexingResponse },
        },
        handler: async (request, reply) =>
            await replyWithIndexingPolicy({
                reply,
                header: "X-Conversation-Indexing",
                resolve: () => isConversationIndexable(request.body),
            }),
    });
    routes.route({
        method: "POST",
        url: `/api/${apiVersion}/project/indexing`,
        bodyLimit: 1024,
        schema: {
            security: [],
            description:
                "Resolve the indexing policy for project HTML responses",
            body: projectIndexingRequest,
            response: { 200: projectIndexingResponse },
        },
        handler: async (request, reply) =>
            await replyWithIndexingPolicy({
                reply,
                header: "X-Project-Indexing",
                resolve: () => isProjectIndexable(request.body),
            }),
    });
}

async function replyWithIndexingPolicy({
    reply,
    header,
    resolve,
}: {
    reply: FastifyReply;
    header: "X-Conversation-Indexing" | "X-Project-Indexing";
    resolve: () => Promise<boolean>;
}): Promise<z.infer<typeof indexingResponse>> {
    reply.header("Cache-Control", "no-store");
    reply.header("X-Robots-Tag", "noindex, nofollow");
    const isIndexed = await resolve();
    // nginx only permits indexing when it receives this explicit value.
    reply.header(header, isIndexed ? "index" : "noindex");
    return { isIndexed };
}
