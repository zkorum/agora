import {
    pollResponseContentTable,
    pollResponseProofTable,
    pollResponseTable,
    pollTable,
} from "@/shared-backend/schema.js";
import { type PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { useCommonPost } from "./common.js";
import type { HttpErrors } from "@fastify/sensible";
import { eq, sql, and } from "drizzle-orm";
import type { GetUserPollResponseByConversations200 } from "@/shared/types/dto.js";
import * as authUtilService from "@/service/authUtil.js";

interface GetUserPollResponseProps {
    db: PostgresDatabase;
    postSlugIdList: string[];
    authorId: string;
    httpErrors: HttpErrors;
}

export async function getUserPollResponse({
    db,
    postSlugIdList,
    authorId,
    httpErrors,
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

        const selectStatementResponse = await db
            .select({
                postId: pollResponseTable.conversationId,
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
                    eq(pollResponseTable.conversationId, postDetails.id),
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
    httpErrors: HttpErrors;
    didWrite: string;
    proof: string;
    userAgent: string;
    now: Date;
}

export async function submitPollResponse({
    db,
    postSlugId,
    voteOptionChoice,
    httpErrors,
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
        const insertPollResponseTableResponse = await tx
            .insert(pollResponseTable)
            .values({
                authorId: authorId,
                conversationId: postId,
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

        const option1CountDiff = voteOptionChoice == 1 ? 1 : 0;
        const option2CountDiff = voteOptionChoice == 2 ? 1 : 0;
        const option3CountDiff = voteOptionChoice == 3 ? 1 : 0;
        const option4CountDiff = voteOptionChoice == 4 ? 1 : 0;
        const option5CountDiff = voteOptionChoice == 5 ? 1 : 0;
        const option6CountDiff = voteOptionChoice == 6 ? 1 : 0;

        // Update vote counter
        await tx
            .update(pollTable)
            .set({
                ...(voteOptionChoice == 1 && {
                    option1Response: sql`${pollTable.option1Response} + ${option1CountDiff}`,
                }),
                ...(voteOptionChoice == 2 && {
                    option2Response: sql`${pollTable.option2Response} + ${option2CountDiff}`,
                }),
                ...(voteOptionChoice == 3 && {
                    option3Response: sql`${pollTable.option3Response} + ${option3CountDiff}`,
                }),
                ...(voteOptionChoice == 4 && {
                    option4Response: sql`${pollTable.option4Response} + ${option4CountDiff}`,
                }),
                ...(voteOptionChoice == 5 && {
                    option5Response: sql`${pollTable.option5Response} + ${option5CountDiff}`,
                }),
                ...(voteOptionChoice == 6 && {
                    option6Response: sql`${pollTable.option6Response} + ${option6CountDiff}`,
                }),
            })
            .where(eq(pollTable.conversationContentId, postContentId));

        await tx
            .update(pollResponseTable)
            .set({
                currentContentId: pollResponseContentId,
            })
            .where(eq(pollResponseTable.id, pollResponseTableId));
    });
}
