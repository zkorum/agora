import { and, asc, eq, exists, inArray, isNull, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    conversationTable,
    opinionContentTable,
    opinionModerationTable,
    opinionTable,
    rankingConversationConfigTable,
    rankingItemContentTable,
    rankingItemTable,
    userTable,
} from "@/shared-backend/schema.js";
import type {
    UpdateConversationRequest,
    UpdateConversationResponse,
} from "@/shared/types/dto.js";
import type { ConversationType } from "@/shared/types/zod.js";
import {
    contentLanguageMetadataUpdateValues,
    type ContentLanguageMetadata,
    type ContentLanguageMetadataResolver,
} from "./contentLanguageMetadata.js";
import type { RankingItemContentSource } from "./contentTranslation.js";
import { lockRankingScoringConfig } from "./maxdiff.js";
import { queueOpinionUpdatedEvent } from "./realtimeEventOutbox.js";
import {
    normalizeUserRichTextInput,
    type NormalizedUserRichText,
} from "./richText.js";
import { rankingSeedHasVotes } from "./seedOpinionEditability.js";
import { getOpinionIdsWithBlockingVotes } from "./opinionVoteEligibility.js";
import type { VoteBuffer } from "./voteBuffer.js";

type Change = NonNullable<
    UpdateConversationRequest["seedOpinionChanges"]
>[number];
type Failure = Extract<UpdateConversationResponse, { success: false }>;
type ChangeFailure = Extract<
    Failure,
    { reason: "seed_opinion_change_rejected" }
>;
type SeedVoteGuard = Pick<VoteBuffer, "hasBlockingVotes">;
const SEED_CHANGE_CONCURRENCY = 5;
type Target = {
    readonly id: number;
    readonly slugId: string;
    readonly sourceVersion: string;
    readonly content: string;
    readonly hasVotes: boolean;
} & (
    | {
          readonly kind: "polis";
          readonly authorId: string;
          readonly isHidden: boolean;
      }
    | {
          readonly kind: "ranking";
          readonly body: string | null;
          readonly bodyPlainText: string | null;
          readonly active: boolean;
      }
);
type PreparedChange = { readonly target: Target } & (
    | { readonly action: "delete" }
    | { readonly action: "edit"; readonly content: NormalizedUserRichText }
);

// A typed Error is needed to abort the transaction when a vote arrives after writes.
class SeedOpinionChangeRejection extends Error {
    constructor(readonly failure: ChangeFailure) {
        super("Seed statement change rejected");
    }
}

export async function withSeedOpinionChangeRollback<T>({
    operation,
}: {
    operation: () => Promise<T>;
}): Promise<T | ChangeFailure> {
    try {
        return await operation();
    } catch (error: unknown) {
        if (error instanceof SeedOpinionChangeRejection) return error.failure;
        throw error;
    }
}

function rejection({
    slugId,
    changeFailure,
}: {
    slugId: string;
    changeFailure: ChangeFailure["changeFailure"];
}): ChangeFailure {
    return {
        success: false,
        reason: "seed_opinion_change_rejected",
        seedOpinionSlugId: slugId,
        changeFailure,
    };
}

async function loadTargets({
    db,
    conversationId,
    conversationType,
    slugIds,
    lockTargets,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
    conversationType: ConversationType;
    slugIds: string[];
    lockTargets: boolean;
}): Promise<ReadonlyMap<string, Target>> {
    if (conversationType === "ranking") {
        if (lockTargets) await lockRankingScoringConfig({ db, conversationId });
        const hasVotes = await rankingSeedHasVotes({
            db,
            conversationId,
            slugId: rankingItemTable.slugId,
        });
        const query = db
            .select({
                id: rankingItemTable.id,
                slugId: rankingItemTable.slugId,
                sourceVersion: rankingItemContentTable.publicId,
                content: rankingItemContentTable.title,
                body: rankingItemContentTable.body,
                bodyPlainText: rankingItemContentTable.bodyPlainText,
                lifecycle: rankingItemTable.lifecycleStatus,
                hasVotes,
            })
            .from(rankingItemTable)
            .innerJoin(
                rankingItemContentTable,
                eq(
                    rankingItemContentTable.id,
                    rankingItemTable.currentContentId,
                ),
            )
            .where(
                and(
                    inArray(rankingItemTable.slugId, slugIds),
                    eq(rankingItemTable.conversationId, conversationId),
                    eq(rankingItemTable.isSeed, true),
                ),
            )
            .orderBy(asc(rankingItemTable.id));
        const rows = await (lockTargets
            ? query.for("update", { of: rankingItemTable })
            : query);
        return new Map(
            rows.map(({ lifecycle, ...row }) => [
                row.slugId,
                {
                    ...row,
                    kind: "ranking",
                    active:
                        lifecycle === "active" || lifecycle === "in_progress",
                } satisfies Target,
            ]),
        );
    }
    const query = db
        .select({
            id: opinionTable.id,
            slugId: opinionTable.slugId,
            authorId: opinionTable.authorId,
            sourceVersion: opinionContentTable.publicId,
            content: opinionContentTable.content,
            isHidden: exists(
                db
                    .select({ id: opinionModerationTable.id })
                    .from(opinionModerationTable)
                    .where(
                        and(
                            eq(
                                opinionModerationTable.opinionId,
                                opinionTable.id,
                            ),
                            eq(opinionModerationTable.moderationAction, "hide"),
                            isNull(opinionModerationTable.deletedAt),
                        ),
                    ),
            ).mapWith(Boolean),
        })
        .from(opinionTable)
        .innerJoin(
            opinionContentTable,
            eq(opinionContentTable.id, opinionTable.currentContentId),
        )
        .innerJoin(userTable, eq(userTable.id, opinionTable.authorId))
        .where(
            and(
                inArray(opinionTable.slugId, slugIds),
                eq(opinionTable.conversationId, conversationId),
                eq(opinionTable.isSeed, true),
                eq(userTable.isDeleted, false),
            ),
        )
        .orderBy(asc(opinionTable.id));
    const rows = await (lockTargets
        ? query.for("update", { of: opinionTable })
        : query);
    const blockedIds = await getOpinionIdsWithBlockingVotes({
        db,
        conversationId,
        opinionIds: rows.map((row) => row.id),
    });
    return new Map(
        rows.map((row) => [
            row.slugId,
            {
                ...row,
                hasVotes: blockedIds.has(row.id),
                kind: "polis",
            } satisfies Target,
        ]),
    );
}

async function assertNoBufferedVotes({
    db,
    changes,
    voteBuffer,
}: {
    db: PostgresJsDatabase;
    changes: readonly PreparedChange[];
    voteBuffer: SeedVoteGuard | undefined;
}): Promise<void> {
    if (voteBuffer === undefined) return;
    const targets = changes.flatMap((change) =>
        change.action === "edit" && change.target.kind === "polis"
            ? [change.target]
            : [],
    );
    for (
        let offset = 0;
        offset < targets.length;
        offset += SEED_CHANGE_CONCURRENCY
    ) {
        const checked = await Promise.all(
            targets
                .slice(offset, offset + SEED_CHANGE_CONCURRENCY)
                .map(async (target) => ({
                    target,
                    blocked: await voteBuffer.hasBlockingVotes({
                        db,
                        opinionId: target.id,
                        authorId: target.authorId,
                        isSeed: true,
                    }),
                })),
        );
        const blocked = checked.find((check) => check.blocked);
        if (blocked !== undefined)
            throw new SeedOpinionChangeRejection(
                rejection({
                    slugId: blocked.target.slugId,
                    changeFailure: "has_votes",
                }),
            );
    }
}

export async function assertSeedOpinionEditsHaveNoVotes({
    db,
    conversationId,
    changes,
    voteBuffer,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
    changes: readonly PreparedChange[];
    voteBuffer: SeedVoteGuard | undefined;
}): Promise<void> {
    const edits = changes.filter((change) => change.action === "edit");
    const polisIds = edits
        .filter((change) => change.target.kind === "polis")
        .map((change) => change.target.id);
    const rankingIds = edits
        .filter((change) => change.target.kind === "ranking")
        .map((change) => change.target.id);
    const blockedPolisIds = await getOpinionIdsWithBlockingVotes({
        db,
        conversationId,
        opinionIds: polisIds,
    });
    const blocked = edits
        .filter(
            (change) =>
                change.target.kind === "polis" &&
                blockedPolisIds.has(change.target.id),
        )
        .map((change) => ({ slugId: change.target.slugId }));
    if (rankingIds.length > 0)
        blocked.push(
            ...(await db
                .select({ slugId: rankingItemTable.slugId })
                .from(rankingItemTable)
                .where(
                    and(
                        inArray(rankingItemTable.id, rankingIds),
                        await rankingSeedHasVotes({
                            db,
                            conversationId,
                            slugId: rankingItemTable.slugId,
                        }),
                    ),
                )),
        );
    const first = blocked.at(0);
    if (first !== undefined)
        throw new SeedOpinionChangeRejection(
            rejection({ slugId: first.slugId, changeFailure: "has_votes" }),
        );
    await assertNoBufferedVotes({ db, changes: edits, voteBuffer });
}

export async function prepareSeedOpinionChanges({
    db,
    conversationId,
    conversationType,
    changes,
    voteBuffer,
    lockTargets,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
    conversationType: ConversationType;
    changes: readonly Change[];
    voteBuffer: SeedVoteGuard | undefined;
    lockTargets: boolean;
}): Promise<{ success: true; changes: PreparedChange[] } | Failure> {
    if (changes.length === 0) return { success: true, changes: [] };
    const seen = new Set<string>();
    for (const change of changes) {
        if (seen.has(change.slugId))
            return rejection({
                slugId: change.slugId,
                changeFailure: "not_allowed",
            });
        seen.add(change.slugId);
    }
    // Lock all targets in database-ID order with one query, after the conversation lock.
    const targets = await loadTargets({
        db,
        conversationId,
        conversationType,
        slugIds: [...seen],
        lockTargets,
    });
    const prepared: PreparedChange[] = [];
    for (const change of changes) {
        const target = targets.get(change.slugId);
        if (target === undefined)
            return rejection({
                slugId: change.slugId,
                changeFailure: "not_found",
            });
        if (target.sourceVersion !== change.sourceVersion)
            return rejection({
                slugId: change.slugId,
                changeFailure: "version_conflict",
            });
        if (change.action === "delete") {
            prepared.push({ target, action: "delete" });
            continue;
        }
        if (target.kind === "polis" && target.isHidden)
            return rejection({
                slugId: change.slugId,
                changeFailure: "not_allowed",
            });
        if (target.hasVotes)
            return rejection({
                slugId: change.slugId,
                changeFailure: "has_votes",
            });
        const normalized = normalizeUserRichTextInput({
            html: change.content,
            validationMode: "opinion",
        });
        if (!normalized.success)
            return {
                success: false,
                reason: "invalid_seed_opinion",
                seedOpinionSlugId: change.slugId,
                seedOpinionFailure: {
                    index: 0,
                    reason: normalized.reason,
                    count: normalized.count,
                    limit: normalized.limit,
                },
            };
        if (normalized.content.html !== target.content)
            prepared.push({
                target,
                action: "edit",
                content: normalized.content,
            });
    }
    await assertNoBufferedVotes({ db, changes: prepared, voteBuffer });
    return { success: true, changes: prepared };
}

function editDetectionText(
    change: Extract<PreparedChange, { action: "edit" }>,
): string {
    return change.target.kind === "ranking" &&
        change.target.bodyPlainText !== null
        ? `${change.content.plainText}\n\n${change.target.bodyPlainText}`
        : change.content.plainText;
}

export function getSeedOpinionChangeLanguageInputs(
    changes: readonly PreparedChange[],
): { text: string }[] {
    return changes
        .filter((change) => change.action === "edit")
        .map((change) => ({ text: editDetectionText(change) }));
}

async function applyDeletions({
    db,
    changes,
    conversationId,
    now,
}: {
    db: PostgresJsDatabase;
    changes: readonly PreparedChange[];
    conversationId: number;
    now: Date;
}): Promise<void> {
    const deleted = changes
        .filter((change) => change.action === "delete")
        .map((change) => change.target);
    const polis = deleted.filter((target) => target.kind === "polis");
    const ranking = deleted.filter((target) => target.kind === "ranking");
    if (polis.length > 0) {
        await db
            .update(opinionTable)
            .set({ currentContentId: null, updatedAt: now })
            .where(
                inArray(
                    opinionTable.id,
                    polis.map((target) => target.id),
                ),
            );
        const authorCounts = new Map<string, number>();
        for (const target of polis)
            authorCounts.set(
                target.authorId,
                (authorCounts.get(target.authorId) ?? 0) + 1,
            );
        for (const [authorId, count] of authorCounts)
            await db
                .update(userTable)
                .set({
                    totalOpinionCount: sql`${userTable.totalOpinionCount} - ${count}`,
                })
                .where(eq(userTable.id, authorId));
    }
    if (ranking.length > 0) {
        await db
            .update(rankingItemTable)
            .set({ currentContentId: null, updatedAt: now })
            .where(
                inArray(
                    rankingItemTable.id,
                    ranking.map((target) => target.id),
                ),
            );
        await db
            .update(rankingConversationConfigTable)
            .set({
                itemCount: sql`${rankingConversationConfigTable.itemCount} - ${ranking.filter((target) => target.active).length}`,
                totalItemCount: sql`${rankingConversationConfigTable.totalItemCount} - ${ranking.length}`,
                updatedAt: now,
            })
            .from(conversationTable)
            .where(
                and(
                    eq(conversationTable.id, conversationId),
                    eq(
                        rankingConversationConfigTable.id,
                        conversationTable.rankingConfigId,
                    ),
                ),
            );
    }
}

export async function applySeedOpinionChanges({
    db,
    changes,
    conversation,
    userId,
    resolveLanguageMetadata,
    useGoogleLanguageDetection,
    now,
}: {
    db: PostgresJsDatabase;
    changes: readonly PreparedChange[];
    conversation: { id: number; slugId: string; contentId: number };
    userId: string;
    resolveLanguageMetadata: ContentLanguageMetadataResolver;
    useGoogleLanguageDetection: boolean;
    now: Date;
}): Promise<RankingItemContentSource[]> {
    const rankingSources: RankingItemContentSource[] = [];
    const edits = changes.filter((change) => change.action === "edit");
    const localized: ((typeof edits)[number] & {
        language: ContentLanguageMetadata;
    })[] = [];
    for (
        let offset = 0;
        offset < edits.length;
        offset += SEED_CHANGE_CONCURRENCY
    ) {
        localized.push(
            ...(await Promise.all(
                edits
                    .slice(offset, offset + SEED_CHANGE_CONCURRENCY)
                    .map(async (change) => ({
                        ...change,
                        language: await resolveLanguageMetadata({
                            text: editDetectionText(change),
                            useGoogleLanguageDetection,
                        }),
                    })),
            )),
        );
    }
    await applyDeletions({ db, changes, conversationId: conversation.id, now });
    for (const change of localized) {
        const target = change.target;
        if (target.kind === "polis") {
            const inserted = (
                await db
                    .insert(opinionContentTable)
                    .values({
                        opinionId: target.id,
                        conversationContentId: conversation.contentId,
                        content: change.content.html,
                        contentPlainText: change.content.plainText,
                        isEdited: true,
                        editedByUserId: userId,
                        createdAt: now,
                        ...contentLanguageMetadataUpdateValues(change.language),
                    })
                    .returning({
                        id: opinionContentTable.id,
                        publicId: opinionContentTable.publicId,
                    })
            ).at(0);
            if (inserted === undefined)
                throw new Error("Statement content insertion returned no row");
            await db
                .update(opinionTable)
                .set({ currentContentId: inserted.id, updatedAt: now })
                .where(eq(opinionTable.id, target.id));
            await queueOpinionUpdatedEvent({
                db,
                data: {
                    conversationSlugId: conversation.slugId,
                    opinionSlugId: target.slugId,
                    previousSourceVersion: target.sourceVersion,
                    sourceVersion: inserted.publicId,
                    opinion: change.content.html,
                    sourceLanguageCode: change.language.sourceLanguageCode,
                    timestamp: now.getTime(),
                },
            });
        } else {
            const inserted = (
                await db
                    .insert(rankingItemContentTable)
                    .values({
                        rankingItemId: target.id,
                        conversationContentId: conversation.contentId,
                        title: change.content.html,
                        body: target.body,
                        bodyPlainText: target.bodyPlainText,
                        createdAt: now,
                        ...contentLanguageMetadataUpdateValues(change.language),
                    })
                    .returning({
                        id: rankingItemContentTable.id,
                        publicId: rankingItemContentTable.publicId,
                    })
            ).at(0);
            if (inserted === undefined)
                throw new Error("Ranking content insertion returned no row");
            await db
                .update(rankingItemTable)
                .set({ currentContentId: inserted.id, updatedAt: now })
                .where(eq(rankingItemTable.id, target.id));
            rankingSources.push({
                conversationId: conversation.id,
                conversationSlugId: conversation.slugId,
                itemSlugId: target.slugId,
                contentId: inserted.id,
                publicId: inserted.publicId,
                title: change.content.html,
                bodyHtml: target.body,
                bodyPlainText: target.bodyPlainText,
                ...change.language,
            });
        }
    }
    return rankingSources;
}
