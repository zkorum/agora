import { eq, sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
    organizationTable,
    projectContentTable,
    projectOrganizationOwnershipTable,
    projectTable,
} from "../src/shared-backend/schema.js";
import { getOrCreateDefaultProjectForOrganization } from "../src/service/projectAccess.js";
import { readDbFixtureSql } from "./dbFixture.js";

process.env.TESTCONTAINERS_RYUK_DISABLED ??= "true";

const NOW = new Date("2026-08-26T12:00:00.000Z");

describe("default project provisioning", () => {
    let container: StartedTestContainer;
    let sqlClient: postgres.Sql;
    let db: PostgresJsDatabase;
    let organizationId: number;

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
        db = drizzle({ client: sqlClient });
        await db.execute(
            sql.raw(readDbFixtureSql("default-project-provisioning.sql")),
        );
    }, 120_000);

    afterAll(async () => {
        await sqlClient?.end({ timeout: 5 });
        await container?.stop();
    }, 120_000);

    beforeEach(async () => {
        await db.delete(projectOrganizationOwnershipTable);
        await db.update(projectTable).set({ currentContentId: null });
        await db.delete(projectContentTable);
        await db.delete(projectTable);
        await db.delete(organizationTable);
        const organizations = await db
            .insert(organizationTable)
            .values({
                slug: "test-organization",
                displayName: "Test Organization",
                defaultLanguageCode: "en",
                directoryVisibility: "listed",
                isFullImagePath: false,
            })
            .returning({ id: organizationTable.id });
        const organization = organizations.at(0);
        if (organization === undefined) {
            throw new Error("Failed to seed organization");
        }
        organizationId = organization.id;
    });

    it("creates one complete project when called concurrently", async () => {
        const results = await Promise.all(
            Array.from({ length: 4 }, async () => {
                return await getOrCreateDefaultProjectForOrganization({
                    db,
                    organizationId,
                });
            }),
        );

        expect(new Set(results.map(({ projectId }) => projectId)).size).toBe(1);
        await expect(db.select().from(projectTable)).resolves.toHaveLength(1);
        await expect(
            db.select().from(projectContentTable),
        ).resolves.toHaveLength(1);
        await expect(
            db.select().from(projectOrganizationOwnershipTable),
        ).resolves.toHaveLength(1);
    });

    it("works inside an existing transaction", async () => {
        const result = await db.transaction(async (tx) => {
            return await getOrCreateDefaultProjectForOrganization({
                db: tx,
                organizationId,
            });
        });

        expect(result.projectId).toEqual(expect.any(Number));
        const projects = await db.select().from(projectTable);
        expect(projects.at(0)?.currentContentId).toEqual(expect.any(Number));
    });

    it("creates a new shell and preserves the deleted historical container", async () => {
        const projects = await db
            .insert(projectTable)
            .values({
                slug: `org-${String(organizationId)}-default`,
                title: "Test Organization",
                directoryVisibility: "unlisted",
                autoProvisionedForOrganizationId: organizationId,
                deletedAt: NOW,
            })
            .returning({
                id: projectTable.id,
                slug: projectTable.slug,
                title: projectTable.title,
            });
        const project = projects.at(0);
        if (project === undefined) {
            throw new Error("Failed to seed deleted project");
        }
        await db.insert(projectOrganizationOwnershipTable).values({
            projectId: project.id,
            organizationId,
            deletedAt: NOW,
        });

        const result = await getOrCreateDefaultProjectForOrganization({
            db,
            organizationId,
        });

        expect(result.projectId).not.toBe(project.id);
        expect(result.projectSlug).toBe(project.slug);
        const historicalProjects = await db
            .select()
            .from(projectTable)
            .where(eq(projectTable.id, project.id));
        expect(historicalProjects.at(0)?.deletedAt).toEqual(NOW);
        expect(historicalProjects.at(0)?.currentContentId).toBeNull();
        expect(historicalProjects.at(0)?.autoProvisionedForOrganizationId).toBe(
            organizationId,
        );
        const ownerships = await db
            .select()
            .from(projectOrganizationOwnershipTable);
        expect(ownerships).toHaveLength(2);
        expect(
            ownerships.filter((ownership) => ownership.deletedAt === null),
        ).toHaveLength(1);
    });

    it("does not reattach an explicitly removed ownership relationship", async () => {
        const project = await getOrCreateDefaultProjectForOrganization({
            db,
            organizationId,
        });
        await db
            .update(projectOrganizationOwnershipTable)
            .set({ deletedAt: NOW });
        await expect(
            getOrCreateDefaultProjectForOrganization({ db, organizationId }),
        ).rejects.toThrow("Default project ownership is unavailable");
        const ownerships = await db
            .select()
            .from(projectOrganizationOwnershipTable)
            .where(
                eq(
                    projectOrganizationOwnershipTable.projectId,
                    project.projectId,
                ),
            );
        expect(ownerships).toHaveLength(1);
        expect(ownerships.at(0)?.deletedAt).toEqual(NOW);
    });

    it("does not provision for a deleted organization", async () => {
        await db.update(organizationTable).set({ deletedAt: NOW });
        await expect(
            getOrCreateDefaultProjectForOrganization({ db, organizationId }),
        ).rejects.toThrow("Organization not found");
        await expect(db.select().from(projectTable)).resolves.toHaveLength(0);
    });

    it("does not infer ownership from provenance when an existing shell has no ownership history", async () => {
        const [project] = await db
            .insert(projectTable)
            .values({
                slug: "unowned-default",
                title: "Unowned",
                directoryVisibility: "unlisted",
                autoProvisionedForOrganizationId: organizationId,
            })
            .returning();
        if (project === undefined) throw new Error("Missing default fixture");
        await expect(
            getOrCreateDefaultProjectForOrganization({ db, organizationId }),
        ).rejects.toThrow("Default project ownership is unavailable");
        await expect(
            db.select().from(projectOrganizationOwnershipTable),
        ).resolves.toHaveLength(0);
        await expect(
            db.select().from(projectContentTable),
        ).resolves.toHaveLength(0);
    });

    it("participates in an outer transaction rollback", async () => {
        await expect(
            db.transaction(async (tx) => {
                await getOrCreateDefaultProjectForOrganization({
                    db: tx,
                    organizationId,
                });
                throw new Error("Roll back provisioning");
            }),
        ).rejects.toThrow("Roll back provisioning");

        await expect(db.select().from(projectTable)).resolves.toHaveLength(0);
        await expect(
            db.select().from(projectContentTable),
        ).resolves.toHaveLength(0);
    });
});
