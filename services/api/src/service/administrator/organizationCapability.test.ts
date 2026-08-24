import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { canConfigureConversationEmailUpdatesForOrganization } from "../projectAccess.js";
import {
    addUserOrganizationMapping,
    getOrganizationMembers,
} from "./organization.js";

describe("organization membership baseline capabilities", () => {
    let container: StartedTestContainer | undefined;
    let sqlClient: postgres.Sql | undefined;
    let db: PostgresJsDatabase;

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
        });
        db = drizzle(sqlClient);
        await sqlClient.unsafe(`
            CREATE TABLE "user" (
                "id" uuid PRIMARY KEY,
                "username" varchar(50) NOT NULL,
                "is_deleted" boolean NOT NULL DEFAULT false
            );
            CREATE TABLE "organization" (
                "id" integer PRIMARY KEY,
                "slug" varchar(100) NOT NULL,
                "directory_visibility" text NOT NULL,
                "deleted_at" timestamp
            );
            CREATE TABLE "organization_membership" (
                "id" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                "user_id" uuid NOT NULL,
                "organization_id" integer NOT NULL,
                "created_at" timestamp NOT NULL DEFAULT now(),
                "updated_at" timestamp NOT NULL DEFAULT now(),
                "deleted_at" timestamp
            );
            CREATE UNIQUE INDEX "organization_membership_active_unique"
                ON "organization_membership" ("user_id", "organization_id")
                WHERE "deleted_at" IS NULL;
            CREATE TABLE "organization_membership_capability" (
                "id" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                "organization_membership_id" integer NOT NULL,
                "capability" text NOT NULL,
                "created_at" timestamp NOT NULL DEFAULT now()
            );
            CREATE UNIQUE INDEX "organization_membership_capability_unique"
                ON "organization_membership_capability" (
                    "organization_membership_id",
                    "capability"
                );
            CREATE TABLE "organization_membership_all_project_capability" (
                "id" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                "organization_membership_id" integer NOT NULL,
                "capability" text NOT NULL,
                "granted_by_user_id" uuid,
                "revoked_by_user_id" uuid,
                "created_at" timestamp NOT NULL DEFAULT now(),
                "updated_at" timestamp NOT NULL DEFAULT now(),
                "deleted_at" timestamp
            );
            CREATE UNIQUE INDEX "organization_membership_all_project_capability_active_unique"
                ON "organization_membership_all_project_capability" (
                    "organization_membership_id",
                    "capability"
                ) WHERE "deleted_at" IS NULL;
            CREATE TABLE "premium_feature_entitlement" (
                "id" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                "organization_id" integer NOT NULL,
                "feature" text NOT NULL,
                "starts_at" timestamp NOT NULL,
                "expires_at" timestamp,
                "revoked_at" timestamp
            );
            INSERT INTO "user" ("id", "username")
            VALUES ('00000000-0000-4000-8000-000000000001', 'author');
            INSERT INTO "organization" ("id", "slug", "directory_visibility")
            VALUES (1, 'test-org', 'listed');
        `);
    }, 60_000);

    afterAll(async () => {
        if (sqlClient !== undefined) {
            await sqlClient.end();
        }
        if (container !== undefined) {
            await container.stop();
        }
    });

    it("grants Email Updates when adding an organization member", async () => {
        const client = sqlClient;
        if (client === undefined) {
            throw new Error("Test database client was not initialized");
        }

        await Promise.all([
            addUserOrganizationMapping({
                db,
                username: "author",
                organizationName: "test-org",
            }),
            addUserOrganizationMapping({
                db,
                username: "author",
                organizationName: "test-org",
            }),
        ]);

        const emailUpdateCapabilities = await client`
            SELECT "capability"
            FROM "organization_membership_all_project_capability"
            WHERE "capability" = 'conversation_email_update'
                AND "deleted_at" IS NULL
        `;
        expect(emailUpdateCapabilities).toHaveLength(1);
        const now = new Date("2026-08-24T12:00:00.000Z");
        await expect(
            canConfigureConversationEmailUpdatesForOrganization({
                db,
                userId: "00000000-0000-4000-8000-000000000001",
                organizationId: 1,
                now,
            }),
        ).resolves.toBe(false);

        await client`
            INSERT INTO "premium_feature_entitlement" (
                "organization_id",
                "feature",
                "starts_at"
            ) VALUES (1, 'conversation_email_update', '2026-08-01T00:00:00.000Z')
        `;
        await expect(
            canConfigureConversationEmailUpdatesForOrganization({
                db,
                userId: "00000000-0000-4000-8000-000000000001",
                organizationId: 1,
                now,
            }),
        ).resolves.toBe(true);
        await expect(
            getOrganizationMembers({
                db,
                organizationName: "test-org",
            }),
        ).resolves.toEqual({ memberList: [{ username: "author" }] });
    });
});
