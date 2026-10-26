import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    conversationTable,
    conversationModerationTable,
    opinionModerationTable,
    opinionTable,
} from "@/shared-backend/schema.js";
import { getProjectCapabilitiesById } from "./projectAccess.js";
import type {
    OpinionEditingAvailability,
    OpinionItem,
} from "@/shared/types/zod.js";
import { getOpinionIdsWithBlockingVotes } from "./opinionVoteEligibility.js";

export type OpinionManagementCapabilities = Readonly<
    NonNullable<OpinionItem["management"]>
>;

export function getOpinionEditingAvailability({
    canManage,
    isImporting,
    isLocked,
    isHidden,
    hasVotes,
}: {
    canManage: boolean;
    isImporting: boolean;
    isLocked: boolean;
    isHidden: boolean;
    hasVotes: boolean;
}): OpinionEditingAvailability {
    if (!canManage || isHidden)
        return { allowed: false, reason: "not_allowed" };
    if (isImporting) return { allowed: false, reason: "import_in_progress" };
    if (isLocked) return { allowed: false, reason: "conversation_locked" };
    if (hasVotes) return { allowed: false, reason: "has_votes" };
    return { allowed: true };
}

export async function canManageOpinion({
    db,
    userId,
    opinion,
    lockAuthorization = false,
}: {
    db: PostgresJsDatabase;
    userId: string;
    opinion: {
        readonly authorId: string;
        readonly isSeed: boolean;
        readonly projectId: number;
    };
    lockAuthorization?: boolean;
}): Promise<boolean> {
    if (!opinion.isSeed) return opinion.authorId === userId;
    const capabilities = await getProjectCapabilitiesById({
        db,
        userId,
        projectIds: [opinion.projectId],
        requestedCapabilities: ["conversation_edit"],
        lockAuthorization,
    });
    return (
        capabilities.get(opinion.projectId)?.has("conversation_edit") === true
    );
}

export async function hasBlockingOpinionVotes({
    db,
    opinionId,
    conversationId,
}: {
    db: PostgresJsDatabase;
    opinionId: number;
    conversationId: number;
}): Promise<boolean> {
    const blocked = await getOpinionIdsWithBlockingVotes({
        db,
        conversationId,
        opinionIds: [opinionId],
    });
    return blocked.has(opinionId);
}

export async function getOpinionManagementCapabilities({
    db,
    opinionSlugIds,
    userId,
    lockAuthorization = false,
}: {
    db: PostgresJsDatabase;
    opinionSlugIds: readonly string[];
    userId: string | undefined;
    lockAuthorization?: boolean;
}): Promise<ReadonlyMap<string, OpinionManagementCapabilities>> {
    const capabilities = new Map<string, OpinionManagementCapabilities>();
    if (userId === undefined || opinionSlugIds.length === 0)
        return capabilities;
    const opinions = await db
        .select({
            id: opinionTable.id,
            slugId: opinionTable.slugId,
            authorId: opinionTable.authorId,
            isSeed: opinionTable.isSeed,
            conversationId: opinionTable.conversationId,
            projectId: conversationTable.projectId,
            conversationLocked: conversationModerationTable.id,
            moderationAction: opinionModerationTable.moderationAction,
            isImporting: conversationTable.isImporting,
        })
        .from(opinionTable)
        .innerJoin(
            conversationTable,
            eq(conversationTable.id, opinionTable.conversationId),
        )
        .leftJoin(
            conversationModerationTable,
            and(
                eq(
                    conversationModerationTable.conversationId,
                    conversationTable.id,
                ),
                isNull(conversationModerationTable.deletedAt),
            ),
        )
        .leftJoin(
            opinionModerationTable,
            and(
                eq(opinionModerationTable.opinionId, opinionTable.id),
                isNull(opinionModerationTable.deletedAt),
            ),
        )
        .where(
            and(
                inArray(opinionTable.slugId, [...opinionSlugIds]),
                isNotNull(opinionTable.currentContentId),
                isNotNull(conversationTable.currentContentId),
            ),
        );
    if (opinions.length === 0) return capabilities;
    const projectCapabilities = await getProjectCapabilitiesById({
        db,
        userId,
        projectIds: [
            ...new Set(
                opinions
                    .filter((opinion) => opinion.isSeed)
                    .map((opinion) => opinion.projectId),
            ),
        ],
        requestedCapabilities: ["conversation_edit"],
        lockAuthorization,
    });
    const canManage = (opinion: (typeof opinions)[number]): boolean =>
        opinion.isSeed
            ? projectCapabilities
                  .get(opinion.projectId)
                  ?.has("conversation_edit") === true
            : opinion.authorId === userId;
    const availability = opinions.map((opinion) => {
        const canManageThisOpinion = canManage(opinion);
        return {
            ...opinion,
            canDelete: canManageThisOpinion,
            editing: getOpinionEditingAvailability({
                canManage: canManageThisOpinion,
                isImporting: opinion.isImporting,
                isLocked: opinion.conversationLocked !== null,
                isHidden: opinion.moderationAction === "hide",
                hasVotes: false,
            }),
        };
    });
    const opinionIdsByConversation = new Map<number, number[]>();
    for (const opinion of availability) {
        if (!opinion.editing.allowed) continue;
        const ids = opinionIdsByConversation.get(opinion.conversationId) ?? [];
        ids.push(opinion.id);
        opinionIdsByConversation.set(opinion.conversationId, ids);
    }
    const blockedIds = new Set<number>();
    for (const [conversationId, opinionIds] of opinionIdsByConversation) {
        for (const id of await getOpinionIdsWithBlockingVotes({
            db,
            conversationId,
            opinionIds,
        }))
            blockedIds.add(id);
    }
    for (const opinion of availability) {
        capabilities.set(opinion.slugId, {
            editing: blockedIds.has(opinion.id)
                ? { allowed: false, reason: "has_votes" }
                : opinion.editing,
            canDelete: opinion.canDelete,
        });
    }
    return capabilities;
}
