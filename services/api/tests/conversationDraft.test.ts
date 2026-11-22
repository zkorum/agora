import { randomUUID } from "node:crypto";
import { httpErrors } from "@fastify/sensible";
import swagger from "@fastify/swagger";
import { count, eq } from "drizzle-orm";
import { pushSchema } from "drizzle-kit/api-postgres";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import Fastify, { type FastifyInstance } from "fastify";
import {
    serializerCompiler,
    validatorCompiler,
    jsonSchemaTransform,
} from "fastify-type-provider-zod";
import { Pool } from "pg";
import postgres from "postgres";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "../src/shared-backend/schema.js";
import { Dto } from "../src/shared/types/dto.js";
import { createConversationDraftService } from "../src/service/conversationDraft.js";
import { registerConversationDraftRoutes } from "../src/service/conversationDraftRoutes.js";
import { createConversationWriteService } from "../src/service/conversationWrite.js";
import {
    getOrCreateDefaultProjectForOrganization,
    getOrCreatePersonalOrganization,
    setOrganizationMembershipRole,
} from "../src/service/projectAccess.js";
import { RealtimeSSEManager } from "../src/service/realtimeSSE.js";

describe("project conversation drafts", () => {
    let container: StartedTestContainer;
    let client: postgres.Sql;
    let db: PostgresJsDatabase;
    let server: FastifyInstance;
    let conversationWrite: ReturnType<typeof createConversationWriteService>;
    const realtime = new RealtimeSSEManager();
    const broadcast = vi.spyOn(realtime, "broadcastToAllExcept");

    beforeAll(async () => {
        container = await new GenericContainer("postgres:16-alpine")
            .withEnvironment({
                POSTGRES_USER: "postgres",
                POSTGRES_PASSWORD: "postgres",
                POSTGRES_DB: "conversation_draft_test",
            })
            .withExposedPorts(5432)
            .start();
        const connection = {
            host: container.getHost(),
            port: container.getMappedPort(5432),
            user: "postgres",
            password: "postgres",
            database: "conversation_draft_test",
        };
        client = postgres({ ...connection, onnotice: () => undefined });
        db = drizzle({ client });
        const pool = new Pool(connection);
        try {
            await (
                await pushSchema(schema, drizzlePg({ client: pool }))
            ).apply();
        } finally {
            await pool.end();
        }
        conversationWrite = createConversationWriteService({
            db,
            googleCloudCredentials: undefined,
            valkeyRef: { current: undefined },
            realtimeSSEManager: realtime,
            voteBuffer: undefined,
            assertComparisonGitHubAllowed: () => undefined,
            enqueueTranslationWork: () => Promise.resolve(),
        });
        server = Fastify();
        server.setValidatorCompiler(validatorCompiler);
        server.setSerializerCompiler(serializerCompiler);
        await server.register(swagger, {
            openapi: { info: { title: "Draft test", version: "1" } },
            transform: jsonSchemaTransform,
        });
        registerConversationDraftRoutes({
            server,
            apiVersion: "v1",
            service: createConversationDraftService({
                db,
                createConversation: conversationWrite.create,
            }),
            authenticate(request) {
                const id = request.headers["x-test-user"];
                if (typeof id !== "string") throw httpErrors.unauthorized();
                return Promise.resolve(id);
            },
            displayLanguage: () => "en",
        });
        await server.ready();
        expect(server.swagger()).toHaveProperty([
            "paths",
            "/api/v1/conversation/draft/publish",
        ]);
    }, 120_000);

    afterAll(async () => {
        await server?.close();
        await client?.end({ timeout: 5 });
        await container?.stop();
    });

    async function createUser() {
        const id = randomUUID();
        await db
            .insert(schema.userTable)
            .values({ id, username: id.slice(0, 20) });
        return id;
    }

    async function project() {
        const userId = await createUser();
        const { organizationId } = await getOrCreatePersonalOrganization({
            db,
            userId,
            autoProvisionedDefaultLanguage: "en",
        });
        return {
            userId,
            organizationId,
            ...(await getOrCreateDefaultProjectForOrganization({
                db,
                organizationId,
            })),
        };
    }

    function post({
        action,
        payload,
        userId,
    }: {
        action: "create" | "list" | "get" | "save" | "discard" | "publish";
        payload: object;
        userId?: string;
    }) {
        return server.inject({
            method: "POST",
            url: `/api/v1/conversation/draft/${action}`,
            headers: {
                ...(userId === undefined ? {} : { "x-test-user": userId }),
                "content-type": "application/json",
            },
            payload: JSON.stringify(payload),
        });
    }

    it("shares saved setup only with current facilitators and does not create live activity", async () => {
        const { userId, projectSlug, projectId, organizationId } =
            await project();
        const collaborator = await createUser();
        const payload = { projectSlug, conversationType: "prioritizing" };
        const unauthorized = await server.inject({
            method: "POST",
            url: "/api/v1/conversation/draft/save",
            headers: { "content-type": "application/json" },
            payload: "{ invalid JSON",
        });
        expect(unauthorized.statusCode).toBe(401);
        expect(unauthorized.headers["cache-control"]).toBe("no-store");
        expect((await post({ action: "create", payload })).statusCode).toBe(
            401,
        );
        const created = await post({ action: "create", userId, payload });
        expect(created.statusCode).toBe(200);
        expect(created.headers["cache-control"]).toBe("no-store");
        const draft = Dto.conversationDraft.parse(created.json());
        const lookup = { draftId: draft.id };
        const savePayload = {
            ...lookup,
            expectedRevision: draft.revision,
            content: {
                conversationType: "prioritizing",
                prioritizationType: "qv",
                conversationTitle: "Incomplete QV",
                conversationBody: "<p>Draft <script>alert(1)</script>body</p>",
                seedStatements: [{ title: "" }],
            },
        };
        const saved = await post({
            action: "save",
            userId,
            payload: savePayload,
        });
        expect(saved.statusCode).toBe(200);
        const updated = Dto.conversationDraft.parse(saved.json());
        expect(updated.content.conversationBody).toBe("<p>Draft body</p>");
        const incorrectOverride = await post({
            action: "save",
            userId,
            payload: {
                ...savePayload,
                expectedRevision: updated.revision,
                content: { ...savePayload.content, participationMode: "guest" },
            },
        });
        expect(incorrectOverride.statusCode).toBe(400);
        expect(
            (await post({ action: "save", userId, payload: savePayload }))
                .statusCode,
        ).toBe(409);

        await setOrganizationMembershipRole({
            db,
            userId: collaborator,
            organizationId,
            role: "manager",
        });
        const reopened = await post({
            action: "get",
            userId: collaborator,
            payload: lookup,
        });
        expect(reopened.statusCode).toBe(200);
        expect(reopened.json()).toEqual(saved.json());
        await setOrganizationMembershipRole({
            db,
            userId: collaborator,
            organizationId,
            role: "moderator",
        });
        expect(
            (
                await post({
                    action: "get",
                    userId: collaborator,
                    payload: lookup,
                })
            ).statusCode,
        ).toBe(404);

        const mutation = { ...lookup, expectedRevision: updated.revision };
        const invalid = await post({
            action: "publish",
            userId,
            payload: mutation,
        });
        expect(invalid.json()).toMatchObject({
            success: false,
            failure: { target: "draft" },
        });
        expect(
            await db
                .select({ count: count() })
                .from(schema.conversationTable)
                .where(eq(schema.conversationTable.projectId, projectId)),
        ).toEqual([{ count: 0 }]);
        expect(
            (await post({ action: "discard", userId, payload: mutation }))
                .statusCode,
        ).toBe(200);
        expect(
            (await post({ action: "get", userId, payload: lookup })).statusCode,
        ).toBe(404);
        expect(
            (
                await post({ action: "list", userId, payload: { projectSlug } })
            ).json(),
        ).toEqual({ drafts: [] });
    });

    it("publishes a saved revision once, including its seeds, into a personal default project", async () => {
        const { userId, projectSlug, projectId, organizationId } =
            await project();
        const collaborator = await createUser();
        await setOrganizationMembershipRole({
            db,
            organizationId,
            userId: collaborator,
            role: "manager",
        });
        const created = await post({
            action: "create",
            userId,
            payload: { projectSlug, conversationType: "polis" },
        });
        const draft = Dto.conversationDraft.parse(created.json());
        const saved = await post({
            action: "save",
            userId,
            payload: {
                draftId: draft.id,
                expectedRevision: draft.revision,
                content: {
                    conversationType: "polis",
                    conversationTitle: "A new Mapping activity",
                    seedOpinionList: ["<p>First seed opinion</p>"],
                },
            },
        });
        const updated = Dto.conversationDraft.parse(saved.json());
        await db
            .update(schema.projectTable)
            .set({ participationMode: "email_verification" })
            .where(eq(schema.projectTable.id, projectId));
        broadcast.mockClear();
        const publishRequest = {
            action: "publish" as const,
            userId,
            payload: {
                draftId: updated.id,
                expectedRevision: updated.revision,
            },
        };
        const responses = await Promise.all([
            post({ ...publishRequest, userId: collaborator }),
            post(publishRequest),
        ]);
        expect(responses.map((response) => response.statusCode)).toEqual([
            200, 200,
        ]);
        const [published, replay] = responses.map((response) =>
            Dto.publishConversationDraftResponse.parse(response.json()),
        );
        expect(published).toMatchObject({ success: true });
        expect(replay).toEqual(published);
        expect(broadcast).toHaveBeenCalledTimes(1);

        const rows = await db
            .select({
                id: schema.conversationTable.id,
                slug: schema.conversationTable.slugId,
                title: schema.conversationContentTable.title,
                participationMode: schema.conversationTable.participationMode,
                settingsSource:
                    schema.conversationTable.participationModeSettingsSource,
            })
            .from(schema.conversationTable)
            .innerJoin(
                schema.conversationContentTable,
                eq(
                    schema.conversationContentTable.id,
                    schema.conversationTable.currentContentId,
                ),
            )
            .where(eq(schema.conversationTable.projectId, projectId));
        expect(rows).toHaveLength(1);
        const [conversation] = rows;
        expect(conversation).toMatchObject({
            title: "A new Mapping activity",
            participationMode: "email_verification",
            settingsSource: "project_inherited",
        });
        expect(published).toEqual({
            success: true,
            conversationSlugId: conversation.slug,
        });
        expect(
            await db
                .select({ count: count() })
                .from(schema.opinionTable)
                .where(eq(schema.opinionTable.conversationId, conversation.id)),
        ).toEqual([{ count: 1 }]);
        expect(
            (
                await post({ action: "list", userId, payload: { projectSlug } })
            ).json(),
        ).toEqual({ drafts: [] });
    });

    it("still publishes a full legacy create request without creating a draft", async () => {
        const { userId, projectSlug } = await project();
        const result = await conversationWrite.create({
            userId,
            displayLanguage: "en",
            request: Dto.createNewConversationRequest.parse({
                conversationType: "polis",
                conversationTitle: "Legacy direct publish",
                isIndexed: true,
                participationMode: "guest",
                multilingualSetting: {
                    dynamicTranslationEnabled: false,
                    additionalLanguageCodes: [],
                },
                seedOpinionList: [],
            }),
        });
        expect(result).toMatchObject({
            success: true,
            conversationSlugId: expect.any(String),
        });
        expect(
            (
                await post({ action: "list", userId, payload: { projectSlug } })
            ).json(),
        ).toEqual({ drafts: [] });
    });

    it("resumes a Gathering draft after a project rename and publishes its configured format", async () => {
        const { userId, projectId, projectSlug } = await project();
        const created = await post({
            action: "create",
            userId,
            payload: { projectSlug, conversationType: "gathering" },
        });
        const draft = Dto.conversationDraft.parse(created.json());
        const newSlug = `${projectSlug}-renamed`;
        await db
            .update(schema.projectTable)
            .set({ slug: newSlug })
            .where(eq(schema.projectTable.id, projectId));
        const fieldId = randomUUID();
        const saved = await post({
            action: "save",
            userId,
            payload: {
                draftId: draft.id,
                expectedRevision: draft.revision,
                content: {
                    conversationType: "gathering",
                    conversationTitle: "Gather ideas",
                    gathering: {
                        gatheringMode: "new",
                        responseVisibility: "facilitators",
                        responseFormat: [
                            {
                                fieldId,
                                label: "Idea",
                                required: true,
                                characterLimit: 100,
                            },
                        ],
                        seedGatheringResponses: [
                            [{ fieldId, value: "Opening suggestion" }],
                        ],
                    },
                },
            },
        });
        const updated = Dto.conversationDraft.parse(saved.json());
        expect(updated.projectSlug).toBe(newSlug);
        const published = await post({
            action: "publish",
            userId,
            payload: { draftId: draft.id, expectedRevision: updated.revision },
        });
        expect(published.json()).toMatchObject({ success: true });
        expect(
            await db
                .select({
                    visibility: schema.gatheringConfigTable.responseVisibility,
                })
                .from(schema.conversationTable)
                .innerJoin(
                    schema.gatheringConfigTable,
                    eq(
                        schema.conversationTable.gatheringConfigId,
                        schema.gatheringConfigTable.id,
                    ),
                )
                .where(eq(schema.conversationTable.projectId, projectId)),
        ).toEqual([{ visibility: "facilitators" }]);
    });

    it("paginates stable draft summaries and omits discarded drafts", async () => {
        const { userId, projectSlug } = await project();
        const drafts = [];
        for (let index = 0; index < 3; index += 1) {
            const response = await post({
                action: "create",
                userId,
                payload: { projectSlug, conversationType: "gathering" },
            });
            const draft = Dto.conversationDraft.parse(response.json());
            // Tie all timestamps so the cursor must also order by draft ID.
            await db
                .update(schema.conversationDraftTable)
                .set({ createdAt: new Date("2026-01-01T00:00:00.000Z") })
                .where(eq(schema.conversationDraftTable.id, draft.id));
            drafts.push(draft);
        }
        const [discarded, ...remaining] = drafts;
        expect(
            (
                await post({
                    action: "discard",
                    userId,
                    payload: {
                        draftId: discarded.id,
                        expectedRevision: discarded.revision,
                    },
                })
            ).statusCode,
        ).toBe(200);
        const first = Dto.listConversationDraftsResponse.parse(
            (
                await post({
                    action: "list",
                    userId,
                    payload: { projectSlug, limit: 1 },
                })
            ).json(),
        );
        expect(first.drafts).toHaveLength(1);
        expect(first.nextCursor).toBeDefined();
        const second = Dto.listConversationDraftsResponse.parse(
            (
                await post({
                    action: "list",
                    userId,
                    payload: {
                        projectSlug,
                        limit: 1,
                        before: first.nextCursor,
                    },
                })
            ).json(),
        );
        expect(second.drafts).toHaveLength(1);
        expect(second.nextCursor).toBeUndefined();
        expect(
            [...first.drafts, ...second.drafts].map(({ id }) => id).sort(),
        ).toEqual(remaining.map(({ id }) => id).sort());
    });
});
