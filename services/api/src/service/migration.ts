import { log } from "@/app.js";
import {
    opinionTable,
    polisClusterOpinionTable,
    polisClusterTable,
} from "@/schema.js";
import { and, eq, inArray, isNotNull, isNull, sql, SQL } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export async function fixNullProbabilitiesInOpinionTable({
    db,
}: {
    db: PostgresJsDatabase;
}) {
    await db
        .update(opinionTable)
        .set({ polisGroupAwareConsensusProbabilityAgree: 0 })
        .where(isNull(opinionTable.polisGroupAwareConsensusProbabilityAgree));
    log.info(
        `Updated all polisGroupAwareConsensusProbabilityAgree in opinionTable to 0 if null`,
    );
    await db
        .update(opinionTable)
        .set({ polisPriority: 0 })
        .where(isNull(opinionTable.polisPriority));
    log.info(`Updated all polisPriority in opinionTable to 0 if null`);
    await db
        .update(opinionTable)
        .set({ polisDivisiveness: 0 })
        .where(isNull(opinionTable.polisDivisiveness));
    log.info(`Updated all polisDivisiveness in opinionTable to 0 if null`);
}

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

export async function fixEmptyOpinionIdInPolisClusterOpinionTable({
    db,
}: {
    db: PostgresJsDatabase;
}): Promise<void> {
    await db
        .update(polisClusterOpinionTable)
        .set({
            opinionId: opinionTable.id,
        })
        .from(opinionTable)
        .where(
            and(
                eq(opinionTable.slugId, polisClusterOpinionTable.opinionSlugId),
                isNull(polisClusterOpinionTable.opinionId),
                isNotNull(polisClusterOpinionTable.opinionSlugId),
            ),
        );
}

export async function fixNullPassInOpinionTable({
    db,
}: {
    db: PostgresJsDatabase;
}) {
    const records = await db
        .update(opinionTable)
        .set({ numPasses: 0 })
        .where(isNull(opinionTable.numPasses));
    log.info(
        `Updated ${String(records.length)} records with numPasses in opinionTable to 0 if null`,
    );
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
