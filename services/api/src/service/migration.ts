import { log } from "@/app.js";
import { polisClusterOpinionTable, polisClusterTable } from "@/schema.js";
import { eq, inArray, isNull, sql, SQL } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export async function fixEmptyPolisContentId({
    db,
}: {
    db: PostgresJsDatabase;
}) {
    const resultsClusterOpinionTable = await db
        .select({
            polisContentId: polisClusterTable.polisContentId,
            polisClusterOpinionId: polisClusterOpinionTable.id,
        })
        .from(polisClusterOpinionTable)
        .innerJoin(
            polisClusterTable,
            eq(polisClusterTable.id, polisClusterOpinionTable.polisClusterId),
        )
        .where(isNull(polisClusterOpinionTable.polisContentId));

    if (resultsClusterOpinionTable.length !== 0) {
        const sqlChunks: SQL[] = [];
        sqlChunks.push(sql`(CASE`);
        for (const resultClusterOpinionTable of resultsClusterOpinionTable) {
            sqlChunks.push(
                sql`WHEN ${polisClusterOpinionTable.id} = ${resultClusterOpinionTable.polisClusterOpinionId} THEN ${resultClusterOpinionTable.polisContentId}`,
            );
        }
        sqlChunks.push(sql`ELSE polis_content_id`);
        sqlChunks.push(sql`END)`);
        const finalSQL = sql.join(sqlChunks, sql.raw(" "));
        const affectedIds = resultsClusterOpinionTable.map(
            (r) => r.polisClusterOpinionId,
        );
        const results = await db
            .update(polisClusterOpinionTable)
            .set({ polisContentId: finalSQL })
            .where(inArray(polisClusterOpinionTable.id, affectedIds));
        log.info(
            `Updated polisClusterId in ${String(results.count)} records of polisClusterOpinionTable`,
        );
    }
}

// import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
// import * as commentService from "./comment.js";
// import * as votingService from "./voting.js";
// import type { AxiosInstance } from "axios";
//
// interface CastAgreeVoteForAllOpinionAuthorsProps {
//     db: PostgresJsDatabase;
//     axiosPolis?: AxiosInstance;
//     polisUserEmailDomain: string;
//     polisUserEmailLocalPart: string;
//     polisUserPassword: string;
//     polisDelayToFetch: number;
//     voteNotifMilestones: number[];
//     awsAiLabelSummaryEnable: boolean;
//     awsAiLabelSummaryRegion: string;
//     awsAiLabelSummaryModelId: string;
//     awsAiLabelSummaryTemperature: string;
//     awsAiLabelSummaryTopP: string;
//     awsAiLabelSummaryTopK: string;
//     awsAiLabelSummaryMaxTokens: string;
//     awsAiLabelSummaryPrompt: string;
//     now: Date;
// }
//
// export async function castAgreeVoteForAllOpinionAuthors({
//     db,
//     axiosPolis,
//     polisUserEmailDomain,
//     polisUserEmailLocalPart,
//     polisUserPassword,
//     polisDelayToFetch,
//     voteNotifMilestones,
//     awsAiLabelSummaryEnable,
//     awsAiLabelSummaryRegion,
//     awsAiLabelSummaryModelId,
//     awsAiLabelSummaryTemperature,
//     awsAiLabelSummaryTopP,
//     awsAiLabelSummaryTopK,
//     awsAiLabelSummaryMaxTokens,
//     awsAiLabelSummaryPrompt,
//     now,
// }: CastAgreeVoteForAllOpinionAuthorsProps): Promise<void> {
//     // get all opinion author that have not voted on their own opinion -- cancel doesn't count
//     const authorsAsADid =
//         await commentService.getOpinionAuthorsWhoHaveNotVotedOnTheirOpinion({
//             db,
//         });
//
//     // batch cast agree on each of them
//     for (const author of authors) {
//         const { didWrite, opinionSlugId } = author;
//         await votingService.castVoteForOpinionSlugId({
//             db,
//             opinionSlugId,
//             didWrite,
//             proof: undefined,
//             votingAction: "agree",
//             userAgent: undefined,
//             axiosPolis,
//             polisUserEmailDomain,
//             polisUserEmailLocalPart,
//             polisUserPassword,
//             polisDelayToFetch,
//             voteNotifMilestones,
//             awsAiLabelSummaryEnable,
//             awsAiLabelSummaryRegion,
//             awsAiLabelSummaryModelId,
//             awsAiLabelSummaryTemperature,
//             awsAiLabelSummaryTopP,
//             awsAiLabelSummaryTopK,
//             awsAiLabelSummaryMaxTokens,
//             awsAiLabelSummaryPrompt,
//             now,
//         });
//     }
// }
