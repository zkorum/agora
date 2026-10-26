import { and, eq, sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
    organizationMembershipAllProjectCapabilityTable,
    organizationMembershipTable,
    organizationTable,
    projectOrganizationOwnershipTable,
    projectTable,
    userTable,
} from "../src/shared-backend/schema.js";
import {
    getProjectCapabilitiesById,
    getProjectIdsWithCapability,
    hasProjectCapability,
} from "../src/service/projectAccess.js";
import { readDbFixtureSql } from "./dbFixture.js";

process.env.TESTCONTAINERS_RYUK_DISABLED ??= "true";

const userId = "00000000-0000-4000-8000-000000000001";

describe("conversation project capabilities", () => {
    let container: StartedTestContainer;
    let sqlClient: postgres.Sql;
    let db: PostgresJsDatabase;
    let sharedProjectId: number;
    let privateProjectId: number;
    let memberId: number;
    let memberOrganizationId: number;

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
            max: 8,
        });
        db = drizzle(sqlClient);
        await db.execute(
            sql.raw(
                readDbFixtureSql(
                    "conversation-email-update-creation-authorization.sql",
                ),
            ),
        );
    }, 120_000);

    afterAll(async () => {
        await sqlClient?.end({ timeout: 5 });
        await container?.stop();
    }, 120_000);

    beforeEach(async () => {
        await db.delete(organizationMembershipAllProjectCapabilityTable);
        await db.delete(organizationMembershipTable);
        await db.delete(projectOrganizationOwnershipTable);
        await db.delete(projectTable);
        await db.delete(organizationTable);
        await db.delete(userTable);

        await db.insert(userTable).values({ id: userId, username: "member" });
        const organizations = await db
            .insert(organizationTable)
            .values([
                {
                    slug: "member-org",
                    displayName: "Member organization",
                    defaultLanguageCode: "en",
                    directoryVisibility: "listed",
                    isFullImagePath: false,
                },
                {
                    slug: "displayed-org",
                    displayName: "Displayed organization",
                    defaultLanguageCode: "en",
                    directoryVisibility: "listed",
                    isFullImagePath: false,
                },
                {
                    slug: "private-org",
                    displayName: "Private organization",
                    defaultLanguageCode: "en",
                    directoryVisibility: "unlisted",
                    isFullImagePath: false,
                },
            ])
            .returning({ id: organizationTable.id });
        const [memberOrg, displayedOrg, privateOrg] = organizations;
        if (
            memberOrg === undefined ||
            displayedOrg === undefined ||
            privateOrg === undefined
        ) {
            throw new Error("Failed to create organizations");
        }
        memberOrganizationId = memberOrg.id;

        const projects = await db
            .insert(projectTable)
            .values([
                {
                    slug: "shared-project",
                    title: "Shared project",
                    directoryVisibility: "listed",
                },
                {
                    slug: "private-project",
                    title: "Private project",
                    directoryVisibility: "unlisted",
                },
            ])
            .returning({ id: projectTable.id });
        const [sharedProject, privateProject] = projects;
        if (sharedProject === undefined || privateProject === undefined) {
            throw new Error("Failed to create projects");
        }
        sharedProjectId = sharedProject.id;
        privateProjectId = privateProject.id;

        await db.insert(projectOrganizationOwnershipTable).values([
            { projectId: sharedProjectId, organizationId: displayedOrg.id },
            { projectId: sharedProjectId, organizationId: memberOrg.id },
            { projectId: privateProjectId, organizationId: privateOrg.id },
        ]);
        const memberships = await db
            .insert(organizationMembershipTable)
            .values([
                { userId, organizationId: memberOrg.id },
                { userId, organizationId: privateOrg.id },
            ])
            .returning({ id: organizationMembershipTable.id });
        const [member, privateMember] = memberships;
        if (member === undefined || privateMember === undefined) {
            throw new Error("Failed to create memberships");
        }
        memberId = member.id;
        await db
            .insert(organizationMembershipAllProjectCapabilityTable)
            .values([
                {
                    organizationMembershipId: member.id,
                    capability: "conversation_edit",
                },
                {
                    organizationMembershipId: member.id,
                    capability: "conversation_delete",
                },
                {
                    organizationMembershipId: privateMember.id,
                    capability: "conversation_edit",
                },
            ]);
    });

    it("grants capabilities through any owner, including an unlisted organization", async () => {
        const capabilities = await getProjectCapabilitiesById({
            db,
            userId,
            projectIds: [sharedProjectId, privateProjectId],
            requestedCapabilities: ["conversation_edit", "conversation_delete"],
        });

        expect([...(capabilities.get(sharedProjectId) ?? [])].sort()).toEqual([
            "conversation_delete",
            "conversation_edit",
        ]);
        expect([...(capabilities.get(privateProjectId) ?? [])]).toEqual([
            "conversation_edit",
        ]);
        expect(
            await hasProjectCapability({
                db,
                userId,
                projectId: sharedProjectId,
                capability: "conversation_delete",
            }),
        ).toBe(true);
        expect(
            await hasProjectCapability({
                db,
                userId,
                projectId: privateProjectId,
                capability: "conversation_delete",
            }),
        ).toBe(false);
    });

    it("ignores revoked grants and inactive memberships", async () => {
        await db
            .update(organizationMembershipAllProjectCapabilityTable)
            .set({ deletedAt: new Date(), revokedByUserId: userId })
            .where(
                eq(
                    organizationMembershipAllProjectCapabilityTable.capability,
                    "conversation_delete",
                ),
            );

        const capabilities = await getProjectCapabilitiesById({
            db,
            userId,
            projectIds: [sharedProjectId],
            requestedCapabilities: ["conversation_edit", "conversation_delete"],
        });
        expect(
            capabilities.get(sharedProjectId)?.has("conversation_edit"),
        ).toBe(true);
        expect(
            capabilities.get(sharedProjectId)?.has("conversation_delete"),
        ).toBe(false);

        await db
            .update(organizationMembershipTable)
            .set({ deletedAt: new Date() })
            .where(eq(organizationMembershipTable.id, memberId));
        expect(
            await getProjectCapabilitiesById({
                db,
                userId,
                projectIds: [sharedProjectId],
                requestedCapabilities: ["conversation_edit"],
            }),
        ).toEqual(new Map());
    });

    it("ignores historical capabilities instead of treating integration grants as editor access", async () => {
        await db
            .update(organizationMembershipAllProjectCapabilityTable)
            .set({ deletedAt: new Date(), revokedByUserId: userId })
            .where(
                and(
                    eq(
                        organizationMembershipAllProjectCapabilityTable.organizationMembershipId,
                        memberId,
                    ),
                    eq(
                        organizationMembershipAllProjectCapabilityTable.capability,
                        "conversation_edit",
                    ),
                ),
            );
        await db
            .insert(organizationMembershipAllProjectCapabilityTable)
            .values([
                {
                    organizationMembershipId: memberId,
                    capability: "conversation_manage_integrations",
                },
                {
                    organizationMembershipId: memberId,
                    capability: "conversation_view_private_results",
                },
                {
                    organizationMembershipId: memberId,
                    capability: "conversation_export_owner_data",
                },
            ]);
        const capabilities = await getProjectCapabilitiesById({
            db,
            userId,
            projectIds: [sharedProjectId],
            requestedCapabilities: ["conversation_edit", "conversation_delete"],
        });
        expect([...(capabilities.get(sharedProjectId) ?? [])]).toEqual([
            "conversation_delete",
        ]);
        expect(
            await getProjectIdsWithCapability({
                db,
                userId,
                capability: "conversation_edit",
            }),
        ).toEqual([privateProjectId]);
    });

    it("lists each authorized project once even when multiple owners grant access", async () => {
        const [owner] = await db
            .select({
                organizationId:
                    projectOrganizationOwnershipTable.organizationId,
            })
            .from(projectOrganizationOwnershipTable)
            .where(
                eq(
                    projectOrganizationOwnershipTable.projectId,
                    privateProjectId,
                ),
            );
        if (owner === undefined)
            throw new Error("Missing project owner fixture");
        await db.insert(projectOrganizationOwnershipTable).values({
            projectId: sharedProjectId,
            organizationId: owner.organizationId,
        });
        expect(
            (
                await getProjectIdsWithCapability({
                    db,
                    userId,
                    capability: "conversation_edit",
                })
            ).sort((left, right) => left - right),
        ).toEqual(
            [sharedProjectId, privateProjectId].sort(
                (left, right) => left - right,
            ),
        );
    });

    it("does not grant access after an organization stops owning the project", async () => {
        await db
            .update(projectOrganizationOwnershipTable)
            .set({ deletedAt: new Date() })
            .where(
                and(
                    eq(
                        projectOrganizationOwnershipTable.projectId,
                        sharedProjectId,
                    ),
                    eq(
                        projectOrganizationOwnershipTable.organizationId,
                        memberOrganizationId,
                    ),
                ),
            );

        expect(
            await getProjectCapabilitiesById({
                db,
                userId,
                projectIds: [sharedProjectId],
                requestedCapabilities: ["conversation_delete"],
            }),
        ).toEqual(new Map());
        expect(
            await hasProjectCapability({
                db,
                userId,
                projectId: sharedProjectId,
                capability: "conversation_delete",
            }),
        ).toBe(false);
    });
});
