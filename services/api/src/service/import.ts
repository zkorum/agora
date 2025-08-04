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

interface LoadImportedPolisConversationProps {
    db: PostgresDatabase;
    polisUrl: string;
    polisUrlType: "report" | "conversation";
    importedPolisConversation: ImportPolisResults;
    proof: string;
    didWrite: string;
    authorId: string;
    postAsOrganization: string | undefined;
    indexConversationAt?: string;
    isLoginRequired: boolean;
    isIndexed: boolean;
}

export async function loadImportedPolisConversation({
    db,
    importedPolisConversation,
    polisUrl,
    polisUrlType,
    proof,
    didWrite,
    authorId,
    postAsOrganization,
    indexConversationAt,
    isLoginRequired,
    isIndexed,
}: LoadImportedPolisConversationProps): Promise<ConversationIds> {
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
    if (polisUrlType === "conversation") {
        conversationUrl = polisUrl;
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
        reportUrl = polisUrl;
        conversationBody = `${conversationBody}<br />This conversation was initially imported from ${reportUrl}.`;
        if (conversationUrl !== undefined) {
            conversationBody = `${conversationBody}<br />The original conversation url is ${conversationUrl}.`;
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
    if (
        importedPolisConversation.conversation_data.topic.length >
        MAX_LENGTH_TITLE
    ) {
        const ellipsis = " [...]";
        trimmedTitle = trimmedTitle.slice(
            0,
            MAX_LENGTH_TITLE - ellipsis.length,
        );
        trimmedTitle = `${trimmedTitle}${ellipsis}`;
    }
    return await db.transaction(async (tx) => {
        // TODO: add ownername and other info in DB for future use, and don't add the above info directly in the description, but do it in the UI
        const { conversationSlugId, conversationId, conversationContentId } =
            await postService.createNewPost({
                db: tx,
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
                importUrl: polisUrl,
                importConversationUrl: conversationUrl,
                importExportUrl: reportUrl,
                importCreatedAt: importCreatedAt,
                importAuthor: toUnionUndefined(ownername),
            });
        const {
            userIdPerParticipantId,
            participantCount,
            voteCount,
            opinionCount,
        } = await userService.bulkInsertUsersFromExternalPolisConvo({
            db: tx,
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
                db: tx,
                importedPolisConversation,
                conversationId,
                conversationSlugId,
                conversationContentId,
                userIdPerParticipantId,
            });
        await voteService.bulkInsertVotesFromExternalPolisConvo({
            db: tx,
            importedPolisConversation,
            opinionIdPerStatementId,
            opinionContentIdPerOpinionId,
            userIdPerParticipantId,
            conversationSlugId,
        });
        await postService.updateParticipantCount({
            db: tx,
            conversationId,
            participantCount: participantCount,
            opinionCount: opinionCount,
            voteCount: voteCount,
        });
        return { conversationSlugId, conversationId, conversationContentId };
    });
}
