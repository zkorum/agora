import { httpErrors } from "@fastify/sensible";
import { and, eq, isNull, or } from "drizzle-orm";
import type { PostgresTransaction } from "@/shared-backend/db.js";
import {
    conversationTable,
    projectTable,
    userTable,
    deviceTable,
    gatheringConfigTable,
    gatheringFieldTable,
    gatheringResponseTable,
} from "@/shared-backend/schema.js";
import { gatheringResponseFormat } from "@/shared/gathering.js";
import { resolveConversationParticipationMode } from "@/shared/participationMode.js";
import { getDeviceStatus } from "./authUtil.js";
import { projectListedForDiscovery } from "./conversationDiscovery.js";
import {
    gatheringOwnResponseCondition,
    gatheringProjectCapabilityCondition,
    gatheringResponseEligibility,
} from "./gatheringEligibility.js";

/** Account -> device -> conversation matches deletion and identity merge. */
export async function lockGatheringIdentity({
    tx,
    didWrite,
}: {
    tx: PostgresTransaction;
    didWrite: string | undefined;
}) {
    if (didWrite === undefined) return undefined;
    const observed = (
        await tx
            .select({ userId: deviceTable.userId })
            .from(deviceTable)
            .where(eq(deviceTable.didWrite, didWrite))
    ).at(0);
    if (observed === undefined) return undefined;
    const account = (
        await tx
            .select({ id: userTable.id })
            .from(userTable)
            .where(
                and(
                    eq(userTable.id, observed.userId),
                    eq(userTable.isDeleted, false),
                    isNull(userTable.authRestrictedAt),
                ),
            )
            .for("share")
    ).at(0);
    if (account === undefined)
        throw httpErrors.unauthorized("Account unavailable");
    const device = (
        await tx
            .select({ userId: deviceTable.userId })
            .from(deviceTable)
            .where(eq(deviceTable.didWrite, didWrite))
            .for("share")
    ).at(0);
    if (device?.userId !== account.id)
        throw httpErrors.conflict("Identity changed");
    const identity = await getDeviceStatus({
        db: tx,
        didWrite,
        now: new Date(),
    });
    if (!identity.isKnown || (identity.isRegistered && !identity.isLoggedIn))
        return undefined;
    return identity;
}

export async function lockGatheringConversation({
    tx,
    conversationSlugId,
    accessMode,
}: {
    tx: PostgresTransaction;
    conversationSlugId: string;
    accessMode: "read" | "write";
}) {
    const conversation = (
        await tx
            .select()
            .from(conversationTable)
            .where(eq(conversationTable.slugId, conversationSlugId))
            .for(accessMode === "read" ? "share" : "no key update")
    ).at(0);
    if (
        conversation?.currentContentId == null ||
        conversation.deletedAt !== null ||
        conversation.isImporting ||
        conversation.conversationType !== "gathering" ||
        conversation.gatheringConfigId === null
    )
        throw httpErrors.notFound("Gathering not found");
    const project = (
        await tx
            .select({
                participationMode: projectTable.participationMode,
                isListedForDiscovery: projectListedForDiscovery(),
            })
            .from(projectTable)
            .where(
                and(
                    eq(projectTable.id, conversation.projectId),
                    isNull(projectTable.deletedAt),
                ),
            )
    ).at(0);
    if (project === undefined) throw httpErrors.notFound("Gathering not found");
    const config = (
        await tx
            .select()
            .from(gatheringConfigTable)
            .where(eq(gatheringConfigTable.id, conversation.gatheringConfigId))
    ).at(0);
    if (config === undefined) throw httpErrors.notFound("Gathering not found");
    return {
        ...conversation,
        isIndexed: conversation.isIndexed && project.isListedForDiscovery,
        participationMode: resolveConversationParticipationMode({
            source: conversation.participationModeSettingsSource,
            participationMode: conversation.participationMode,
            projectParticipationMode: project.participationMode,
        }),
        config,
    };
}

export async function getGatheringPermissions({
    tx,
    userId,
    projectId,
}: {
    tx: PostgresTransaction;
    userId: string | undefined;
    projectId: number;
}) {
    const account =
        userId === undefined
            ? undefined
            : (
                  await tx
                      .select({
                          isSiteModerator: userTable.isSiteModerator,
                          canEdit: gatheringProjectCapabilityCondition({
                              db: tx,
                              userId,
                              projectId,
                              capabilities: ["conversation_edit"],
                          }).mapWith(Boolean),
                          canModerate: gatheringProjectCapabilityCondition({
                              db: tx,
                              userId,
                              projectId,
                              capabilities: ["conversation_moderate"],
                          }).mapWith(Boolean),
                      })
                      .from(userTable)
                      .where(
                          and(
                              eq(userTable.id, userId),
                              eq(userTable.isDeleted, false),
                              isNull(userTable.authRestrictedAt),
                          ),
                      )
              ).at(0);
    return {
        canEdit: account?.canEdit === true,
        canModerate:
            account?.canModerate === true || account?.isSiteModerator === true,
        isSiteModerator: account?.isSiteModerator === true,
    };
}

export async function readGatheringFormat({
    tx,
    configId,
}: {
    tx: PostgresTransaction;
    configId: number;
}) {
    const fields = await tx
        .select({
            fieldId: gatheringFieldTable.id,
            label: gatheringFieldTable.label,
            required: gatheringFieldTable.required,
            characterLimit: gatheringFieldTable.characterLimit,
        })
        .from(gatheringFieldTable)
        .where(eq(gatheringFieldTable.configId, configId))
        .orderBy(gatheringFieldTable.position);
    return gatheringResponseFormat.parse(fields);
}

export async function loadGatheringContext({
    tx,
    didWrite,
    conversationSlugId,
    accessMode,
}: {
    tx: PostgresTransaction;
    didWrite: string | undefined;
    conversationSlugId: string;
    accessMode: "read" | "write";
}) {
    const identity = await lockGatheringIdentity({ tx, didWrite });
    const conversation = await lockGatheringConversation({
        tx,
        conversationSlugId,
        accessMode,
    });
    const userId = identity?.userId;
    const access = await getGatheringPermissions({
        tx,
        userId,
        projectId: conversation.projectId,
    });
    return { conversation, userId, access };
}

export function gatheringResponseVisibilityCondition({
    tx,
    conversation,
    userId,
    access,
    moderating = false,
}: Awaited<ReturnType<typeof loadGatheringContext>> & {
    tx: PostgresTransaction;
    moderating?: boolean;
}) {
    return and(
        eq(gatheringResponseTable.conversationId, conversation.id),
        // This equality lets scoped pagination use the existing (config_id, id) index.
        eq(gatheringResponseTable.configId, conversation.config.id),
        gatheringResponseEligibility(tx),
        conversation.config.responseVisibility === "everyone"
            ? undefined
            : or(
                  gatheringOwnResponseCondition(userId),
                  gatheringProjectCapabilityCondition({
                      db: tx,
                      userId,
                      projectId: conversation.projectId,
                      capabilities: [
                          "conversation_edit",
                          "conversation_moderate",
                      ],
                  }),
              ),
        access.isSiteModerator || (moderating && access.canModerate)
            ? undefined
            : or(
                  isNull(gatheringResponseTable.moderation),
                  eq(gatheringResponseTable.moderation, "move"),
              ),
    );
}
