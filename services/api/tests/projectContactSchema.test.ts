import { eq, sql } from "drizzle-orm";
import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import { fetchProjectPage } from "../src/service/projectPage.js";
import {
    organizationTable,
    projectContactTable,
    projectContentTable,
    projectTable,
} from "../src/shared-backend/schema.js";
import { Dto } from "../src/shared/types/dto.js";
import { readDbFixtureSql } from "./dbFixture.js";

vi.mock("../src/app.js", () => ({
    config: {},
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

function contactConstraint(name: string) {
    const constraint = getTableConfig(projectContactTable).checks.find(
        (check) => check.name === name,
    );
    if (constraint === undefined)
        throw new Error(`Missing contact constraint: ${name}`);
    return constraint.value;
}

const identity = contactConstraint("project_contact_name_or_affiliation_check");
const channel = contactConstraint("project_contact_email_or_website_check");

describe("contact constraint SQL serialization", () => {
    it.each([identity, channel])(
        "does not emit unbound parameters in DDL",
        (constraint) => {
            expect(new PgDialect().sqlToQuery(constraint).params).toEqual([]);
        },
    );
});

process.env.TESTCONTAINERS_RYUK_DISABLED ??= "true";

describe("contact constraint predicates in PostgreSQL", () => {
    let container: StartedTestContainer;
    let client: postgres.Sql;
    let db: PostgresJsDatabase;

    beforeAll(async () => {
        container = await new GenericContainer("postgres:16-alpine")
            .withEnvironment({
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
        db = drizzle(client);
        await db.execute(sql.raw(readDbFixtureSql("project-page-counts.sql")));
    }, 120_000);

    afterAll(async () => {
        await client?.end({ timeout: 5 });
        await container?.stop();
    }, 120_000);

    beforeEach(async () => {
        await db.execute(sql`TRUNCATE project_contact RESTART IDENTITY`);
    });

    it.each(["", " \t\n\r ", "\u00a0\u2003\ufeff"])(
        "rejects whitespace-only identity and contact channels (%j)",
        async (blank) => {
            await expect(
                db.insert(projectContactTable).values({
                    projectId: 1,
                    firstName: blank,
                    lastName: blank,
                    email: "contact@example.com",
                }),
            ).rejects.toMatchObject({
                cause: {
                    code: "23514",
                    constraint_name:
                        "project_contact_name_or_affiliation_check",
                },
            });
            await expect(
                db.insert(projectContactTable).values({
                    projectId: 1,
                    firstName: "Alex",
                    email: blank,
                    websiteUrl: blank,
                }),
            ).rejects.toMatchObject({
                cause: {
                    code: "23514",
                    constraint_name: "project_contact_email_or_website_check",
                },
            });
        },
    );

    it.each([
        { firstName: "Alex", lastName: undefined, organizationId: undefined },
        { firstName: "", lastName: "Martin", organizationId: undefined },
        { firstName: undefined, lastName: undefined, organizationId: 1 },
    ])("accepts a name or a selectable organization (%j)", async (contact) => {
        await db
            .insert(projectContactTable)
            .values({ projectId: 1, ...contact, email: "contact@example.com" });
        const rows = await db
            .select({
                identity: identity.mapWith(Boolean),
                channel: channel.mapWith(Boolean),
            })
            .from(projectContactTable);
        expect(rows).toEqual([{ identity: true, channel: true }]);
    });

    it("reads the organization's logo by default while preserving a contact image override", async () => {
        const [project] = await db
            .insert(projectTable)
            .values({
                slug: "contact-branding",
                title: "Contact branding",
                directoryVisibility: "listed",
            })
            .returning({ id: projectTable.id });
        const [organization] = await db
            .insert(organizationTable)
            .values({
                slug: "agrotoulouse",
                displayName: "AgroToulouse",
                defaultLanguageCode: "en",
                directoryVisibility: "listed",
                imagePath: "https://example.com/org-logo.png",
                isFullImagePath: true,
            })
            .returning({ id: organizationTable.id });
        if (project === undefined || organization === undefined)
            throw new Error("Missing project branding fixture");
        const [content] = await db
            .insert(projectContentTable)
            .values({
                projectId: project.id,
                title: "Contact branding",
                sourceLanguageCode: "en",
            })
            .returning({ id: projectContentTable.id });
        if (content === undefined)
            throw new Error("Missing project content fixture");
        await db
            .update(projectTable)
            .set({ currentContentId: content.id })
            .where(eq(projectTable.id, project.id));
        await db.insert(projectContactTable).values({
            projectId: project.id,
            firstName: "Alex",
            organizationId: organization.id,
            email: "Contact@EXAMPLE.com",
        });

        const fetchPage = async () =>
            Dto.fetchProjectPageResponse.parse(
                await fetchProjectPage({
                    db,
                    baseImageServiceUrl: "https://images.example.com",
                    currentDisplayLanguage: "en",
                    requesterUserId: undefined,
                    request: Dto.fetchProjectPageRequest.parse({
                        projectSlug: "contact-branding",
                    }),
                }),
            );
        const initial = await fetchPage();
        expect(initial.project.contact).toMatchObject({
            firstName: "Alex",
            affiliationName: "AgroToulouse",
            imageUrl: "https://example.com/org-logo.png",
            email: "Contact@EXAMPLE.com",
        });

        await db
            .update(projectContactTable)
            .set({
                imagePath: "https://example.com/contact-logo.png",
                isFullImagePath: true,
            })
            .where(eq(projectContactTable.projectId, project.id));
        const overridden = await fetchPage();
        expect(overridden.project.contact?.imageUrl).toBe(
            "https://example.com/contact-logo.png",
        );
    });
});
