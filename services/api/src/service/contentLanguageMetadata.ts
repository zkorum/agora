import { log } from "@/app.js";
import type { GoogleCloudCredentials } from "@/shared-backend/googleCloudAuth.js";
import {
    conversationContentTable,
    conversationTable,
    opinionContentTable,
    opinionTable,
    surveyQuestionContentTable,
    surveyQuestionOptionContentTable,
    surveyQuestionOptionTable,
    surveyQuestionTable,
} from "@/shared-backend/schema.js";
import { detectLanguage } from "@/shared-backend/translate.js";
import { htmlToCountedText } from "@/shared/shared.js";
import { and, eq, isNotNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    type LanguageDetectionProvider,
    detectLanguageWithFallback,
    type LanguageDetectionHintInput,
} from "./languageDetection.js";
import {
    buildConversationLanguageDetectionCorpus,
    buildGoogleConversationLanguageDetectionCorpus,
} from "./conversationLanguage.js";
import type { SupportedSpokenLanguageCodes } from "@/shared/languages.js";
import type { SurveyConfig } from "@/shared/types/zod.js";

export interface ContentLanguageMetadata {
    sourceLanguageCode: SupportedSpokenLanguageCodes | null;
    sourceRawLanguageCode: string | null;
    sourceLanguageProvider: LanguageDetectionProvider | null;
    sourceLanguageConfidence: number | null;
}

export const UNKNOWN_CONTENT_LANGUAGE_METADATA: ContentLanguageMetadata = {
    sourceLanguageCode: null,
    sourceRawLanguageCode: null,
    sourceLanguageProvider: null,
    sourceLanguageConfidence: null,
};

export function buildSurveyLanguageDetectionCorpus({
    surveyConfig,
}: {
    surveyConfig: SurveyConfig | null | undefined;
}): string {
    if (surveyConfig === null || surveyConfig === undefined) {
        return "";
    }
    return surveyConfig.questions
        .flatMap((question) => [
            question.questionText,
            ...(question.questionType === "choice"
                ? question.options.map((option) => option.optionText)
                : []),
        ])
        .join("\n");
}

export function buildContentBlockLanguageDetectionCorpus({
    conversationCorpus,
    surveyConfig,
}: {
    conversationCorpus: string;
    surveyConfig: SurveyConfig | null | undefined;
}): string {
    const surveyCorpus = buildSurveyLanguageDetectionCorpus({ surveyConfig });
    return buildContentBlockLanguageDetectionCorpusFromParts({
        conversationCorpus,
        surveyCorpus,
    });
}

function buildContentBlockLanguageDetectionCorpusFromParts({
    conversationCorpus,
    surveyCorpus,
}: {
    conversationCorpus: string;
    surveyCorpus: string;
}): string {
    return [conversationCorpus, surveyCorpus]
        .map((corpus) => corpus.trim())
        .filter((corpus) => corpus.length > 0)
        .join("\n\n");
}

function buildSurveyLanguageDetectionCorpusFromRows({
    rows,
}: {
    rows: readonly {
        questionText: string;
        optionText: string | null;
    }[];
}): string {
    const texts: string[] = [];
    const seenQuestions = new Set<string>();
    for (const row of rows) {
        if (!seenQuestions.has(row.questionText)) {
            texts.push(row.questionText);
            seenQuestions.add(row.questionText);
        }
        if (row.optionText !== null) {
            texts.push(row.optionText);
        }
    }
    return texts.join("\n");
}

export async function resolveContentLanguageMetadata({
    text,
    googleText,
    googleCloudCredentials,
    useGoogleLanguageDetection,
    languageHints = [],
    localLanguageDetector,
}: {
    text: string;
    googleText?: string;
    googleCloudCredentials: GoogleCloudCredentials | undefined;
    useGoogleLanguageDetection: boolean;
    languageHints?: readonly LanguageDetectionHintInput[];
    localLanguageDetector?: Parameters<typeof detectLanguageWithFallback>[0]["localDetector"];
}): Promise<ContentLanguageMetadata> {
    if (text.trim().length === 0) {
        return UNKNOWN_CONTENT_LANGUAGE_METADATA;
    }

    try {
        const googleDetector =
            googleCloudCredentials === undefined || !useGoogleLanguageDetection
                ? undefined
                : async ({ text: textToDetect }: { text: string }) =>
                      await detectLanguage({
                          client: googleCloudCredentials.client,
                          text: textToDetect,
                          projectId: googleCloudCredentials.config.projectId,
                          location: googleCloudCredentials.config.location,
                      });
        const detectionResult = await detectLanguageWithFallback({
            text,
            googleText,
            languageHints,
            localDetector: localLanguageDetector,
            googleDetector,
        });
        if (detectionResult === undefined) {
            return UNKNOWN_CONTENT_LANGUAGE_METADATA;
        }
        return {
            sourceLanguageCode: detectionResult.sourceLanguageCode,
            sourceRawLanguageCode: detectionResult.rawLanguageCode,
            sourceLanguageProvider: detectionResult.provider,
            sourceLanguageConfidence: detectionResult.confidence,
        };
    } catch (error) {
        log.warn(error, "[ContentLanguageMetadata] Failed to detect content language");
        return UNKNOWN_CONTENT_LANGUAGE_METADATA;
    }
}

export function contentLanguageMetadataUpdateValues(
    metadata: ContentLanguageMetadata,
): {
    sourceLanguageCode: SupportedSpokenLanguageCodes | null;
    sourceRawLanguageCode: string | null;
    sourceLanguageProvider: LanguageDetectionProvider | null;
    sourceLanguageConfidence: number | null;
} {
    return metadata;
}

export async function refreshCurrentConversationOwnedContentLanguageMetadata({
    db,
    conversationId,
    googleCloudCredentials,
    useGoogleLanguageDetection,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
    googleCloudCredentials: GoogleCloudCredentials | undefined;
    useGoogleLanguageDetection: boolean;
}): Promise<ContentLanguageMetadata | undefined> {
    const conversationRows = await db
        .select({
            contentId: conversationContentTable.id,
            title: conversationContentTable.title,
            bodyPlainText: conversationContentTable.bodyPlainText,
        })
        .from(conversationTable)
        .innerJoin(
            conversationContentTable,
            eq(conversationContentTable.id, conversationTable.currentContentId),
        )
        .where(eq(conversationTable.id, conversationId))
        .limit(1);
    const conversationContent = conversationRows.at(0);
    if (conversationContent === undefined) {
        return undefined;
    }

    const surveyRows = await db
        .select({
            questionContentId: surveyQuestionContentTable.id,
            questionText: surveyQuestionContentTable.questionText,
            optionContentId: surveyQuestionOptionContentTable.id,
            optionText: surveyQuestionOptionContentTable.optionText,
        })
        .from(surveyQuestionTable)
        .innerJoin(
            surveyQuestionContentTable,
            eq(surveyQuestionContentTable.id, surveyQuestionTable.currentContentId),
        )
        .leftJoin(
            surveyQuestionOptionTable,
            eq(surveyQuestionOptionTable.surveyQuestionId, surveyQuestionTable.id),
        )
        .leftJoin(
            surveyQuestionOptionContentTable,
            eq(
                surveyQuestionOptionContentTable.id,
                surveyQuestionOptionTable.currentContentId,
            ),
        )
        .where(
            and(
                eq(surveyQuestionTable.conversationId, conversationId),
                isNotNull(surveyQuestionTable.currentContentId),
            ),
        );
    const surveyCorpus = buildSurveyLanguageDetectionCorpusFromRows({
        rows: surveyRows,
    });
    const bodyPlainText = conversationContent.bodyPlainText ?? "";
    const blockLanguageMetadata = await resolveContentLanguageMetadata({
        text: buildContentBlockLanguageDetectionCorpusFromParts({
            conversationCorpus: buildConversationLanguageDetectionCorpus({
                conversationTitle: conversationContent.title,
                bodyPlainText,
            }),
            surveyCorpus,
        }),
        googleText: buildGoogleConversationLanguageDetectionCorpus({
            conversationTitle: conversationContent.title,
            bodyPlainText,
            supplementalPlainText: surveyCorpus,
        }),
        googleCloudCredentials,
        useGoogleLanguageDetection,
    });

    await db
        .update(conversationContentTable)
        .set(contentLanguageMetadataUpdateValues(blockLanguageMetadata))
        .where(eq(conversationContentTable.id, conversationContent.contentId));

    const questionContentIds = [
        ...new Set(surveyRows.map((row) => row.questionContentId)),
    ];
    for (const questionContentId of questionContentIds) {
        await db
            .update(surveyQuestionContentTable)
            .set(contentLanguageMetadataUpdateValues(blockLanguageMetadata))
            .where(eq(surveyQuestionContentTable.id, questionContentId));
    }

    const optionContentIds = [
        ...new Set(
            surveyRows
                .map((row) => row.optionContentId)
                .filter((contentId): contentId is number => contentId !== null),
        ),
    ];
    for (const optionContentId of optionContentIds) {
        await db
            .update(surveyQuestionOptionContentTable)
            .set(contentLanguageMetadataUpdateValues(blockLanguageMetadata))
            .where(eq(surveyQuestionOptionContentTable.id, optionContentId));
    }

    const seedOpinionRows = await db
        .select({
            opinionContentId: opinionContentTable.id,
            content: opinionContentTable.content,
            contentPlainText: opinionContentTable.contentPlainText,
        })
        .from(opinionTable)
        .innerJoin(
            opinionContentTable,
            eq(opinionContentTable.id, opinionTable.currentContentId),
        )
        .where(
            and(
                eq(opinionTable.conversationId, conversationId),
                eq(opinionTable.isSeed, true),
                isNotNull(opinionTable.currentContentId),
            ),
        );

    for (const seedOpinion of seedOpinionRows) {
        const plainText =
            seedOpinion.contentPlainText ?? htmlToCountedText(seedOpinion.content);
        const sourceLanguageMetadata = await resolveContentLanguageMetadata({
            text: plainText,
            googleCloudCredentials,
            useGoogleLanguageDetection,
        });
        await db
            .update(opinionContentTable)
            .set(contentLanguageMetadataUpdateValues(sourceLanguageMetadata))
            .where(eq(opinionContentTable.id, seedOpinion.opinionContentId));
    }

    return blockLanguageMetadata;
}
