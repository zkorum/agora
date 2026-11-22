import { httpErrors } from "@fastify/sensible";
import { and, asc, eq, isNotNull, isNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { getPrimaryDatabase } from "@/shared-backend/db.js";
import {
    conversationAnalysisCloseTable,
    conversationTable,
    qvCalculationStateTable,
    qvCalculationTable,
    qvInputSnapshotTable,
    qvInputItemTable,
    qvResultItemTable,
    rankingItemTable,
    rankingItemContentTable,
    userTable,
    projectTable,
} from "@/shared-backend/schema.js";
import { Dto } from "@/shared/types/dto.js";
import type { z } from "zod";
import { currentRankingItemSourceCondition } from "@/shared-backend/opinionEligibility.js";
import { buildRankingItemDisplayContentByContentId } from "./rankingItemDisplay.js";
import {
    originalContentDisplayRequest,
    type ContentDisplayRequest,
} from "./displayContent.js";
import { resolveConversationTranslationDisplayPreferences } from "./conversationTranslationDisplay.js";
import { describeClosedAnalysisSelection } from "./closedAnalysisSelectionState.js";
import { currentAnalysisCloseCondition } from "./closedAnalysisQueries.js";

const acceptedCalculation = alias(
    qvCalculationTable,
    "accepted_qv_calculation",
);

/** Writer-side lifecycle authorization and result body share one short read boundary. */
export async function fetchQvResults({
    db,
    conversationSlugId,
    displayPreferences = originalContentDisplayRequest,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    displayPreferences?: ContentDisplayRequest;
}): Promise<z.infer<typeof Dto.qvResultsResponse>> {
    return await getPrimaryDatabase(db).transaction(async (tx) => {
        const conversations = await tx
            .select({
                id: conversationTable.id,
                isClosed: conversationTable.isClosed,
                closedFinalizedAt: conversationTable.closedFinalizedAt,
                closingTargetRevision: conversationTable.closingTargetRevision,
            })
            .from(conversationTable)
            .where(
                and(
                    eq(conversationTable.slugId, conversationSlugId),
                    eq(conversationTable.prioritizationType, "qv"),
                    isNotNull(conversationTable.currentContentId),
                    eq(conversationTable.isImporting, false),
                    isNull(conversationTable.deletedAt),
                ),
            )
            .for("share");
        const conversation = conversations.at(0);
        if (conversation === undefined)
            throw httpErrors.notFound("Conversation not found");
        // This statement starts after any lifecycle-lock wait. Joining these
        // references into the locking SELECT could combine its older MVCC snapshot
        // with an updated conversation row after PostgreSQL's lock recheck.
        const close = conversationAnalysisCloseTable;
        const references = await tx
            .select({
                close,
                state: {
                    generation: qvCalculationStateTable.generation,
                },
                calculation: {
                    id: qvCalculationTable.id,
                    status: qvCalculationTable.status,
                },
                accepted: {
                    id: acceptedCalculation.id,
                    generation: acceptedCalculation.generation,
                    status: acceptedCalculation.status,
                },
                snapshot: {
                    id: qvInputSnapshotTable.id,
                    capturedAt: qvInputSnapshotTable.capturedAt,
                    participantCount: qvInputSnapshotTable.participantCount,
                },
            })
            .from(conversationTable)
            .innerJoin(
                projectTable,
                eq(projectTable.id, conversationTable.projectId),
            )
            .leftJoin(close, currentAnalysisCloseCondition())
            .leftJoin(
                qvCalculationStateTable,
                eq(qvCalculationStateTable.conversationId, conversation.id),
            )
            .leftJoin(
                qvCalculationTable,
                and(
                    eq(qvCalculationTable.conversationId, conversation.id),
                    eq(
                        qvCalculationTable.generation,
                        qvCalculationStateTable.generation,
                    ),
                ),
            )
            .leftJoin(
                acceptedCalculation,
                and(
                    or(
                        eq(
                            acceptedCalculation.generation,
                            sql`coalesce(${close.servedResultRevision}, ${close.sourceRevision})`,
                        ),
                        and(
                            isNull(close.id),
                            eq(
                                acceptedCalculation.id,
                                qvCalculationStateTable.currentCalculationId,
                            ),
                        ),
                    ),
                    eq(acceptedCalculation.conversationId, conversation.id),
                ),
            )
            .leftJoin(
                qvInputSnapshotTable,
                and(
                    eq(
                        qvInputSnapshotTable.id,
                        acceptedCalculation.inputSnapshotId,
                    ),
                    eq(
                        qvInputSnapshotTable.calculationId,
                        acceptedCalculation.id,
                    ),
                ),
            )
            .where(
                and(
                    eq(conversationTable.id, conversation.id),
                    isNull(projectTable.deletedAt),
                ),
            );
        const current = references.at(0);
        if (current === undefined)
            throw httpErrors.notFound("Conversation not found");
        if (!conversation.isClosed)
            return {
                status: "open",
                generation: current.state?.generation ?? 0,
            };
        const {
            state,
            calculation,
            accepted,
            snapshot,
            close: boundClose,
        } = current;
        if (state === null || calculation === null)
            throw httpErrors.serviceUnavailable(
                "Calculation state unavailable",
            );
        const refreshStatus =
            calculation.status === "ready"
                ? undefined
                : calculation.status === "failed"
                  ? "failed"
                  : "calculating";
        if (
            refreshStatus !== undefined &&
            conversation.closedFinalizedAt === null
        )
            return { status: refreshStatus, generation: state.generation };
        // Reopening clears finalization. An old pointer must never become a
        // fallback for a new close cycle. Corrections keep the accepted closing
        // revision until their replacement is atomically activated.
        if (
            accepted?.status !== "ready" ||
            (boundClose !== null
                ? accepted.generation !==
                  (boundClose.servedResultRevision ?? boundClose.sourceRevision)
                : refreshStatus === undefined
                  ? accepted.id !== calculation.id ||
                    accepted.generation !== state.generation
                  : accepted.generation !==
                        conversation.closingTargetRevision ||
                    accepted.generation >= state.generation)
        )
            throw httpErrors.serviceUnavailable(
                "Calculation publication unavailable",
            );
        if (snapshot === null)
            throw httpErrors.serviceUnavailable(
                "Calculation input unavailable",
            );
        const closedAnalysisSelection =
            boundClose === null
                ? undefined
                : describeClosedAnalysisSelection({
                      ...boundClose,
                      closeId: boundClose.id,
                      isSwitchable: true,
                      failed: refreshStatus === "failed",
                  });
        const rows = await tx
            .select({
                item: qvInputItemTable,
                result: qvResultItemTable,
                source: {
                    id: rankingItemContentTable.id,
                    publicId: rankingItemContentTable.publicId,
                    sourceLanguageCode:
                        rankingItemContentTable.sourceLanguageCode,
                    sourceRawLanguageCode:
                        rankingItemContentTable.sourceRawLanguageCode,
                    sourceLanguageProvider:
                        rankingItemContentTable.sourceLanguageProvider,
                    sourceLanguageConfidence:
                        rankingItemContentTable.sourceLanguageConfidence,
                },
            })
            .from(qvInputItemTable)
            .leftJoin(
                rankingItemTable,
                and(
                    eq(rankingItemTable.conversationId, conversation.id),
                    eq(rankingItemTable.slugId, qvInputItemTable.itemSlugId),
                ),
            )
            .leftJoin(userTable, eq(userTable.id, rankingItemTable.authorId))
            .leftJoin(
                rankingItemContentTable,
                and(
                    eq(
                        rankingItemContentTable.rankingItemId,
                        rankingItemTable.id,
                    ),
                    eq(
                        rankingItemContentTable.publicId,
                        qvInputItemTable.sourceVersion,
                    ),
                    eq(rankingItemContentTable.title, qvInputItemTable.title),
                    or(
                        eq(rankingItemContentTable.body, qvInputItemTable.body),
                        and(
                            isNull(rankingItemContentTable.body),
                            isNull(qvInputItemTable.body),
                        ),
                    ),
                    currentRankingItemSourceCondition(),
                ),
            )
            .leftJoin(
                qvResultItemTable,
                and(
                    eq(
                        qvResultItemTable.snapshotId,
                        qvInputItemTable.snapshotId,
                    ),
                    eq(
                        qvResultItemTable.itemSlugId,
                        qvInputItemTable.itemSlugId,
                    ),
                ),
            )
            .where(eq(qvInputItemTable.snapshotId, snapshot.id))
            .orderBy(
                asc(qvResultItemTable.rank),
                asc(qvInputItemTable.position),
                asc(qvInputItemTable.itemSlugId),
            );
        const displaySources = rows.flatMap(({ item, source }) =>
            source === null
                ? []
                : [
                      {
                          ...source,
                          conversationSlugId,
                          itemSlugId: item.itemSlugId,
                          contentId: source.id,
                          // Numerical evidence owns its text; never replace it with a live edit.
                          title: item.title,
                          bodyHtml: item.body,
                          permitsNewTranslation: true,
                      },
                  ],
        );
        const displayContentByContentId =
            await buildRankingItemDisplayContentByContentId({
                db: tx,
                sources: displaySources,
                preferences:
                    await resolveConversationTranslationDisplayPreferences({
                        tx,
                        conversationSlugId,
                        request:
                            displaySources.length > 0
                                ? displayPreferences
                                : originalContentDisplayRequest,
                    }),
            });
        return {
            status: "ready",
            generation: state.generation,
            calculationId: accepted.id,
            ...(refreshStatus === undefined ? {} : { refreshStatus }),
            closedAnalysisSelection,
            capturedAt: snapshot.capturedAt,
            participantCount: snapshot.participantCount,
            items: rows.map(({ item, result, source }) => {
                if (result === null)
                    throw httpErrors.serviceUnavailable(
                        "Calculation publication unavailable",
                    );
                const displayContent =
                    source === null
                        ? {
                              sourceVersion: item.sourceVersion,
                              status: "available" as const,
                              mode: "original" as const,
                              content: {
                                  title: item.title,
                                  bodyHtml: item.body ?? undefined,
                              },
                              translationControl: null,
                          }
                        : displayContentByContentId.get(source.id);
                if (displayContent === undefined)
                    throw httpErrors.serviceUnavailable(
                        "Calculation display unavailable",
                    );
                return {
                    itemSlugId: item.itemSlugId,
                    sourceVersion: item.sourceVersion,
                    // Retained evidence is display permission, not permission to send erased sources to a provider.
                    displayContent,
                    supportUnits: result.supportUnits,
                    oppositionUnits: result.oppositionUnits,
                    netUnits: result.netUnits,
                    supportingParticipantCount:
                        result.supportingParticipantCount,
                    opposingParticipantCount: result.opposingParticipantCount,
                    rank: result.rank,
                };
            }),
        };
    });
}
