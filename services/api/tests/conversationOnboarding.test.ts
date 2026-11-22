import { eq, sql } from "drizzle-orm";
import { withReplicas } from "drizzle-orm/pg-core";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import type { createConversationEmailUpdateService } from "../src/service/conversationEmailUpdate.js";
import type { getConversationParticipationStatus } from "../src/service/participationGate.js";
import { userTable } from "../src/shared-backend/schema.js";
import type { DeviceLoginStatusExtended } from "../src/shared/types/zod.js";
import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";
import { readDbFixtureSql } from "./dbFixture.js";

type EmailService = ReturnType<typeof createConversationEmailUpdateService>;
const mocks = vi.hoisted(() => ({
    createEmail:
        vi.fn<
            (
                options: Parameters<
                    typeof createConversationEmailUpdateService
                >[0],
            ) => Pick<
                EmailService,
                "updatePreference" | "getParticipationOnboardingAction"
            >
        >(),
    status: vi.fn<typeof getConversationParticipationStatus>(),
}));
vi.mock("../src/service/conversationEmailUpdate.js", () => ({
    createConversationEmailUpdateService: mocks.createEmail,
}));
vi.mock("../src/service/participationGate.js", () => ({
    getConversationParticipationStatus: mocks.status,
}));

import { saveConversationOnboardingPreference } from "../src/service/conversationOnboarding.js";

const userId = "00000000-0000-4000-8000-000000000001";
const deviceStatus: Extract<DeviceLoginStatusExtended, { isKnown: true }> = {
    isKnown: true,
    isRegistered: true,
    isLoggedIn: true,
    userId,
    credentials: { email: "verified@example.com", phone: null, rarimo: null },
};
const request = {
    operation: "set_project_preference",
    projectSlug: "project",
    conversationSlugId: "example",
    enabled: true,
} as const;
const emailUpdateOptions = {
    sendingEnabled: true,
    baseImageServiceUrl: "https://example.com/images/",
    siteBaseUrl: "https://example.com/",
};

describe("onboarding preference write and snapshot transaction", () => {
    let container: StartedTestContainer | undefined;
    let client: postgres.Sql | undefined;
    let db: PostgresJsDatabase;
    beforeAll(async () => {
        container = await new GenericContainer(
            process.env.AGORA_TEST_POSTGRES_IMAGE ?? "postgres:16-alpine",
        )
            .withEnvironment({
                POSTGRES_USER: "postgres",
                POSTGRES_PASSWORD: "postgres",
                POSTGRES_DB: "agora_test",
            })
            .withExposedPorts(5432)
            .start();
        client = postgres({
            host: container.getHost(),
            port: container.getMappedPort(5432),
            database: "agora_test",
            username: "postgres",
            password: "postgres",
        });
        db = drizzle({ client });
        await db.execute(sql.raw(readDbFixtureSql("survey-option-text.sql")));
    }, 120_000);
    afterAll(async () => {
        if (client !== undefined) await client.end();
        if (container !== undefined) await container.stop();
    });
    beforeEach(async () => {
        vi.resetAllMocks();
        await db
            .insert(userTable)
            .values({ id: userId, username: "original" })
            .onConflictDoUpdate({
                target: userTable.id,
                set: { username: "original" },
            });
        mocks.createEmail.mockImplementation(({ db: database }) => ({
            updatePreference: async () => {
                await database
                    .update(userTable)
                    .set({ username: "saved" })
                    .where(eq(userTable.id, userId));
                return {
                    success: true,
                    result: {
                        operation: "set_project_preference",
                        projectSlug: "project",
                        state: "enabled",
                        globalResumed: false,
                    },
                };
            },
            getParticipationOnboardingAction: async () => undefined,
        }));
    });

    it("uses the existing writer transaction for the returned status, with no replica read", async () => {
        const selectReplica = vi.fn(() => db);
        mocks.status.mockImplementation(async ({ db: transaction }) => {
            const written = await transaction
                .select({ username: userTable.username })
                .from(userTable)
                .where(eq(userTable.id, userId));
            expect(written).toEqual([{ username: "saved" }]);
            const notCommitted = await db
                .select({ username: userTable.username })
                .from(userTable)
                .where(eq(userTable.id, userId));
            expect(notCommitted).toEqual([{ username: "original" }]);
            return { status: "ready" };
        });
        const result = await saveConversationOnboardingPreference({
            db: withReplicas(db, [db], selectReplica),
            deviceStatus,
            request,
            emailUpdateOptions,
        });
        expect(result).toMatchObject({
            success: true,
            participationStatus: { status: "ready" },
        });
        expect(mocks.status).toHaveBeenCalledOnce();
        expect(selectReplica).not.toHaveBeenCalled();
        expect(
            await db
                .select({ username: userTable.username })
                .from(userTable)
                .where(eq(userTable.id, userId)),
        ).toEqual([{ username: "saved" }]);
    });

    it("rolls the write back if the required snapshot cannot be resolved", async () => {
        mocks.status.mockRejectedValue(new Error("status unavailable"));
        await expect(
            saveConversationOnboardingPreference({
                db,
                deviceStatus,
                request,
                emailUpdateOptions,
            }),
        ).rejects.toThrow("status unavailable");
        expect(
            await db
                .select({ username: userTable.username })
                .from(userTable)
                .where(eq(userTable.id, userId)),
        ).toEqual([{ username: "original" }]);
    });
});
