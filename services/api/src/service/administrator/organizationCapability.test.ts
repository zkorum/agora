import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
    getOrganizationMembers,
    updateOrganizationMemberConversationEmailUpdateCapability,
} from "./organization.js";

describe("organization Email Updates capability administration", () => {
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
                "id" integer PRIMARY KEY,
                "user_id" uuid NOT NULL,
                "organization_id" integer NOT NULL,
                "deleted_at" timestamp
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
            INSERT INTO "user" ("id", "username")
            VALUES ('00000000-0000-4000-8000-000000000001', 'author');
            INSERT INTO "organization" ("id", "slug", "directory_visibility")
            VALUES (1, 'test-org', 'listed');
            INSERT INTO "organization_membership" (
                "id",
                "user_id",
                "organization_id"
            ) VALUES (1, '00000000-0000-4000-8000-000000000001', 1);
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

    it("records capability grant and revocation history", async () => {
        const client = sqlClient;
        if (client === undefined) {
            throw new Error("Test database client was not initialized");
        }
        await expect(
            getOrganizationMembers({
                db,
                organizationName: "test-org",
            }),
        ).resolves.toEqual({
            memberList: [
                {
                    username: "author",
                    conversationEmailUpdateCapabilityEnabled: false,
                },
            ],
        });

        await updateOrganizationMemberConversationEmailUpdateCapability({
            db,
            adminUserId: "00000000-0000-4000-8000-000000000001",
            request: {
                username: "author",
                organizationSlug: "test-org",
                enabled: true,
            },
        });
        await expect(
            getOrganizationMembers({
                db,
                organizationName: "test-org",
            }),
        ).resolves.toEqual({
            memberList: [
                {
                    username: "author",
                    conversationEmailUpdateCapabilityEnabled: true,
                },
            ],
        });

        await updateOrganizationMemberConversationEmailUpdateCapability({
            db,
            adminUserId: "00000000-0000-4000-8000-000000000001",
            request: {
                username: "author",
                organizationSlug: "test-org",
                enabled: false,
            },
        });
        await expect(
            getOrganizationMembers({
                db,
                organizationName: "test-org",
            }),
        ).resolves.toEqual({
            memberList: [
                {
                    username: "author",
                    conversationEmailUpdateCapabilityEnabled: false,
                },
            ],
        });

        const revokedGrants = await client`
            SELECT
                granted_by_user_id,
                revoked_by_user_id,
                deleted_at
            FROM organization_membership_all_project_capability
        `;
        expect(revokedGrants).toHaveLength(1);
        expect(revokedGrants[0]).toMatchObject({
            granted_by_user_id: "00000000-0000-4000-8000-000000000001",
            revoked_by_user_id: "00000000-0000-4000-8000-000000000001",
        });
        expect(revokedGrants[0].deleted_at).not.toBeNull();

        await updateOrganizationMemberConversationEmailUpdateCapability({
            db,
            adminUserId: "00000000-0000-4000-8000-000000000001",
            request: {
                username: "author",
                organizationSlug: "test-org",
                enabled: true,
            },
        });
        const grantHistory = await client`
            SELECT deleted_at
            FROM organization_membership_all_project_capability
            ORDER BY id
        `;
        expect(grantHistory).toHaveLength(2);
        expect(grantHistory[0].deleted_at).not.toBeNull();
        expect(grantHistory[1].deleted_at).toBeNull();
    });

    it("rejects users who are not active organization members", async () => {
        await expect(
            updateOrganizationMemberConversationEmailUpdateCapability({
                db,
                adminUserId: "00000000-0000-4000-8000-000000000001",
                request: {
                    username: "missing",
                    organizationSlug: "test-org",
                    enabled: true,
                },
            }),
        ).rejects.toMatchObject({ statusCode: 404 });
    });
});
