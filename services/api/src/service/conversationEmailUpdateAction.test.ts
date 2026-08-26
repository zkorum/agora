import fastifyRateLimit from "@fastify/rate-limit";
import fastifyMultipart from "@fastify/multipart";
import fastifySensible from "@fastify/sensible";
import { eq } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import Fastify, { type FastifyInstance } from "fastify";
import {
    serializerCompiler,
    validatorCompiler,
} from "fastify-type-provider-zod";
import postgres from "postgres";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import {
    afterAll,
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";
import {
    conversationEmailUpdateActionTokenTable,
    conversationEmailUpdateReportTable,
    conversationEmailUpdateUserConversationPreferenceTable,
    conversationEmailUpdateUserProjectPreferenceTable,
} from "@/shared-backend/schema.js";
import {
    createConversationEmailUpdateActionConcurrencyGuard,
    createConversationEmailUpdateActionService,
    hashConversationEmailUpdateActionToken,
    registerConversationEmailUpdateActionRoutes,
    type ConversationEmailUpdateActionService,
} from "./conversationEmailUpdateAction.js";

process.env.TESTCONTAINERS_RYUK_DISABLED ??= "true";

const TOKEN = "0123456789abcdef0123456789abcdef01234567890";
const OTHER_TOKEN = "abcdef0123456789abcdef0123456789abcdef01234";
const USER_ID = "00000000-0000-4000-8000-000000000001";

function createMockService(): ConversationEmailUpdateActionService {
    const resolve = vi.fn<ConversationEmailUpdateActionService["resolve"]>();
    const unsubscribe =
        vi.fn<ConversationEmailUpdateActionService["unsubscribe"]>();
    const manageOptOut =
        vi.fn<ConversationEmailUpdateActionService["manageOptOut"]>();
    const submitReport =
        vi.fn<ConversationEmailUpdateActionService["submitReport"]>();
    resolve.mockResolvedValue({
        success: false,
        reason: "unavailable",
    });
    unsubscribe.mockResolvedValue({ success: true });
    manageOptOut.mockResolvedValue({ success: true });
    submitReport.mockResolvedValue({ success: true });
    return {
        resolve,
        unsubscribe,
        manageOptOut,
        submitReport,
    };
}

async function createActionServer({
    service,
}: {
    service: ConversationEmailUpdateActionService;
}): Promise<FastifyInstance> {
    const server = Fastify({ logger: false });
    await server.register(fastifySensible);
    await server.register(fastifyRateLimit, {
        global: false,
        hook: "preHandler",
    });
    await server.register(fastifyMultipart);
    server.setValidatorCompiler(validatorCompiler);
    server.setSerializerCompiler(serializerCompiler);
    server.register((actionServer, _options, done) => {
        registerConversationEmailUpdateActionRoutes({
            server: actionServer,
            service,
            apiVersion: "v1",
        });
        done();
    });
    await server.ready();
    return server;
}

describe("conversation email update action routes", () => {
    let server: FastifyInstance;
    let service: ConversationEmailUpdateActionService;

    beforeEach(async () => {
        service = createMockService();
        server = await createActionServer({ service });
    });

    afterEach(async () => {
        await server.close();
    });

    it("returns action security headers without requiring authentication", async () => {
        const response = await server.inject({
            method: "POST",
            url: "/api/v1/conversation/email-update/action/resolve",
            payload: { token: TOKEN },
        });

        expect(response.statusCode).toBe(200);
        expect(response.headers["cache-control"]).toBe("no-store");
        expect(response.headers["referrer-policy"]).toBe("no-referrer");
        expect(response.headers["x-robots-tag"]).toBe("noindex, nofollow");
        expect(response.headers["content-security-policy"]).toContain(
            "default-src 'none'",
        );
        expect(service.resolve).toHaveBeenCalledWith({ token: TOKEN });
    });

    it("accepts the exact RFC 8058 form-urlencoded body and never mutates on GET", async () => {
        const oneClickUrl =
            "/api/v1/conversation/email-update/action/one-click/" + TOKEN;
        const accepted = await server.inject({
            method: "POST",
            url: oneClickUrl,
            headers: {
                "content-type": "application/x-www-form-urlencoded",
            },
            payload: "List-Unsubscribe=One-Click",
        });
        const rejected = await server.inject({
            method: "POST",
            url: oneClickUrl,
            headers: {
                "content-type": "application/x-www-form-urlencoded",
            },
            payload: "List-Unsubscribe=one-click",
        });
        const getResponse = await server.inject({
            method: "GET",
            url: oneClickUrl,
        });

        expect(accepted.statusCode).toBe(200);
        expect(rejected.statusCode).toBe(400);
        expect(getResponse.statusCode).toBe(404);
        expect(service.unsubscribe).toHaveBeenCalledTimes(1);
        expect(service.unsubscribe).toHaveBeenCalledWith({ token: TOKEN });
    });

    it("accepts one exact RFC 8058 multipart field", async () => {
        const boundary = "agora-rfc8058-boundary";
        const oneClickUrl =
            "/api/v1/conversation/email-update/action/one-click/" + TOKEN;
        const accepted = await server.inject({
            method: "POST",
            url: oneClickUrl,
            headers: {
                "content-type": `multipart/form-data; boundary=${boundary}`,
            },
            payload: [
                `--${boundary}`,
                'Content-Disposition: form-data; name="List-Unsubscribe"',
                "",
                "One-Click",
                `--${boundary}--`,
                "",
            ].join("\r\n"),
        });

        expect(accepted.statusCode).toBe(200);
        expect(service.unsubscribe).toHaveBeenCalledOnce();
        expect(service.unsubscribe).toHaveBeenCalledWith({ token: TOKEN });
    });

    it("rejects multipart files, extra fields, and extra values", async () => {
        const oneClickUrl =
            "/api/v1/conversation/email-update/action/one-click/" + TOKEN;
        const cases: string[][][] = [
            [
                [
                    'Content-Disposition: form-data; name="List-Unsubscribe"',
                    "",
                    "One-Click",
                ],
                ['Content-Disposition: form-data; name="extra"', "", "value"],
            ],
            [
                [
                    'Content-Disposition: form-data; name="List-Unsubscribe"',
                    "",
                    "One-Click",
                ],
                [
                    'Content-Disposition: form-data; name="List-Unsubscribe"',
                    "",
                    "One-Click",
                ],
            ],
            [
                [
                    'Content-Disposition: form-data; name="List-Unsubscribe"; filename="value.txt"',
                    "Content-Type: text/plain",
                    "",
                    "One-Click",
                ],
            ],
        ];

        for (const [index, caseParts] of cases.entries()) {
            const boundary = `agora-invalid-${String(index)}`;
            const response = await server.inject({
                method: "POST",
                url: oneClickUrl,
                headers: {
                    "content-type": `multipart/form-data; boundary=${boundary}`,
                },
                payload: [
                    ...caseParts.flatMap((partLines) => [
                        `--${boundary}`,
                        ...partLines,
                    ]),
                    `--${boundary}--`,
                    "",
                ].join("\r\n"),
            });
            expect(response.statusCode).toBeGreaterThanOrEqual(400);
        }

        expect(service.unsubscribe).not.toHaveBeenCalled();
    });

    it("rate limits mutations independently of token validity", async () => {
        const statuses: number[] = [];
        for (let index = 0; index < 11; index += 1) {
            const response = await server.inject({
                method: "POST",
                url: "/api/v1/conversation/email-update/action/unsubscribe",
                payload: { token: TOKEN },
            });
            statuses.push(response.statusCode);
        }

        expect(statuses.slice(0, 10)).toEqual(Array(10).fill(200));
        expect(statuses.at(10)).toBe(429);
        expect(service.unsubscribe).toHaveBeenCalledTimes(10);

        const otherAttendee = await server.inject({
            method: "POST",
            url: "/api/v1/conversation/email-update/action/unsubscribe",
            payload: { token: OTHER_TOKEN },
        });
        expect(otherAttendee.statusCode).toBe(200);
        expect(service.unsubscribe).toHaveBeenCalledTimes(11);
    });

    it("shares one capability quota across mutation routes", async () => {
        for (let index = 0; index < 9; index += 1) {
            const response = await server.inject({
                method: "POST",
                url: "/api/v1/conversation/email-update/action/unsubscribe",
                payload: { token: TOKEN },
            });
            expect(response.statusCode).toBe(200);
        }
        const report = await server.inject({
            method: "POST",
            url: "/api/v1/conversation/email-update/action/report",
            payload: { token: TOKEN, reason: "spam" },
        });
        const blocked = await server.inject({
            method: "POST",
            url: "/api/v1/conversation/email-update/action/manage/opt-out",
            payload: {
                token: TOKEN,
                target: { kind: "project", projectSlug: "public-plan" },
            },
        });

        expect(report.statusCode).toBe(200);
        expect(blocked.statusCode).toBe(429);
    });
});

describe("hashConversationEmailUpdateActionToken", () => {
    it("hashes the raw token as lowercase SHA-256 hex", () => {
        expect(hashConversationEmailUpdateActionToken("action-token")).toBe(
            "da8faaef3c459c118cc88867e4d42ecbda3e96276d2bba7400a3bef9579aa035",
        );
    });
});

describe("conversation email update action concurrency guard", () => {
    it("rejects excess concurrent work without coupling sequential callers", async () => {
        const guard = createConversationEmailUpdateActionConcurrencyGuard({
            maximumConcurrent: 1,
        });
        let releaseFirst: (() => void) | undefined;
        const first = guard.run(
            async () =>
                await new Promise<string>((resolve) => {
                    releaseFirst = () => {
                        resolve("first");
                    };
                }),
        );

        await expect(
            guard.run(() => Promise.resolve("second")),
        ).resolves.toBeUndefined();
        releaseFirst?.();
        await expect(first).resolves.toBe("first");
        await expect(guard.run(() => Promise.resolve("third"))).resolves.toBe(
            "third",
        );
    });
});

describe("conversation email update action service", () => {
    let container: StartedTestContainer;
    let sqlClient: postgres.Sql;
    let db: PostgresJsDatabase;
    let service: ConversationEmailUpdateActionService;

    beforeAll(async () => {
        container = await new GenericContainer("postgres:16-alpine")
            .withEnvironment({
                POSTGRES_USER: "postgres",
                POSTGRES_PASSWORD: "postgres",
                POSTGRES_DB: "agora_test",
            })
            .withExposedPorts(5432)
            .start();
        sqlClient = postgres({
            host: container.getHost(),
            port: container.getMappedPort(5432),
            database: "agora_test",
            username: "postgres",
            password: "postgres",
            max: 4,
        });
        db = drizzle(sqlClient);
        service = createConversationEmailUpdateActionService({ db });
        await sqlClient.unsafe(`
            CREATE TABLE "user" ("id" uuid PRIMARY KEY);
            CREATE TABLE "project" (
                "id" integer PRIMARY KEY,
                "slug" varchar(100) NOT NULL
            );
            CREATE TABLE "conversation" (
                "id" integer PRIMARY KEY,
                "project_id" integer NOT NULL,
                "slug_id" varchar(8) NOT NULL
            );
            CREATE TABLE "conversation_email_update" (
                "id" integer PRIMARY KEY,
                "project_id" integer NOT NULL,
                "scope_kind" text NOT NULL,
                "project_title_snapshot" varchar(200) NOT NULL,
                "subject" varchar(140) NOT NULL
            );
            CREATE TABLE "conversation_email_update_delivery" (
                "id" integer PRIMARY KEY,
                "update_id" integer NOT NULL,
                "participant_preference_scope" text NOT NULL
            );
            CREATE TABLE "conversation_email_update_recipient" (
                "id" bigint PRIMARY KEY,
                "delivery_id" integer NOT NULL,
                "user_id" uuid NOT NULL,
                "kind" text NOT NULL
            );
            CREATE TABLE "conversation_email_update_conversation" (
                "update_id" integer NOT NULL,
                "conversation_id" integer NOT NULL,
                "conversation_title_snapshot" varchar(200) NOT NULL,
                PRIMARY KEY ("update_id", "conversation_id")
            );
            CREATE TABLE "conversation_email_update_recipient_conversation" (
                "recipient_id" bigint NOT NULL,
                "update_id" integer NOT NULL,
                "conversation_id" integer NOT NULL,
                PRIMARY KEY ("recipient_id", "conversation_id")
            );
            CREATE TABLE "conversation_email_update_delivery_attempt" (
                "public_id" uuid PRIMARY KEY,
                "recipient_id" bigint NOT NULL
            );
            CREATE TABLE "conversation_email_update_delivery_attempt_conversation" (
                "attempt_public_id" uuid NOT NULL,
                "recipient_id" bigint NOT NULL,
                "conversation_id" integer NOT NULL,
                PRIMARY KEY ("attempt_public_id", "conversation_id")
            );
            CREATE TABLE "conversation_email_update_action_token" (
                "id" bigint PRIMARY KEY,
                "token_hash" varchar(64) NOT NULL UNIQUE,
                "attempt_public_id" uuid NOT NULL,
                "action" text NOT NULL,
                "expires_at" timestamp NOT NULL,
                "last_used_at" timestamp
            );
            CREATE TABLE "conversation_email_update_user_project_preference" (
                "user_id" uuid NOT NULL,
                "project_id" integer NOT NULL,
                "enabled" boolean NOT NULL,
                "choice_at" timestamp NOT NULL,
                "choice_source" text NOT NULL,
                "created_at" timestamp NOT NULL DEFAULT now(),
                PRIMARY KEY ("user_id", "project_id")
            );
            CREATE TABLE "conversation_email_update_user_conversation_preference" (
                "user_id" uuid NOT NULL,
                "conversation_id" integer NOT NULL,
                "enabled" boolean NOT NULL,
                "choice_at" timestamp NOT NULL,
                "choice_source" text NOT NULL,
                "created_at" timestamp NOT NULL DEFAULT now(),
                PRIMARY KEY ("user_id", "conversation_id")
            );
            CREATE TABLE "conversation_email_update_report" (
                "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                "recipient_id" bigint NOT NULL UNIQUE,
                "reason" text NOT NULL,
                "details" text,
                "created_at" timestamp NOT NULL DEFAULT now()
            );
        `);
    }, 120_000);

    afterAll(async () => {
        await sqlClient.end({ timeout: 5 });
        await container.stop();
    }, 120_000);

    beforeEach(async () => {
        await sqlClient.unsafe(`
            TRUNCATE TABLE
                "conversation_email_update_report",
                "conversation_email_update_user_conversation_preference",
                "conversation_email_update_user_project_preference",
                "conversation_email_update_action_token",
                "conversation_email_update_delivery_attempt_conversation",
                "conversation_email_update_delivery_attempt",
                "conversation_email_update_recipient_conversation",
                "conversation_email_update_conversation",
                "conversation_email_update_recipient",
                "conversation_email_update_delivery",
                "conversation_email_update",
                "conversation",
                "project",
                "user";
        `);
        await sqlClient`
            INSERT INTO "user" ("id") VALUES (${USER_ID})
        `;
    });

    async function seedAction({
        token,
        action,
        scopeKind,
        representedConversationIds,
        authorizedConversationIds = representedConversationIds,
        participantPreferenceScope,
        recipientKind = "participant",
    }: {
        token: string;
        action:
            | "unsubscribe_project"
            | "unsubscribe_conversation"
            | "manage_preferences"
            | "report";
        scopeKind: "listed_project" | "no_project";
        representedConversationIds: number[];
        authorizedConversationIds?: number[];
        participantPreferenceScope?: "project" | "conversation";
        recipientKind?: "participant" | "conversation_owner_copy";
    }): Promise<void> {
        await sqlClient`
            INSERT INTO "project" ("id", "slug")
            VALUES (1, 'listed-project')
        `;
        await sqlClient`
            INSERT INTO "conversation" ("id", "project_id", "slug_id")
            VALUES (10, 1, 'conv0001'), (11, 1, 'conv0002')
        `;
        await sqlClient`
            INSERT INTO "conversation_email_update"
                ("id", "project_id", "scope_kind", "project_title_snapshot", "subject")
            VALUES (20, 1, ${scopeKind}, 'Frozen Project', 'Frozen subject')
        `;
        await sqlClient`
            INSERT INTO "conversation_email_update_delivery"
                ("id", "update_id", "participant_preference_scope")
            VALUES (
                30,
                20,
                ${participantPreferenceScope ?? (scopeKind === "listed_project" ? "project" : "conversation")}
            )
        `;
        await sqlClient`
            INSERT INTO "conversation_email_update_recipient"
                ("id", "delivery_id", "user_id", "kind")
            VALUES (40, 30, ${USER_ID}, ${recipientKind})
        `;
        const selectedConversationIds =
            scopeKind === "no_project" ? representedConversationIds : [10, 11];
        for (const conversationId of selectedConversationIds) {
            await sqlClient`
                INSERT INTO "conversation_email_update_conversation"
                    ("update_id", "conversation_id", "conversation_title_snapshot")
                VALUES (
                    20,
                    ${conversationId},
                    ${conversationId === 10 ? "Frozen first" : "Frozen second"}
                )
            `;
        }
        for (const conversationId of representedConversationIds) {
            await sqlClient`
                INSERT INTO "conversation_email_update_recipient_conversation"
                    ("recipient_id", "update_id", "conversation_id")
                VALUES (40, 20, ${conversationId})
            `;
        }
        const attemptPublicId = "00000000-0000-4000-8000-000000000001";
        await sqlClient`
            INSERT INTO "conversation_email_update_delivery_attempt"
                ("public_id", "recipient_id")
            VALUES (${attemptPublicId}, 40)
        `;
        for (const conversationId of authorizedConversationIds) {
            await sqlClient`
                INSERT INTO "conversation_email_update_delivery_attempt_conversation"
                    ("attempt_public_id", "recipient_id", "conversation_id")
                VALUES (${attemptPublicId}, 40, ${conversationId})
            `;
        }
        await sqlClient`
            INSERT INTO "conversation_email_update_action_token"
                ("id", "token_hash", "attempt_public_id", "action", "expires_at")
            VALUES (
                50,
                ${hashConversationEmailUpdateActionToken(token)},
                ${attemptPublicId},
                ${action},
                '2100-01-01'
            )
        `;
    }

    it("resolves and mutates only management targets in the recipient snapshot", async () => {
        await seedAction({
            token: TOKEN,
            action: "manage_preferences",
            scopeKind: "listed_project",
            representedConversationIds: [10],
        });

        const resolution = await service.resolve({ token: TOKEN });
        const unrelatedResult = await service.manageOptOut({
            token: TOKEN,
            target: {
                kind: "conversation",
                conversationSlugId: "conv0002",
            },
        });
        const representedResult = await service.manageOptOut({
            token: TOKEN,
            target: {
                kind: "conversation",
                conversationSlugId: "conv0001",
            },
        });
        const preferences = await db
            .select()
            .from(conversationEmailUpdateUserConversationPreferenceTable);

        expect(resolution).toEqual({
            success: true,
            action: "manage_preferences",
            scope: {
                kind: "project",
                projectSlug: "listed-project",
                title: "Frozen Project",
                conversations: [
                    {
                        conversationSlugId: "conv0001",
                        title: "Frozen first",
                    },
                ],
            },
        });
        expect(unrelatedResult).toEqual({
            success: false,
            reason: "unavailable",
        });
        expect(representedResult).toEqual({ success: true });
        expect(preferences).toMatchObject([
            {
                userId: USER_ID,
                conversationId: 10,
                enabled: false,
                choiceSource: "unsubscribe",
            },
        ]);
    });

    it("binds action capabilities to conversations authorized for the send", async () => {
        await seedAction({
            token: TOKEN,
            action: "manage_preferences",
            scopeKind: "listed_project",
            representedConversationIds: [10, 11],
            authorizedConversationIds: [10],
        });

        expect(await service.resolve({ token: TOKEN })).toMatchObject({
            success: true,
            action: "manage_preferences",
            scope: {
                conversations: [{ conversationSlugId: "conv0001" }],
            },
        });
        expect(
            await service.manageOptOut({
                token: TOKEN,
                target: {
                    kind: "conversation",
                    conversationSlugId: "conv0002",
                },
            }),
        ).toEqual({ success: false, reason: "unavailable" });
    });

    it("disables a project and its positive conversation overrides", async () => {
        await seedAction({
            token: TOKEN,
            action: "unsubscribe_project",
            scopeKind: "listed_project",
            representedConversationIds: [10],
        });
        await db
            .insert(conversationEmailUpdateUserProjectPreferenceTable)
            .values({
                userId: USER_ID,
                projectId: 1,
                enabled: true,
                choiceAt: new Date("2025-01-01"),
                choiceSource: "settings",
            });
        await db
            .insert(conversationEmailUpdateUserConversationPreferenceTable)
            .values([
                {
                    userId: USER_ID,
                    conversationId: 10,
                    enabled: true,
                    choiceAt: new Date("2025-01-01"),
                    choiceSource: "settings",
                },
                {
                    userId: USER_ID,
                    conversationId: 11,
                    enabled: false,
                    choiceAt: new Date("2025-01-02"),
                    choiceSource: "settings",
                },
            ]);
        await sqlClient`
            INSERT INTO "project" ("id", "slug")
            VALUES (2, 'other-project')
        `;
        await sqlClient`
            INSERT INTO "conversation" ("id", "project_id", "slug_id")
            VALUES (12, 2, 'conv0003')
        `;
        await db
            .insert(conversationEmailUpdateUserConversationPreferenceTable)
            .values({
                userId: USER_ID,
                conversationId: 12,
                enabled: true,
                choiceAt: new Date("2025-01-03"),
                choiceSource: "settings",
            });

        expect(await service.unsubscribe({ token: TOKEN })).toEqual({
            success: true,
        });
        expect(await service.unsubscribe({ token: TOKEN })).toEqual({
            success: true,
        });
        const preferences = await db
            .select()
            .from(conversationEmailUpdateUserProjectPreferenceTable);
        const conversationPreferences = await db
            .select({
                conversationId:
                    conversationEmailUpdateUserConversationPreferenceTable.conversationId,
                enabled:
                    conversationEmailUpdateUserConversationPreferenceTable.enabled,
                choiceAt:
                    conversationEmailUpdateUserConversationPreferenceTable.choiceAt,
                choiceSource:
                    conversationEmailUpdateUserConversationPreferenceTable.choiceSource,
            })
            .from(conversationEmailUpdateUserConversationPreferenceTable)
            .orderBy(
                conversationEmailUpdateUserConversationPreferenceTable.conversationId,
            );
        const tokens = await db
            .select({
                lastUsedAt: conversationEmailUpdateActionTokenTable.lastUsedAt,
            })
            .from(conversationEmailUpdateActionTokenTable)
            .where(eq(conversationEmailUpdateActionTokenTable.id, 50n));

        expect(preferences).toMatchObject([
            {
                userId: USER_ID,
                projectId: 1,
                enabled: false,
                choiceSource: "unsubscribe",
            },
        ]);
        expect(conversationPreferences).toMatchObject([
            {
                conversationId: 10,
                enabled: false,
                choiceSource: "unsubscribe",
            },
            {
                conversationId: 11,
                enabled: false,
                choiceSource: "settings",
            },
            {
                conversationId: 12,
                enabled: true,
                choiceSource: "settings",
            },
        ]);
        expect(conversationPreferences.at(0)?.choiceAt).toBeInstanceOf(Date);
        expect(conversationPreferences.at(1)?.choiceAt).toEqual(
            new Date("2025-01-02"),
        );
        expect(conversationPreferences.at(2)?.choiceAt).toEqual(
            new Date("2025-01-03"),
        );
        expect(tokens.at(0)?.lastUsedAt).toBeInstanceOf(Date);
    });

    it("directly unsubscribes the sole No Project conversation", async () => {
        await seedAction({
            token: TOKEN,
            action: "unsubscribe_conversation",
            scopeKind: "no_project",
            representedConversationIds: [10],
        });
        await db
            .insert(conversationEmailUpdateUserConversationPreferenceTable)
            .values([
                {
                    userId: USER_ID,
                    conversationId: 10,
                    enabled: true,
                    choiceAt: new Date("2025-01-01"),
                    choiceSource: "settings",
                },
                {
                    userId: USER_ID,
                    conversationId: 11,
                    enabled: true,
                    choiceAt: new Date("2025-01-01"),
                    choiceSource: "settings",
                },
            ]);

        expect(await service.unsubscribe({ token: TOKEN })).toEqual({
            success: true,
        });
        const preferences = await db
            .select({
                conversationId:
                    conversationEmailUpdateUserConversationPreferenceTable.conversationId,
                enabled:
                    conversationEmailUpdateUserConversationPreferenceTable.enabled,
            })
            .from(conversationEmailUpdateUserConversationPreferenceTable)
            .orderBy(
                conversationEmailUpdateUserConversationPreferenceTable.conversationId,
            );

        expect(preferences).toEqual([
            { conversationId: 10, enabled: false },
            { conversationId: 11, enabled: true },
        ]);
    });

    it("unsubscribes every represented conversation for a listed conversation-scoped delivery", async () => {
        await seedAction({
            token: TOKEN,
            action: "unsubscribe_conversation",
            scopeKind: "listed_project",
            participantPreferenceScope: "conversation",
            representedConversationIds: [10, 11],
        });

        expect(await service.resolve({ token: TOKEN })).toEqual({
            success: true,
            action: "unsubscribe_conversation",
            scope: {
                kind: "no_project",
                conversations: [
                    {
                        conversationSlugId: "conv0001",
                        title: "Frozen first",
                    },
                    {
                        conversationSlugId: "conv0002",
                        title: "Frozen second",
                    },
                ],
            },
        });
        expect(await service.unsubscribe({ token: TOKEN })).toEqual({
            success: true,
        });
        const preferences = await db
            .select({
                conversationId:
                    conversationEmailUpdateUserConversationPreferenceTable.conversationId,
                enabled:
                    conversationEmailUpdateUserConversationPreferenceTable.enabled,
            })
            .from(conversationEmailUpdateUserConversationPreferenceTable)
            .orderBy(
                conversationEmailUpdateUserConversationPreferenceTable.conversationId,
            );

        expect(preferences).toEqual([
            { conversationId: 10, enabled: false },
            { conversationId: 11, enabled: false },
        ]);
    });

    it("rejects an invalid multi-conversation No Project scope", async () => {
        await seedAction({
            token: TOKEN,
            action: "unsubscribe_conversation",
            scopeKind: "no_project",
            representedConversationIds: [10, 11],
        });

        expect(await service.resolve({ token: TOKEN })).toEqual({
            success: false,
            reason: "unavailable",
        });
        expect(await service.unsubscribe({ token: TOKEN })).toEqual({
            success: false,
            reason: "unavailable",
        });
    });

    it("uses the same unavailable response for invalid and expired tokens", async () => {
        await seedAction({
            token: TOKEN,
            action: "unsubscribe_project",
            scopeKind: "listed_project",
            representedConversationIds: [10],
        });
        const expected = { success: false, reason: "unavailable" };

        expect(
            await service.resolve({
                token: "abcdefghijabcdefghijabcdefghijabcdefghijabc",
            }),
        ).toEqual(expected);
        await sqlClient`
            UPDATE "conversation_email_update_action_token"
            SET "expires_at" = '2000-01-01'
        `;
        expect(await service.resolve({ token: TOKEN })).toEqual(expected);
    });

    it("records at most one confidential report per recipient", async () => {
        await seedAction({
            token: TOKEN,
            action: "report",
            scopeKind: "no_project",
            representedConversationIds: [10],
        });

        expect(
            await service.submitReport({
                token: TOKEN,
                reason: "spam",
                details: "First report",
            }),
        ).toEqual({ success: true });
        expect(
            await service.submitReport({
                token: TOKEN,
                reason: "abuse",
                details: "Duplicate report",
            }),
        ).toEqual({ success: true });
        const reports = await db
            .select()
            .from(conversationEmailUpdateReportTable);

        expect(reports).toMatchObject([
            {
                recipientId: 40n,
                reason: "spam",
                details: "First report",
            },
        ]);
    });

    it("accepts a scope-bound owner manage token", async () => {
        await seedAction({
            token: TOKEN,
            action: "manage_preferences",
            scopeKind: "listed_project",
            representedConversationIds: [10],
            recipientKind: "conversation_owner_copy",
        });

        expect(await service.resolve({ token: TOKEN })).toMatchObject({
            success: true,
            action: "manage_preferences",
            scope: {
                kind: "project",
                conversations: [{ conversationSlugId: "conv0001" }],
            },
        });
        expect(
            await service.manageOptOut({
                token: TOKEN,
                target: {
                    kind: "conversation",
                    conversationSlugId: "conv0002",
                },
            }),
        ).toEqual({ success: false, reason: "unavailable" });
        expect(
            await service.manageOptOut({
                token: TOKEN,
                target: {
                    kind: "conversation",
                    conversationSlugId: "conv0001",
                },
            }),
        ).toEqual({ success: true });
    });

    it("accepts an owner project-unsubscribe token", async () => {
        await seedAction({
            token: TOKEN,
            action: "unsubscribe_project",
            scopeKind: "listed_project",
            representedConversationIds: [10],
            recipientKind: "conversation_owner_copy",
        });

        expect(await service.unsubscribe({ token: TOKEN })).toEqual({
            success: true,
        });
        await expect(
            db.select().from(conversationEmailUpdateUserProjectPreferenceTable),
        ).resolves.toMatchObject([
            {
                userId: USER_ID,
                projectId: 1,
                enabled: false,
                choiceSource: "unsubscribe",
            },
        ]);
    });

    it("accepts an owner No Project conversation-unsubscribe token", async () => {
        await seedAction({
            token: TOKEN,
            action: "unsubscribe_conversation",
            scopeKind: "no_project",
            representedConversationIds: [10],
            recipientKind: "conversation_owner_copy",
        });

        expect(await service.unsubscribe({ token: TOKEN })).toEqual({
            success: true,
        });
        await expect(
            db
                .select()
                .from(conversationEmailUpdateUserConversationPreferenceTable),
        ).resolves.toMatchObject([
            {
                userId: USER_ID,
                conversationId: 10,
                enabled: false,
                choiceSource: "unsubscribe",
            },
        ]);
    });

    it("accepts a scope-bound owner report token", async () => {
        await seedAction({
            token: TOKEN,
            action: "report",
            scopeKind: "no_project",
            representedConversationIds: [10],
            recipientKind: "conversation_owner_copy",
        });

        expect(
            await service.submitReport({
                token: TOKEN,
                reason: "spam",
                details: "Owner report",
            }),
        ).toEqual({ success: true });
        await expect(
            db.select().from(conversationEmailUpdateReportTable),
        ).resolves.toMatchObject([
            {
                recipientId: 40n,
                reason: "spam",
                details: "Owner report",
            },
        ]);
    });
});
