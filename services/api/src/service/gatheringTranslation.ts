import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { Script } from "@valkey/valkey-glide";
import type { BaseLogger } from "pino";
import type { z } from "zod";
import { getPrimaryDatabase } from "@/shared-backend/db.js";
import {
    CONTENT_TRANSLATION_QUEUE_PRIORITIES,
    enqueueContentTranslationWork,
} from "@/shared-backend/contentTranslationQueue.js";
import type { Valkey } from "@/shared-backend/valkey.js";
import {
    gatheringFieldTable,
    gatheringResponseTable,
    gatheringResponseContentTable,
} from "@/shared-backend/schema.js";
import type { ContentTranslationSubject } from "@/shared/types/zod.js";
import type { Dto } from "@/shared/types/dto.js";
import type { SupportedDisplayLanguageCodes } from "@/shared/languages.js";
import {
    prepareContentTranslationWork,
    type TranslationWorkInput,
} from "./contentTranslation.js";
import { readConversationTranslationPolicy } from "./conversationTranslationPolicy.js";
import type { ContentTranslationRequestMode } from "./contentTranslationContent.js";
import type { ContentDisplayPreferences } from "./displayContent.js";
import {
    loadGatheringContext,
    gatheringResponseVisibilityCondition,
} from "./gatheringAccess.js";
import {
    buildGatheringDisplayContent,
    type GatheringResponseDisplaySource,
} from "./gatheringTranslationDisplay.js";
import { readGatheringAnswersByContentId } from "./gatheringPersistence.js";
import { isTranslationAllowedForTarget } from "./translationLanguageSetting.js";

type GatheringSubject = Extract<
    ContentTranslationSubject,
    {
        kind: "gathering_field" | "gathering_response";
    }
>;
type GatheringTranslationResponse = Extract<
    z.infer<typeof Dto.contentTranslationResponse>,
    {
        subject: { kind: GatheringSubject["kind"] };
    }
>;
interface TranslationRead {
    response: GatheringTranslationResponse;
    work:
        | { kind: "none" }
        | { kind: "needed" }
        | { kind: "prepared"; workId: number; shouldQueue: boolean };
}

interface RequestGatheringContentTranslationParams {
    db: PostgresJsDatabase;
    valkey: Valkey | undefined;
    queueScript: Script;
    didWrite: string;
    subject: GatheringSubject;
    targetLanguageCode: SupportedDisplayLanguageCodes;
    requestMode: ContentTranslationRequestMode;
    now: Date;
    log: Pick<BaseLogger, "info" | "error">;
    beforeQueueTranslationWork: () => Promise<void>;
}

/** Authorization and durable writes share a boundary; Valkey calls must not hold lifecycle locks. */
export async function requestGatheringContentTranslation({
    db,
    didWrite,
    subject,
    targetLanguageCode,
    requestMode,
    beforeQueueTranslationWork,
    valkey,
    queueScript,
    now,
    log,
}: RequestGatheringContentTranslationParams): Promise<
    GatheringTranslationResponse | undefined
> {
    async function read(
        mode: "read" | "prepare",
    ): Promise<TranslationRead | undefined> {
        return await getPrimaryDatabase(db).transaction(async (tx) => {
            const ctx = await loadGatheringContext({
                tx,
                didWrite,
                conversationSlugId: subject.conversationSlugId,
                accessMode: "read",
            });
            const current = await readConversationTranslationPolicy({
                tx,
                conversationSlugId: subject.conversationSlugId,
            });
            if (current === undefined) return undefined;
            const { policy } = current;
            const preferences: ContentDisplayPreferences = {
                displayLanguage: targetLanguageCode,
                targetLanguage: targetLanguageCode,
                spokenLanguages: [],
                translationAllowed: isTranslationAllowedForTarget({
                    policy,
                    targetLanguageCode,
                }),
            };
            async function finish({
                response,
                input,
                permitsTranslation,
                reload,
            }: {
                response: GatheringTranslationResponse;
                input: TranslationWorkInput;
                permitsTranslation: boolean;
                reload: () => Promise<GatheringTranslationResponse | undefined>;
            }): Promise<TranslationRead | undefined> {
                const content = response.content;
                const exists =
                    content.kind === "translatable" &&
                    content.variants.translated !== undefined;
                if (
                    !preferences.translationAllowed ||
                    !permitsTranslation ||
                    exists ||
                    requestMode !== "queue_if_missing"
                ) {
                    return { response, work: { kind: "none" } };
                }
                if (mode === "read")
                    return { response, work: { kind: "needed" } };
                const work = await prepareContentTranslationWork({
                    db: tx,
                    input,
                    translationExists: false,
                    now,
                    log,
                    priority:
                        CONTENT_TRANSLATION_QUEUE_PRIORITIES.userInteractive,
                });
                const updated = await reload();
                return updated === undefined
                    ? undefined
                    : {
                          response: updated,
                          work: { kind: "prepared", ...work },
                      };
            }
            if (subject.kind === "gathering_field") {
                const field = (
                    await tx
                        .select({
                            fieldId: gatheringFieldTable.id,
                            label: gatheringFieldTable.label,
                        })
                        .from(gatheringFieldTable)
                        .where(
                            and(
                                eq(
                                    gatheringFieldTable.configId,
                                    ctx.conversation.config.id,
                                ),
                                eq(gatheringFieldTable.id, subject.fieldId),
                            ),
                        )
                ).at(0);
                if (field === undefined) return undefined;
                const fieldSource = field;
                const fieldSubject = subject;
                async function load(): Promise<
                    GatheringTranslationResponse | undefined
                > {
                    const display = await buildGatheringDisplayContent({
                        tx,
                        fields: [fieldSource],
                        preferences,
                    });
                    const content = display.fields.get(
                        fieldSource.fieldId,
                    )?.localized;
                    return content === undefined
                        ? undefined
                        : { success: true, subject: fieldSubject, content };
                }
                const response = await load();
                return response === undefined
                    ? undefined
                    : await finish({
                          response,
                          permitsTranslation: true,
                          reload: load,
                          input: {
                              conversationId: ctx.conversation.id,
                              sourceKind: "gathering_field",
                              gatheringFieldId: field.fieldId,
                              targetLanguageCode,
                          },
                      });
            }
            const row = (
                await tx
                    .select({
                        response: gatheringResponseTable,
                        content: gatheringResponseContentTable,
                    })
                    .from(gatheringResponseTable)
                    .innerJoin(
                        gatheringResponseContentTable,
                        eq(
                            gatheringResponseContentTable.responseId,
                            gatheringResponseTable.id,
                        ),
                    )
                    .where(
                        and(
                            gatheringResponseVisibilityCondition({
                                ...ctx,
                                tx,
                            }),
                            eq(
                                gatheringResponseTable.slugId,
                                subject.responseSlugId,
                            ),
                            eq(
                                gatheringResponseContentTable.publicId,
                                subject.sourceVersion,
                            ),
                        ),
                    )
            ).at(0);
            if (row === undefined) return undefined;
            const answers = await readGatheringAnswersByContentId({
                tx,
                contentIds: [row.content.id],
            });
            const originalAnswers = answers.get(row.content.id);
            if (originalAnswers === undefined || originalAnswers.length === 0)
                return undefined;
            const responseSource: GatheringResponseDisplaySource = {
                contentId: row.content.id,
                sourceVersion: row.content.publicId,
                answers: originalAnswers,
                permitsTranslation:
                    ctx.conversation.config.responseVisibility === "everyone" &&
                    row.response.moderation !== "hide",
            };
            const responseSubject = subject;
            async function load(): Promise<
                GatheringTranslationResponse | undefined
            > {
                const display = await buildGatheringDisplayContent({
                    tx,
                    responses: [responseSource],
                    preferences,
                });
                const content = display.responses.get(
                    responseSource.contentId,
                )?.localized;
                return content === undefined
                    ? undefined
                    : { success: true, subject: responseSubject, content };
            }
            const response = await load();
            return response === undefined
                ? undefined
                : await finish({
                      response,
                      permitsTranslation: responseSource.permitsTranslation,
                      reload: load,
                      input: {
                          conversationId: ctx.conversation.id,
                          sourceKind: "gathering_response",
                          gatheringResponseContentId: row.content.id,
                          targetLanguageCode,
                      },
                  });
        });
    }
    const initial = await read("read");
    if (initial?.work.kind !== "needed") return initial?.response;
    await beforeQueueTranslationWork();
    // Reacquire identity/conversation locks and recheck access after rate-limit I/O.
    const prepared = await read("prepare");
    if (prepared?.work.kind === "prepared" && prepared.work.shouldQueue) {
        await enqueueContentTranslationWork({
            valkey,
            script: queueScript,
            workId: prepared.work.workId,
            priority: CONTENT_TRANSLATION_QUEUE_PRIORITIES.userInteractive,
            enqueuedAtMs: now.getTime(),
            log,
        });
    }
    return prepared?.response;
}
