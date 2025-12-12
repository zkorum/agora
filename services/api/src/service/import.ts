import { type PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import type { ImportPolisResults } from "@/shared/types/polis.js";
import * as postService from "./post.js";
import * as userService from "./user.js";
import * as voteService from "./voting.js";
import * as commentService from "./comment.js";
import type { ConversationIds } from "@/utils/dataStructure.js";
import { log } from "@/app.js";
import {
    MAX_LENGTH_BODY_HTML,
    MAX_LENGTH_TITLE,
    toUnionUndefined,
} from "@/shared/shared.js";
import {
    conversationTable,
    conversationUpdateQueueTable,
} from "@/shared-backend/schema.js";
import { eq } from "drizzle-orm";
import { nowZeroMs } from "@/shared/util.js";
import type { VoteBuffer } from "./voteBuffer.js";
import type { EventSlug } from "@/shared/types/zod.js";

// URL import configuration
export interface UrlImportConfig {
    method: "url";
    polisUrl: string;
    polisUrlType: "report" | "conversation";
}

// CSV import configuration
export interface CsvImportConfig {
    method: "csv";
}

// Discriminated union for import configuration
export type ImportConfig = UrlImportConfig | CsvImportConfig;

interface LoadImportedPolisConversationProps {
    db: PostgresDatabase;
    voteBuffer: VoteBuffer;
    importedPolisConversation: ImportPolisResults;
    importConfig: ImportConfig;
    proof: string;
    didWrite: string;
    authorId: string;
    postAsOrganization: string | undefined;
    indexConversationAt?: string;
    isLoginRequired: boolean;
    isIndexed: boolean;
    requiresEventTicket?: EventSlug;
}

export async function loadImportedPolisConversation({
    db,
    voteBuffer,
    importedPolisConversation,
    importConfig,
    proof,
    didWrite,
    authorId,
    postAsOrganization,
    indexConversationAt,
    isLoginRequired,
    isIndexed,
    requiresEventTicket,
}: LoadImportedPolisConversationProps): Promise<ConversationIds> {
    const now = nowZeroMs();
    // create conversation
    const ownername = importedPolisConversation.conversation_data.ownername;
    const importCreatedAt =
        importedPolisConversation.conversation_data.created !== null
            ? new Date(importedPolisConversation.conversation_data.created)
            : undefined;
    let conversationUrl: string | undefined;
    let reportUrl: string | undefined;
    let trimmedBody = importedPolisConversation.conversation_data.description;
    const bodyRoomLengthForAppending = 500;
    if (
        trimmedBody.length >
        MAX_LENGTH_BODY_HTML - bodyRoomLengthForAppending
    ) {
        trimmedBody = trimmedBody.slice(
            0,
            MAX_LENGTH_BODY_HTML - bodyRoomLengthForAppending,
        ); // TODO: this is to keep room to the following text... it may break html in the middle, so this is a work-around until we move what's below outside of the body, and then we'll just trim
        trimmedBody = `${trimmedBody} [...].`;
    }
    let conversationBody = `${trimmedBody}<br /><br />--------------`;

    // Handle messaging based on import method
    if (importConfig.method === "csv") {
        // CSV imports
        conversationBody = `${conversationBody}<br />This conversation was imported from Polis CSV files.`;
        // For CSV imports, link_url might be available from summary.csv
        if (importedPolisConversation.conversation_data.link_url) {
            conversationUrl =
                importedPolisConversation.conversation_data.link_url;
            conversationBody = `${conversationBody}<br />The original conversation url is ${conversationUrl}.`;
        }
    } else {
        // URL imports (existing behavior)
        if (importConfig.polisUrlType === "conversation") {
            conversationUrl = importConfig.polisUrl;
            conversationBody = `${conversationBody}<br />This conversation was initially imported from ${conversationUrl}.`;
            reportUrl =
                importedPolisConversation.report_id !== null
                    ? `https://pol.is/report/${importedPolisConversation.report_id}`
                    : undefined;
            if (reportUrl !== undefined) {
                conversationBody = `${conversationBody}<br />The original report url is ${reportUrl}.`;
            }
        } else {
            conversationUrl =
                importedPolisConversation.conversation_data.link_url ??
                (importedPolisConversation.conversation_data.conversation_id !==
                null
                    ? `https://pol.is/${String(importedPolisConversation.conversation_data.conversation_id)}`
                    : undefined); // should never be undefined, but as we rely on external systems we don't control, better safe than sorry
            reportUrl = importConfig.polisUrl;
            conversationBody = `${conversationBody}<br />This conversation was initially imported from ${reportUrl}.`;
            if (conversationUrl !== undefined) {
                conversationBody = `${conversationBody}<br />The original conversation url is ${conversationUrl}.`;
            }
        }
    }
    if (ownername !== null) {
        conversationBody = `${conversationBody}<br />The original author is "${ownername}".`;
    }
    if (importCreatedAt !== undefined) {
        conversationBody = `${conversationBody}<br />The original creation date is ${importCreatedAt.toDateString()}.`;
    }
    conversationBody = `${conversationBody}<br />The data in the Analysis tab has been completely recalculated by Agora.`;
    let trimmedTitle = importedPolisConversation.conversation_data.topic;
    // Handle empty topic from Polis - provide a fallback title
    if (trimmedTitle.trim().length === 0) {
        trimmedTitle = "[No title] Imported conversation";
    } else if (trimmedTitle.length > MAX_LENGTH_TITLE) {
        const ellipsis = " [...]";
        trimmedTitle = trimmedTitle.slice(
            0,
            MAX_LENGTH_TITLE - ellipsis.length,
        );
        trimmedTitle = `${trimmedTitle}${ellipsis}`;
    }
    // NOTE: cannot be a transaction as it's too long-lasting
    const { conversationSlugId, conversationId, conversationContentId } =
        await postService.createNewPost({
            db: db,
            voteBuffer: voteBuffer,
            conversationTitle: trimmedTitle,
            conversationBody: conversationBody,
            pollingOptionList: null,
            authorId: authorId,
            didWrite: didWrite,
            proof: proof,
            indexConversationAt: indexConversationAt,
            postAsOrganization: postAsOrganization,
            isIndexed: isIndexed,
            isLoginRequired: isLoginRequired,
            seedOpinionList: [],
            requiresEventTicket: requiresEventTicket,
            importUrl:
                importConfig.method === "csv"
                    ? undefined
                    : importConfig.polisUrl,
            importConversationUrl: conversationUrl,
            importExportUrl: reportUrl,
            importCreatedAt: importCreatedAt,
            importAuthor: toUnionUndefined(ownername),
            importMethod: importConfig.method,
            isImporting: true,
        });
    try {
        const {
            userIdPerParticipantId,
            participantCount,
            voteCount,
            opinionCount,
        } = await userService.bulkInsertUsersFromExternalPolisConvo({
            db: db,
            importedPolisConversation,
            conversationSlugId,
        });
        // just for logging purpose
        if (
            importedPolisConversation.conversation_data.participant_count !==
            null
        ) {
            if (
                importedPolisConversation.conversation_data
                    .participant_count !== participantCount
            )
                log.warn(
                    `[Import] importedPolisConversation.conversation_data.participant_count !== participantCount calculated from the votes when importing conversationSlugId=${conversationSlugId}`,
                );
        } else {
            log.warn(
                `[Import] importedPolisConversation.conversation_data.participant_count is null when importing conversationSlugId=${conversationSlugId}`,
            );
        }
        const { opinionIdPerStatementId, opinionContentIdPerOpinionId } =
            await commentService.bulkInsertOpinionsFromExternalPolisConvo({
                db: db,
                importedPolisConversation,
                conversationId,
                conversationSlugId,
                conversationContentId,
                userIdPerParticipantId,
            });
        await voteService.bulkInsertVotesFromExternalPolisConvo({
            db: db,
            importedPolisConversation,
            opinionIdPerStatementId,
            opinionContentIdPerOpinionId,
            userIdPerParticipantId,
            conversationSlugId,
        });
        await postService.updateParticipantCount({
            db: db,
            conversationId,
            participantCount: participantCount,
            opinionCount: opinionCount,
            voteCount: voteCount,
        });
        await db
            .insert(conversationUpdateQueueTable)
            .values({
                conversationId: conversationId,
                requestedAt: now,
                processedAt: null,
            })
            .onConflictDoUpdate({
                target: conversationUpdateQueueTable.conversationId,
                set: {
                    requestedAt: now,
                    processedAt: null,
                },
            });
        // Mark import as complete - conversation is now visible in feed
        await db
            .update(conversationTable)
            .set({ isImporting: false })
            .where(eq(conversationTable.id, conversationId));
        return { conversationSlugId, conversationId, conversationContentId };
    } catch (e) {
        // TODO: make incremental transactions, implement batch mechanisms to allow for resuming importing that failed midway
        log.warn(
            "Error while updating imported conversations, marking the incomplete imported conversation as deleted and soft-deleting imported users",
        );
        await postService.deletePostBySlugId({
            proof: proof,
            db: db,
            didWrite: didWrite,
            conversationSlugId: conversationSlugId,
            userId: authorId,
        });
        // Soft-delete all imported users created for this conversation
        await userService.softDeleteImportedUsersForConversation({
            db: db,
            conversationId: conversationId,
        });
        throw e;
    }
}
