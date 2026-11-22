import { and, asc, count, eq, gt, inArray, isNull, or } from "drizzle-orm";
import type { PostgresTransaction } from "@/shared-backend/db.js";
import {
    conversationTable,
    gatheringConfigTable,
    gatheringFieldTable,
    gatheringFieldTranslationTable,
    gatheringResponseTable,
    gatheringAnswerTable,
    gatheringAnswerTranslationTable,
} from "@/shared-backend/schema.js";
import {
    createEagerTranslationWorkBatch,
    type TranslationWorkInput,
} from "./contentTranslation.js";
import { readConversationTranslationPolicy } from "./conversationTranslationPolicy.js";
import { gatheringResponseEligibility } from "./gatheringEligibility.js";

const TRANSLATION_SOURCE_PAGE_SIZE = 500;
export type GatheringTranslationScheduleScope =
    | { kind: "conversation" }
    | { kind: "response"; contentId: number };

/** Callers retain the conversation lifecycle lock so pagination sees a stable source set.
 * Schedule references in bounded batches, without loading original or translated text.
 */
export async function createEagerGatheringTranslationWork({
    tx,
    conversationSlugId,
    now,
    scope,
}: {
    tx: PostgresTransaction;
    conversationSlugId: string;
    now: Date;
    scope: GatheringTranslationScheduleScope;
}): Promise<number[]> {
    const conversation = await readConversationTranslationPolicy({
        tx,
        conversationSlugId,
    });
    if (conversation === undefined) return [];
    const { policy } = conversation;
    if (
        !policy.dynamicTranslationEnabled ||
        policy.effectiveTargetLanguageCodes.length === 0
    )
        return [];
    const workIds: number[] = [];
    if (scope.kind === "conversation") {
        const fields = await tx
            .select({ id: gatheringFieldTable.id })
            .from(gatheringFieldTable)
            .innerJoin(
                conversationTable,
                eq(
                    conversationTable.gatheringConfigId,
                    gatheringFieldTable.configId,
                ),
            )
            .where(eq(conversationTable.id, conversation.conversationId));
        if (fields.length > 0) {
            for (const targetLanguageCode of policy.effectiveTargetLanguageCodes) {
                const translated = await tx
                    .select({ id: gatheringFieldTranslationTable.fieldId })
                    .from(gatheringFieldTranslationTable)
                    .where(
                        and(
                            inArray(
                                gatheringFieldTranslationTable.fieldId,
                                fields.map(({ id }) => id),
                            ),
                            eq(
                                gatheringFieldTranslationTable.displayLanguageCode,
                                targetLanguageCode,
                            ),
                        ),
                    );
                const translatedIds = new Set(translated.map(({ id }) => id));
                const inputs: TranslationWorkInput[] = fields
                    .filter(({ id }) => !translatedIds.has(id))
                    .map(({ id }) => ({
                        sourceKind: "gathering_field",
                        conversationId: conversation.conversationId,
                        gatheringFieldId: id,
                        targetLanguageCode,
                    }));
                workIds.push(
                    ...(await createEagerTranslationWorkBatch({
                        db: tx,
                        inputs,
                        now,
                    })),
                );
            }
        }
    }
    let afterResponseId: number | undefined;
    while (true) {
        const page = await tx
            .select({
                responseId: gatheringResponseTable.id,
                contentId: gatheringResponseTable.currentContentId,
            })
            .from(gatheringResponseTable)
            .innerJoin(
                gatheringConfigTable,
                eq(gatheringConfigTable.id, gatheringResponseTable.configId),
            )
            .where(
                and(
                    eq(
                        gatheringResponseTable.conversationId,
                        conversation.conversationId,
                    ),
                    eq(gatheringConfigTable.responseVisibility, "everyone"),
                    or(
                        isNull(gatheringResponseTable.moderation),
                        eq(gatheringResponseTable.moderation, "move"),
                    ),
                    gatheringResponseEligibility(tx),
                    afterResponseId === undefined
                        ? undefined
                        : gt(gatheringResponseTable.id, afterResponseId),
                    scope.kind === "response"
                        ? eq(
                              gatheringResponseTable.currentContentId,
                              scope.contentId,
                          )
                        : undefined,
                ),
            )
            .orderBy(asc(gatheringResponseTable.id))
            .limit(TRANSLATION_SOURCE_PAGE_SIZE);
        const contentIds = page.flatMap(({ contentId }) =>
            contentId === null ? [] : [contentId],
        );
        if (contentIds.length > 0) {
            for (const targetLanguageCode of policy.effectiveTargetLanguageCodes) {
                const coverage = await tx
                    .select({
                        contentId: gatheringAnswerTable.contentId,
                        answerCount: count(),
                        translatedCount: count(
                            gatheringAnswerTranslationTable.fieldId,
                        ),
                    })
                    .from(gatheringAnswerTable)
                    .leftJoin(
                        gatheringAnswerTranslationTable,
                        and(
                            eq(
                                gatheringAnswerTranslationTable.contentId,
                                gatheringAnswerTable.contentId,
                            ),
                            eq(
                                gatheringAnswerTranslationTable.fieldId,
                                gatheringAnswerTable.fieldId,
                            ),
                            eq(
                                gatheringAnswerTranslationTable.displayLanguageCode,
                                targetLanguageCode,
                            ),
                        ),
                    )
                    .where(inArray(gatheringAnswerTable.contentId, contentIds))
                    .groupBy(gatheringAnswerTable.contentId);
                const inputs: TranslationWorkInput[] = coverage
                    .filter(
                        ({ answerCount, translatedCount }) =>
                            translatedCount !== answerCount,
                    )
                    .map(({ contentId }) => ({
                        sourceKind: "gathering_response",
                        conversationId: conversation.conversationId,
                        gatheringResponseContentId: contentId,
                        targetLanguageCode,
                    }));
                workIds.push(
                    ...(await createEagerTranslationWorkBatch({
                        db: tx,
                        inputs,
                        now,
                    })),
                );
            }
        }
        const last = page.at(-1);
        if (last === undefined || page.length < TRANSLATION_SOURCE_PAGE_SIZE)
            break;
        afterResponseId = last.responseId;
    }
    return workIds;
}
