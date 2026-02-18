import {
    pollResponseContentTable,
    pollResponseProofTable,
    pollResponseTable,
    pollTable,
    conversationContentTable,
} from "@/shared-backend/schema.js";
import { type PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { useCommonPost } from "./common.js";
import { httpErrors } from "@fastify/sensible";
import { eq, sql, and } from "drizzle-orm";
import type { GetUserPollResponseByConversations200 } from "@/shared/types/dto.js";
import * as authUtilService from "@/service/authUtil.js";

interface GetUserPollResponseProps {
    db: PostgresDatabase;
    postSlugIdList: string[];
    authorId: string;
}

export async function getUserPollResponse({
    db,
    postSlugIdList,
    authorId,
}: GetUserPollResponseProps): Promise<GetUserPollResponseByConversations200> {
    const resultList: GetUserPollResponseByConversations200 = [];

    for (const postSlugId of postSlugIdList) {
        const postDetails = await useCommonPost().getPostMetadataFromSlugId({
            db: db,
            conversationSlugId: postSlugId,
        });

        if (postDetails.contentId == null) {
            throw httpErrors.notFound(
                "Failed to fetch poll response's content ID",
            );
        }

        // Get the current poll ID from conversation content
        const pollIdResult = await db
            .select({ pollId: conversationContentTable.pollId })
            .from(conversationContentTable)
            .where(eq(conversationContentTable.id, postDetails.contentId));

        if (!pollIdResult[0]?.pollId) {
            // No poll in this conversation, skip
            continue;
        }

        const selectStatementResponse = await db
            .select({
                pollId: pollResponseTable.pollId,
                authorId: pollResponseTable.authorId,
                optionChosen: pollResponseContentTable.optionChosen,
            })
            .from(pollResponseTable)
            .innerJoin(
                pollResponseContentTable,
                eq(
                    pollResponseContentTable.pollResponseId,
                    pollResponseTable.id,
                ),
            )
            .where(
                and(
                    eq(pollResponseTable.authorId, authorId),
                    eq(pollResponseTable.pollId, pollIdResult[0].pollId),
                ),
            );

        if (selectStatementResponse.length == 1) {
            resultList.push({
                conversationSlugId: postSlugId,
                optionChosen: selectStatementResponse[0].optionChosen,
            });
        }
    }

    return resultList;
}

interface SubmitPollResponseProps {
    db: PostgresDatabase;
    postSlugId: string;
    voteOptionChoice: number;
    didWrite: string;
    proof: string;
    userAgent: string;
    now: Date;
}

export async function submitPollResponse({
    db,
    postSlugId,
    voteOptionChoice,
    didWrite,
    proof,
    userAgent,
    now,
}: SubmitPollResponseProps) {
    const {
        id: postId,
        contentId: postContentId,
        isLoginRequired: conversationIsLoginRequired,
    } = await useCommonPost().getPostMetadataFromSlugId({
        db: db,
        conversationSlugId: postSlugId,
    });

    if (postContentId == null) {
        throw httpErrors.notFound(
            "Failed to locate post resource: " + postSlugId,
        );
    }

    const authorId = await authUtilService.getOrRegisterUserIdFromDeviceStatus({
        db,
        didWrite,
        conversationIsLoginRequired,
        userAgent,
        now,
    });

    await db.transaction(async (tx) => {
        // Get the poll ID from the current content first
        const pollIdResult = await tx
            .select({ pollId: conversationContentTable.pollId })
            .from(conversationContentTable)
            .where(eq(conversationContentTable.id, postContentId));

        if (!pollIdResult[0]?.pollId) {
            throw httpErrors.notFound("Poll not found for this conversation");
        }

        const pollId = pollIdResult[0].pollId;

        const insertPollResponseTableResponse = await tx
            .insert(pollResponseTable)
            .values({
                authorId: authorId,
                pollId: pollId,
            })
            .returning({ id: pollResponseTable.id });

        const pollResponseTableId = insertPollResponseTableResponse[0].id;

        const insertPollResponseProofTableResponse = await tx
            .insert(pollResponseProofTable)
            .values({
                type: "creation",
                conversationId: postId,
                authorDid: didWrite,
                proof: proof,
                proofVersion: 1,
            })
            .returning({ id: pollResponseTable.id });

        const pollResponseProofTableId =
            insertPollResponseProofTableResponse[0].id;

        const pollResponseContentTableResponse = await tx
            .insert(pollResponseContentTable)
            .values({
                pollResponseId: pollResponseTableId,
                pollResponseProofId: pollResponseProofTableId,
                conversationContentId: postContentId,
                optionChosen: voteOptionChoice,
            })
            .returning({ id: pollResponseContentTable.id });

        const pollResponseContentId = pollResponseContentTableResponse[0].id;

        // Update vote counter using the poll ID - increment the chosen option's response count
        const updateFields: Record<string, unknown> = {};

        switch (voteOptionChoice) {
            case 1:
                updateFields.option1Response = sql`${pollTable.option1Response} + 1`;
                break;
            case 2:
                updateFields.option2Response = sql`${pollTable.option2Response} + 1`;
                break;
            case 3:
                updateFields.option3Response = sql`${pollTable.option3Response} + 1`;
                break;
            case 4:
                updateFields.option4Response = sql`${pollTable.option4Response} + 1`;
                break;
            case 5:
                updateFields.option5Response = sql`${pollTable.option5Response} + 1`;
                break;
            case 6:
                updateFields.option6Response = sql`${pollTable.option6Response} + 1`;
                break;
        }

        await tx
            .update(pollTable)
            .set(updateFields)
            .where(eq(pollTable.id, pollIdResult[0].pollId));

        await tx
            .update(pollResponseTable)
            .set({
                currentContentId: pollResponseContentId,
            })
            .where(eq(pollResponseTable.id, pollResponseTableId));
    });
}
