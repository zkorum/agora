import { eq } from "drizzle-orm";
import { withReplicas } from "drizzle-orm/pg-core";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { isConversationIndexable } from "../src/service/conversationIndexing.js";
import { getReplicaDatabase } from "../src/shared-backend/db.js";
import {
    conversationContentTable,
    conversationTable,
    projectTable,
} from "../src/shared-backend/schema.js";
import { readDbFixtureSql } from "./dbFixture.js";

process.env.TESTCONTAINERS_RYUK_DISABLED ??= "true";

async function createConversations(db: PostgresJsDatabase): Promise<void> {
    await db.insert(projectTable).values({
        slug: "indexing-project",
        title: "Indexing project",
        directoryVisibility: "listed",
    });
    const conversations = await db
        .insert(conversationTable)
        .values([
            { slugId: "listed", projectId: 1, polisConfigId: 1 },
            {
                slugId: "unlisted",
                projectId: 1,
                polisConfigId: 2,
                isIndexed: false,
            },
            { slugId: "deleted", projectId: 1, polisConfigId: 3 },
            {
                slugId: "import",
                projectId: 1,
                polisConfigId: 4,
                isImporting: true,
            },
        ])
        .returning({
            id: conversationTable.id,
            slugId: conversationTable.slugId,
        });
    const contents = await db
        .insert(conversationContentTable)
        .values(
            conversations
                .filter((conversation) => conversation.slugId !== "deleted")
                .map((conversation) => ({
                    conversationId: conversation.id,
                    title: conversation.slugId,
                })),
        )
        .returning({
            id: conversationContentTable.id,
            conversationId: conversationContentTable.conversationId,
        });
    for (const content of contents) {
        await db
            .update(conversationTable)
            .set({ currentContentId: content.id })
            .where(eq(conversationTable.id, content.conversationId));
    }
}

describe("conversation indexing database policy", () => {
    let container: StartedTestContainer;
    let client: postgres.Sql;
    let db: PostgresJsDatabase;
    let replicaClient: postgres.Sql;
    let replicaDb: PostgresJsDatabase;

    beforeAll(async () => {
        container = await new GenericContainer("postgres:16-alpine")
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
        await client.unsafe(readDbFixtureSql("feed-pagination.sql"));
        await createConversations(db);
        // Independent databases let the replica retain the old visibility without
        // requiring a replication cluster for this routing regression test.
        await client.unsafe('CREATE DATABASE "agora_replica"');
        replicaClient = postgres({
            host: container.getHost(),
            port: container.getMappedPort(5432),
            database: "agora_replica",
            username: "postgres",
            password: "postgres",
        });
        replicaDb = drizzle({ client: replicaClient });
        await replicaClient.unsafe(readDbFixtureSql("feed-pagination.sql"));
        await createConversations(replicaDb);
    }, 120_000);

    afterAll(async () => {
        await replicaClient?.end({ timeout: 5 });
        await client?.end({ timeout: 5 });
        await container?.stop();
    }, 120_000);

    it.each(["unlisted", "deleted", "import", "missing"])(
        "excludes %s conversations",
        async (conversationSlugId) => {
            expect(
                await isConversationIndexable({ db, conversationSlugId }),
            ).toBe(false);
        },
    );

    it("unlists and relists via the writer without overriding conversation intent", async () => {
        const replicatedDb = withReplicas(db, [replicaDb]);
        expect(
            await isConversationIndexable({
                db: replicatedDb,
                conversationSlugId: "listed",
            }),
        ).toBe(true);
        await db
            .update(projectTable)
            .set({ directoryVisibility: "unlisted" })
            .where(eq(projectTable.id, 1));
        const staleProjects = await getReplicaDatabase(replicatedDb)
            .select({ directoryVisibility: projectTable.directoryVisibility })
            .from(projectTable)
            .where(eq(projectTable.id, 1));
        expect(staleProjects).toEqual([{ directoryVisibility: "listed" }]);
        expect(
            await isConversationIndexable({
                db: replicatedDb,
                conversationSlugId: "listed",
            }),
        ).toBe(false);
        await db
            .update(projectTable)
            .set({ directoryVisibility: "listed" })
            .where(eq(projectTable.id, 1));
        await expect(
            isConversationIndexable({ db, conversationSlugId: "listed" }),
        ).resolves.toBe(true);
        await expect(
            isConversationIndexable({ db, conversationSlugId: "unlisted" }),
        ).resolves.toBe(false);
    });
});
