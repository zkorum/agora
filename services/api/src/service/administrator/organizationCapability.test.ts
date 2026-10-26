import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
    canConfigureConversationEmailUpdatesForOrganization,
    getProjectCapabilitiesById,
    hasProjectCapability,
} from "../projectAccess.js";
import type { AllProjectCapability } from "../projectAccessLogic.js";
import {
    addUserOrganizationMapping,
    getAllOrganizations,
    getOrganizationDetails,
    getOrganizationMembers,
    getOrganizationMembershipsByUserId,
    getOrganizationOptions,
    removeUserOrganizationMapping,
} from "./organization.js";
import {
    getAdminNoProjectEmailUpdates,
    updateAdminNoProjectEmailUpdates,
} from "./organizationEmailUpdates.js";

describe("admin organization management and membership capabilities", () => {
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
                "display_name" varchar(100) NOT NULL DEFAULT 'Zulu',
                "default_language_code" text NOT NULL DEFAULT 'en',
                "directory_visibility" text NOT NULL,
                "auto_provisioned_for_user_id" uuid,
                "description" text,
                "image_path" text,
                "is_full_image_path" boolean NOT NULL DEFAULT false,
                "website_url" text,
                "deleted_at" timestamp
            );
            CREATE TABLE "organization_localization" (
                "organization_id" integer NOT NULL,
                "language_code" text NOT NULL,
                "display_name" text NOT NULL,
                "description" text NOT NULL,
                "website_url" text,
                "image_path" text,
                "is_full_image_path" boolean NOT NULL DEFAULT false
            );
            CREATE TABLE "project_organization_ownership" (
                "project_id" integer NOT NULL,
                "organization_id" integer NOT NULL,
                "deleted_at" timestamp
            );
            CREATE TABLE "project" (
                "id" integer PRIMARY KEY,
                "auto_provisioned_for_organization_id" integer,
                "conversation_email_update_default_enabled" boolean NOT NULL DEFAULT false,
                "deleted_at" timestamp
            );
            CREATE TABLE "project_contact" (
                "id" integer PRIMARY KEY,
                "project_id" integer NOT NULL,
                "first_name" text NOT NULL,
                "email" text,
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
            VALUES
                ('00000000-0000-4000-8000-000000000001', 'author'),
                ('00000000-0000-4000-8000-000000000002', 'organizer'),
                ('00000000-0000-4000-8000-000000000003', 'promoted-owner');
            INSERT INTO "organization" ("id", "slug", "directory_visibility")
            VALUES (1, 'test-org', 'listed');
            INSERT INTO "organization" (
                "id", "slug", "display_name", "directory_visibility",
                "auto_provisioned_for_user_id", "deleted_at"
            ) VALUES
                (2, 'user-personal', 'Aaron', 'unlisted',
                    '00000000-0000-4000-8000-000000000001', NULL),
                (3, 'archived-org', 'Aardvark', 'listed', NULL, now()),
                (4, 'other-org', 'Beta', 'listed', NULL, NULL),
                (5, 'user-other-personal', 'Zoe', 'unlisted',
                    '00000000-0000-4000-8000-000000000002', NULL),
                (6, 'archived-personal', 'Abby', 'unlisted', NULL, now()),
                (7, 'promoted-org', 'Alpha', 'listed',
                    '00000000-0000-4000-8000-000000000003', NULL);
            INSERT INTO "organization_localization" (
                "organization_id", "language_code", "display_name", "description"
            ) VALUES (2, 'en', 'Aaron', 'Personal organization');
            INSERT INTO "project_organization_ownership" (
                "project_id", "organization_id"
            ) VALUES (1, 1), (2, 2), (4, 4), (5, 5);
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

    it("lists personal organizations last without listing archived organizations", async () => {
        const options = await getOrganizationOptions({ db });
        const allOrganizations = await getAllOrganizations({
            db,
            baseImageServiceUrl: "https://images.example.com",
        });
        const expectedSlugs = [
            "promoted-org",
            "other-org",
            "test-org",
            "user-personal",
            "user-other-personal",
        ];
        expect(
            options.organizationList.map((organization) => organization.slug),
        ).toEqual(expectedSlugs);
        expect(
            allOrganizations.organizationList.map(
                (organization) => organization.slug,
            ),
        ).toEqual(expectedSlugs);
    });

    it("loads personal organization details and localizations", async () => {
        const details = await getOrganizationDetails({
            db,
            baseImageServiceUrl: "https://images.example.com",
            organizationSlug: "user-personal",
        });
        expect(details.organization).toMatchObject({
            name: "Aaron",
            slug: "user-personal",
            defaultLanguageCode: "en",
            localizations: [
                {
                    languageCode: "en",
                    displayName: "Aaron",
                    description: "Personal organization",
                },
            ],
        });
    });

    it("loads the Email Updates panel for personal organizations", async () => {
        await expect(
            getAdminNoProjectEmailUpdates({
                db,
                organizationSlug: "user-personal",
                now: new Date(),
            }),
        ).resolves.toEqual({
            success: true,
            configuration: {
                hasEntitlement: false,
                defaultEnabled: false,
                contact: undefined,
                canDeleteContact: true,
            },
        });
        await expect(
            getAdminNoProjectEmailUpdates({
                db,
                organizationSlug: "archived-personal",
                now: new Date(),
            }),
        ).resolves.toEqual({
            success: false,
            reason: "organization_not_found",
        });
    });

    it("still requires an entitlement to update personal organization Email Updates", async () => {
        await expect(
            updateAdminNoProjectEmailUpdates({
                db,
                userId: "00000000-0000-4000-8000-000000000002",
                request: {
                    organizationSlug: "user-personal",
                    defaultEnabled: false,
                },
                now: new Date(),
            }),
        ).resolves.toEqual({ success: false, reason: "entitlement_required" });
    });

    it("grants and revokes full personal conversation access through explicit membership", async () => {
        const userId = "00000000-0000-4000-8000-000000000002";
        const requestedCapabilities = [
            "conversation_edit",
            "conversation_delete",
            "conversation_email_update",
        ] satisfies [AllProjectCapability, ...AllProjectCapability[]];
        async function getPersonalConversationCapabilities(): Promise<
            ReadonlySet<AllProjectCapability> | undefined
        > {
            const capabilities = await getProjectCapabilitiesById({
                db,
                userId,
                projectIds: [2],
                requestedCapabilities,
            });
            return capabilities.get(2);
        }

        await expect(
            getPersonalConversationCapabilities(),
        ).resolves.toBeUndefined();
        await addUserOrganizationMapping({
            db,
            username: "organizer",
            organizationName: "user-personal",
        });
        await expect(getPersonalConversationCapabilities()).resolves.toEqual(
            new Set(requestedCapabilities),
        );
        await expect(
            getOrganizationMembers({
                db,
                organizationName: "user-personal",
            }),
        ).resolves.toEqual({ memberList: [{ username: "organizer" }] });
        await expect(
            hasProjectCapability({
                db,
                userId,
                projectId: 5,
                capability: "conversation_edit",
            }),
        ).resolves.toBe(false);
        await expect(
            getOrganizationMembershipsByUserId({
                db,
                userId,
                baseImageServiceUrl: "https://images.example.com",
            }),
        ).resolves.toEqual([]);

        await removeUserOrganizationMapping({
            db,
            adminUserId: userId,
            username: "organizer",
            organizationName: "user-personal",
        });
        await expect(
            getPersonalConversationCapabilities(),
        ).resolves.toBeUndefined();
        await expect(
            getOrganizationMembers({
                db,
                organizationName: "user-personal",
            }),
        ).resolves.toEqual({ memberList: [] });

        await addUserOrganizationMapping({
            db,
            username: "organizer",
            organizationName: "user-personal",
        });
        await expect(getPersonalConversationCapabilities()).resolves.toEqual(
            new Set(requestedCapabilities),
        );
    });

    it("does not allow adding members to archived organizations", async () => {
        for (const organizationName of ["archived-org", "archived-personal"]) {
            await expect(
                addUserOrganizationMapping({
                    db,
                    username: "organizer",
                    organizationName,
                }),
            ).rejects.toMatchObject({ statusCode: 404 });
            await expect(
                getOrganizationDetails({
                    db,
                    baseImageServiceUrl: "https://images.example.com",
                    organizationSlug: organizationName,
                }),
            ).resolves.toEqual({ organization: undefined });
        }
    });
});
