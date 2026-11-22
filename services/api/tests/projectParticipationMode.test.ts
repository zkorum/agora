import { eq, sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
    conversationTable,
    polisConversationConfigTable,
    projectTable,
} from "../src/shared-backend/schema.js";
import {
    getEffectiveConversationParticipationMode,
    getEffectiveConversationParticipationModeWithProjectLookup,
} from "../src/service/conversationParticipationMode.js";
import { readDbFixtureSql } from "./dbFixture.js";

process.env.TESTCONTAINERS_RYUK_DISABLED ??= "true";

describe("persisted project participation inheritance", () => {
    let container: StartedTestContainer | undefined;
    let client: postgres.Sql | undefined;
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
        db = drizzle({ client });
        await db.execute(
            sql.raw(readDbFixtureSql("conversation-project-edit.sql")),
        );
    }, 120_000);

    afterAll(async () => {
        await client?.end({ timeout: 5 });
        await container?.stop();
    }, 120_000);

    it("defaults projects to guest and leaves configured modes unchanged when omitted from an edit", async () => {
        const projects = await db
            .insert(projectTable)
            .values({
                slug: "defaults",
                title: "Default project",
                directoryVisibility: "listed",
            })
            .returning({
                id: projectTable.id,
                mode: projectTable.participationMode,
            });
        const project = projects.at(0);
        if (project === undefined) throw new Error("Expected a test project");
        expect(project.mode).toBe("guest");
        await db
            .update(projectTable)
            .set({
                participationMode: "strong_verification",
            })
            .where(eq(projectTable.id, project.id));
        expect(
            await db
                .update(projectTable)
                .set({
                    title: "Legacy edit",
                    participationMode: undefined,
                })
                .where(eq(projectTable.id, project.id))
                .returning({
                    mode: projectTable.participationMode,
                }),
        ).toEqual([{ mode: "strong_verification" }]);
    });

    it("preserves legacy modes and resolves inherited project changes and moves", async () => {
        const projects = await db
            .insert(projectTable)
            .values([
                {
                    slug: "first",
                    title: "First project",
                    directoryVisibility: "listed",
                    participationMode: "email_verification",
                },
                {
                    slug: "second",
                    title: "Second project",
                    directoryVisibility: "listed",
                    participationMode: "strong_verification",
                },
            ])
            .returning({ id: projectTable.id });
        const first = projects.at(0);
        const second = projects.at(1);
        if (first === undefined || second === undefined)
            throw new Error("Expected two test projects");
        const configs = await db
            .insert(polisConversationConfigTable)
            .values([{}, {}, {}])
            .returning({ id: polisConversationConfigTable.id });
        const legacyConfig = configs.at(0);
        const inheritedConfig = configs.at(1);
        const overrideConfig = configs.at(2);
        if (
            legacyConfig === undefined ||
            inheritedConfig === undefined ||
            overrideConfig === undefined
        )
            throw new Error("Expected three test configurations");
        await db.insert(conversationTable).values([
            {
                slugId: "legacy",
                projectId: first.id,
                polisConfigId: legacyConfig.id,
                participationMode: "guest",
            },
            {
                slugId: "inherit",
                projectId: first.id,
                polisConfigId: inheritedConfig.id,
                participationMode: "email_verification",
                participationModeSettingsSource: "project_inherited",
            },
            {
                slugId: "override",
                projectId: first.id,
                polisConfigId: overrideConfig.id,
                participationMode: "account_required",
            },
        ]);
        const read = async () =>
            await db
                .select({
                    slugId: conversationTable.slugId,
                    mode: getEffectiveConversationParticipationModeWithProjectLookup(
                        db,
                    ),
                    joinedMode: getEffectiveConversationParticipationMode(
                        projectTable.participationMode,
                    ),
                })
                .from(conversationTable)
                .innerJoin(
                    projectTable,
                    eq(projectTable.id, conversationTable.projectId),
                )
                .orderBy(conversationTable.slugId);
        expect(await read()).toEqual([
            {
                slugId: "inherit",
                mode: "email_verification",
                joinedMode: "email_verification",
            },
            { slugId: "legacy", mode: "guest", joinedMode: "guest" },
            {
                slugId: "override",
                mode: "account_required",
                joinedMode: "account_required",
            },
        ]);
        await db
            .update(projectTable)
            .set({
                participationMode: "strong_verification",
            })
            .where(eq(projectTable.id, first.id));
        expect(await read()).toEqual([
            {
                slugId: "inherit",
                mode: "strong_verification",
                joinedMode: "strong_verification",
            },
            { slugId: "legacy", mode: "guest", joinedMode: "guest" },
            {
                slugId: "override",
                mode: "account_required",
                joinedMode: "account_required",
            },
        ]);
        await db
            .update(projectTable)
            .set({
                participationMode: "guest",
            })
            .where(eq(projectTable.id, second.id));
        const moved = await db
            .update(conversationTable)
            .set({
                projectId: second.id,
            })
            .where(eq(conversationTable.slugId, "inherit"))
            .returning({
                mode: getEffectiveConversationParticipationModeWithProjectLookup(
                    db,
                ),
            });
        expect(moved).toEqual([{ mode: "guest" }]);
        const stored = await db
            .select({
                mode: conversationTable.participationMode,
                source: conversationTable.participationModeSettingsSource,
            })
            .from(conversationTable)
            .where(eq(conversationTable.slugId, "inherit"));
        expect(stored).toEqual([
            {
                mode: "email_verification",
                source: "project_inherited",
            },
        ]);
    });
});
