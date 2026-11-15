import { httpErrors } from "@fastify/sensible";
import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { getPrimaryDatabase } from "@/shared-backend/db.js";
import {
    conversationContentTable,
    conversationExportGenerationTable,
    conversationExportRequestTable,
    conversationTable,
} from "@/shared-backend/schema.js";
import { getConversationViewAccessLevelForConversation } from "../conversationAccess.js";

export async function findConversationRecord({
    db,
    conversationSlugId,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
}) {
    const rows = await db
        .select({
            id: conversationTable.id,
            slugId: conversationTable.slugId,
            title: conversationContentTable.title,
            projectId: conversationTable.projectId,
            conversationType: conversationTable.conversationType,
        })
        .from(conversationTable)
        .innerJoin(
            conversationContentTable,
            eq(conversationTable.currentContentId, conversationContentTable.id),
        )
        .where(
            and(
                eq(conversationTable.slugId, conversationSlugId),
                eq(conversationTable.isImporting, false),
            ),
        )
        .limit(1);
    return rows.at(0);
}

export type ConversationExportConversationRecord = NonNullable<
    Awaited<ReturnType<typeof findConversationRecord>>
>;

// Resolve actor access once in the controller; core export work consumes this snapshot.
export async function resolveConversationExportRequestAccess({
    db,
    conversationSlugId,
    userId,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    userId: string;
}) {
    const writer = getPrimaryDatabase(db);
    const conversation = await findConversationRecord({
        db: writer,
        conversationSlugId,
    });
    if (conversation === undefined) return undefined;
    const exportAccessLevel =
        await getConversationViewAccessLevelForConversation({
            db: writer,
            userId,
            projectId: conversation.projectId,
        });
    return { conversation, exportAccessLevel };
}

export type ConversationExportRequestAccess = NonNullable<
    Awaited<ReturnType<typeof resolveConversationExportRequestAccess>>
>;

export async function resolveConversationExportStatusAccess({
    db,
    exportSlugId,
    userId,
}: {
    db: PostgresJsDatabase;
    exportSlugId: string;
    userId: string;
}) {
    const writer = getPrimaryDatabase(db);
    const row = (
        await writer
            .select({
                id: conversationExportRequestTable.id,
                exportSlugId: conversationExportRequestTable.slugId,
                status: conversationExportRequestTable.status,
                conversationSlugId: conversationTable.slugId,
                projectId: conversationTable.projectId,
                failureReason: conversationExportRequestTable.failureReason,
                cancellationReason:
                    conversationExportRequestTable.cancellationReason,
                createdAt: conversationExportRequestTable.createdAt,
                generationCreatedAt:
                    conversationExportGenerationTable.createdAt,
                expiresAt: conversationExportRequestTable.expiresAt,
                deletedAt: conversationExportRequestTable.deletedAt,
            })
            .from(conversationExportRequestTable)
            .innerJoin(
                conversationExportGenerationTable,
                eq(
                    conversationExportGenerationTable.id,
                    conversationExportRequestTable.generationId,
                ),
            )
            .innerJoin(
                conversationTable,
                eq(
                    conversationTable.id,
                    conversationExportRequestTable.conversationId,
                ),
            )
            .where(
                and(
                    eq(conversationExportRequestTable.slugId, exportSlugId),
                    eq(conversationExportRequestTable.userId, userId),
                ),
            )
            .limit(1)
    ).at(0);
    if (row === undefined) throw httpErrors.notFound("Export not found");
    const exportAccessLevel =
        await getConversationViewAccessLevelForConversation({
            db: writer,
            userId,
            projectId: row.projectId,
        });
    return {
        userId,
        exportAccessLevel,
        request: {
            ...row,
            expiresAt: new Date(
                Math.min(
                    row.expiresAt.getTime(),
                    row.generationCreatedAt.getTime() +
                        30 * 24 * 60 * 60 * 1000,
                ),
            ),
        },
    };
}

export type ConversationExportStatusAccess = Awaited<
    ReturnType<typeof resolveConversationExportStatusAccess>
>;
