import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { GenericContainer, type StartedTestContainer } from "testcontainers";

import {
    contentTranslationWorkTable,
    conversationContentTable,
    conversationContentTranslationTable,
    conversationTable,
    conversationTranslationTargetLanguageTable,
} from "../src/shared-backend/schema.js";
import { fetchConversationFeedDisplayContentBySlugId } from "../src/service/conversationFeedDisplayContent.js";
import { readDbFixtureSql } from "./dbFixture.js";

process.env.TESTCONTAINERS_RYUK_DISABLED ??= "true";

const conversationSlugId = "conv1234";

describe("conversation feed display content", () => {
    let container: StartedTestContainer;
    let sqlClient: postgres.Sql;
    let db: PostgresJsDatabase;
    let conversationId: number;
    let conversationContentId: number;

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
        await sqlClient.unsafe(readDbFixtureSql("content-translation.sql"));
    }, 120_000);

    afterAll(async () => {
        await sqlClient?.end({ timeout: 5 });
        await container?.stop();
    }, 120_000);

    beforeEach(async () => {
        await sqlClient.unsafe(`
            TRUNCATE TABLE "content_translation_work", "conversation_content_translation",
                "conversation_translation_target_language", "conversation_content", "conversation"
            RESTART IDENTITY;
        `);
        const conversations = await db
            .insert(conversationTable)
            .values({
                slugId: conversationSlugId,
                projectId: 1,
                polisConfigId: 1,
                dynamicTranslationEnabled: true,
            })
            .returning({ id: conversationTable.id });
        const conversation = conversations.at(0);
        if (conversation === undefined) {
            throw new Error("Failed to create conversation fixture");
        }
        conversationId = conversation.id;

        const contents = await db
            .insert(conversationContentTable)
            .values({
                conversationId,
                title: "Кыргызча аталыш",
                body: "<p>Кыргызча мазмун</p>",
                sourceLanguageCode: "ky",
            })
            .returning({ id: conversationContentTable.id });
        const content = contents.at(0);
        if (content === undefined) {
            throw new Error("Failed to create conversation content fixture");
        }
        conversationContentId = content.id;
        await db
            .update(conversationTable)
            .set({ currentContentId: conversationContentId });
        await db.insert(conversationTranslationTargetLanguageTable).values({
            conversationId,
            languageCode: "en",
        });
    });

    it("selects a completed translation for a viewer who does not understand the source", async () => {
        await db.insert(conversationContentTranslationTable).values({
            conversationContentId,
            displayLanguageCode: "en",
            translatedTitle: "English title",
            translatedBody: "<p>English body</p>",
            translatedBodyPlainText: "English body",
            sourceLanguageCode: "ky",
        });
        const newerContents = await db
            .insert(conversationContentTable)
            .values({
                conversationId,
                title: "Newer source title",
                sourceLanguageCode: "ky",
            })
            .returning({ id: conversationContentTable.id });
        const newerContent = newerContents.at(0);
        if (newerContent === undefined) {
            throw new Error("Failed to create newer content fixture");
        }
        await db
            .update(conversationTable)
            .set({ currentContentId: newerContent.id });

        const displayContent =
            await fetchConversationFeedDisplayContentBySlugId({
                db,
                conversationContentIds: [conversationContentId],
                displayLanguage: "en",
                spokenLanguages: ["en"],
            });

        expect(displayContent.get(conversationSlugId)).toMatchObject({
            status: "available",
            mode: "translated",
            content: {
                title: "English title",
                body: "<p>English body</p>",
            },
            translationControl: {
                status: "completed",
                alternateMode: "original",
            },
        });
    });

    it("selects original content when the viewer understands the source", async () => {
        await db.insert(conversationContentTranslationTable).values({
            conversationContentId,
            displayLanguageCode: "en",
            translatedTitle: "English title",
            sourceLanguageCode: "ky",
        });

        const displayContent =
            await fetchConversationFeedDisplayContentBySlugId({
                db,
                conversationContentIds: [conversationContentId],
                displayLanguage: "en",
                spokenLanguages: ["en", "ky"],
            });

        expect(displayContent.get(conversationSlugId)).toMatchObject({
            status: "available",
            mode: "original",
            content: { title: "Кыргызча аталыш" },
            translationControl: {
                status: "completed",
                alternateMode: "translated",
            },
        });
    });

    it("preserves pending work status when translated content is unavailable", async () => {
        await db.insert(contentTranslationWorkTable).values({
            conversationId,
            sourceKind: "conversation",
            conversationContentId,
            displayLanguageCode: "en",
            status: "pending",
        });

        const displayContent =
            await fetchConversationFeedDisplayContentBySlugId({
                db,
                conversationContentIds: [conversationContentId],
                displayLanguage: "en",
                spokenLanguages: ["en"],
            });

        expect(displayContent.get(conversationSlugId)).toMatchObject({
            status: "available",
            mode: "original",
            translationControl: {
                status: "pending",
                alternateMode: "translated",
            },
        });
    });

    it("ignores a translation generated for stale source-language metadata", async () => {
        await db.insert(conversationContentTranslationTable).values({
            conversationContentId,
            displayLanguageCode: "en",
            translatedTitle: "Stale translation",
            sourceLanguageCode: "ru",
        });

        const displayContent =
            await fetchConversationFeedDisplayContentBySlugId({
                db,
                conversationContentIds: [conversationContentId],
                displayLanguage: "en",
                spokenLanguages: ["en"],
            });

        expect(displayContent.get(conversationSlugId)).toMatchObject({
            status: "available",
            mode: "original",
            content: { title: "Кыргызча аталыш" },
            translationControl: {
                status: "not_requested",
                alternateMode: "translated",
            },
        });
    });

    it("omits display content when the target language is not configured", async () => {
        const displayContent =
            await fetchConversationFeedDisplayContentBySlugId({
                db,
                conversationContentIds: [conversationContentId],
                displayLanguage: "fr",
                spokenLanguages: ["fr"],
            });

        expect(displayContent.size).toBe(0);
    });
});
