import { promises as fs } from "fs"; // 'fs/promises' not available in node 12
import { parse } from "csv-parse";
import { userTable } from "@/schema.js";
import { generateRandomSlugId, generateUUID } from "@/crypto.js";
import * as polisService from "@/service/polis.js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { AxiosInstance } from "axios";
import * as opinionService from "@/service/comment.js";
import * as conversationService from "@/service/post.js";
import * as votingService from "@/service/voting.js";
import { log } from "@/app.js";

// type PolisSummaryCsv = {
//     topic: string;
//     url: string;
//     voters: number;
//     "voters-in-conv": number;
//     commenters: number;
//     comments: number;
//     groups: number;
//     "conversation-description": string;
// };

interface CommentCsv {
    timestamp: string;
    datetime: string;
    "comment-id": string;
    "author-id": string;
    agrees: number;
    disagrees: number;
    moderated: number;
    "comment-body": string;
}

interface VoteCsv {
    timestamp: string;
    datetime: string;
    "comment-id": string;
    "voter-id": string;
    vote: 1 | 0 | -1;
}

interface UserCred {
    // matches database record
    id: string; // uuid
    username: string;
    isSeed: true;
}

interface LoadAndImportToAgoraProps {
    db: PostgresJsDatabase;
    axiosPolis: AxiosInstance;
    polisUserEmailDomain: string;
    polisUserEmailLocalPart: string;
    polisUserPassword: string;
    summaryFilePath: string;
    commentFilePath: string;
    voteFilePath?: string;
    polisDelayToFetch: number;
}

export async function loadAndImportToAgora({
    db,
    axiosPolis,
    polisUserEmailDomain,
    polisUserEmailLocalPart,
    polisUserPassword,
    summaryFilePath,
    commentFilePath,
    voteFilePath,
}: LoadAndImportToAgoraProps): Promise<void> {
    // const { args, flags } = await this.parse(PolisImport);
    const newUsersConvSpecificSlug = generateRandomSlugId();

    let conversationTitle: string;
    let conversationBody: string;
    const userIds: Set<string> = new Set<string>();
    const users: Record<string /* userId */, UserCred> = {};
    const comments: Record<string, CommentCsv> = {};
    const votesByCommentId: Record<
        string /* key is commentId */,
        Record<string /* key is userId */, number>
    > = {};

    const summaryFile = await fs.readFile(summaryFilePath, "utf8");
    const commentFile = await fs.readFile(commentFilePath, "utf8");
    let voteFile: string | undefined;
    if (voteFilePath !== undefined) {
        voteFile = await fs.readFile(voteFilePath, "utf8");
    }
    // Parse the CSV content
    // const records = parse(summary, { bom: true });
    // const headers = [
    //     "topic",
    //     "url",
    //     "voters",
    //     "voters-in-conv",
    //     "commenters",
    //     "comments",
    //     "groups",
    //     "conversation-description",
    // ];
    //
    const headersComments = [
        "timestamp",
        "datetime",
        "comment-id",
        "author-id",
        "agrees",
        "disagrees",
        "moderated",
        "comment-body",
    ];
    const headersVotes = [
        "timestamp",
        "datetime",
        "comment-id",
        "voter-id",
        "vote",
    ];

    parse(
        summaryFile,
        // {
        //     delimiter: ",",
        //     columns: headers,
        // },
        (error, result: string[][]) => {
            if (error) {
                log.error(error);
                return;
            }
            // console.log("Result", result);
            conversationTitle = result[0][1];
            conversationBody = result[7][1];
            if (result[1][1] !== undefined && result[1][1] !== "") {
                conversationBody = `${conversationBody} <br />Imported from ${result[1][1]}`;
            }

            parse(
                commentFile,
                {
                    delimiter: ",",
                    columns: headersComments,
                },
                (error, results: CommentCsv[]) => {
                    if (error) {
                        log.error(error);
                        return;
                    }
                    for (const result of results) {
                        if (
                            result["comment-id"] !== "comment-id" &&
                            result["author-id"] !== "author-id"
                        ) {
                            comments[result["comment-id"]] = result;
                            userIds.add(result["author-id"]);
                        }
                    }

                    if (voteFile !== undefined) {
                        parse(
                            voteFile,
                            {
                                delimiter: ",",
                                columns: headersVotes,
                            },
                            (error, results: VoteCsv[]) => {
                                (async () => {
                                    if (error) {
                                        log.error(error);
                                        return;
                                    }
                                    for (const result of results) {
                                        if (
                                            result["comment-id"] in
                                            votesByCommentId
                                        ) {
                                            votesByCommentId[
                                                result["comment-id"]
                                            ][result["voter-id"]] = result.vote;
                                        } else {
                                            votesByCommentId[
                                                result["comment-id"]
                                            ] = {};
                                            votesByCommentId[
                                                result["comment-id"]
                                            ][result["voter-id"]] = result.vote;
                                        }
                                        userIds.add(result["voter-id"]);
                                    }
                                    for (const userId of userIds) {
                                        users[userId] = {
                                            id: generateUUID(),
                                            username: `seed_${newUsersConvSpecificSlug}_${userId}`,
                                            isSeed: true,
                                        };
                                    }
                                    // add one more user for the conversation author
                                    const conversationAuthor: UserCred = {
                                        id: generateUUID() as string,
                                        username: `seed_${newUsersConvSpecificSlug}`,
                                        isSeed: true,
                                    };
                                    await importToAgora({
                                        db,
                                        axiosPolis,
                                        polisUserEmailDomain,
                                        polisUserEmailLocalPart,
                                        polisUserPassword,
                                        conversationTitle,
                                        conversationBody,
                                        users,
                                        conversationAuthor,
                                        comments,
                                        votesByCommentId,
                                    });
                                })()
                                    .then(() => 1)
                                    .catch((e: unknown) => {
                                        log.error(e);
                                    });
                            },
                        );
                    } else {
                        (async () => {
                            for (const userId of userIds) {
                                users[userId] = {
                                    id: generateUUID(),
                                    username: `seed_${newUsersConvSpecificSlug}_${userId}`,
                                    isSeed: true,
                                };
                            }
                            // add one more user for the conversation author
                            const conversationAuthor: UserCred = {
                                id: generateUUID() as string,
                                username: `seed_${newUsersConvSpecificSlug}`,
                                isSeed: true,
                            };
                            await importToAgora({
                                db,
                                axiosPolis,
                                polisUserEmailDomain,
                                polisUserEmailLocalPart,
                                polisUserPassword,
                                conversationTitle,
                                conversationBody,
                                users,
                                conversationAuthor,
                                comments,
                                votesByCommentId,
                            });
                        })()
                            .then(() => 1)
                            .catch((e: unknown) => {
                                log.error(e);
                            });
                    }
                },
            );
        },
    );
    // console.log(records);

    // const name = flags.name ?? "world";
    // this.log(
    //     `hello ${name} from /home/nicobao/zkorum/agora/services/api/src/commands/polis/import.ts`,
    // );
    // if (args.file && flags.force) {
    //     this.log(`you input --force and --file: ${args.file}`);
    // }
}
interface ImportToAgoraProps {
    axiosPolis: AxiosInstance;
    polisUserEmailDomain: string;
    polisUserEmailLocalPart: string;
    polisUserPassword: string;
    db: PostgresJsDatabase;
    conversationTitle: string;
    conversationBody: string;
    users: Record<string /* external polis userId */, UserCred>;
    conversationAuthor: UserCred;
    comments: Record<string, CommentCsv>;
    votesByCommentId: Record<
        string /* key is commentId */,
        Record<string /* key is userId */, number>
    >;
}

// function isHttpError(error: unknown): error is HttpError {
//     return (
//         typeof error === "object" &&
//         error !== null &&
//         "status" in error &&
//         typeof error.status === "number"
//     );
// }
//
interface OpinionMetadata {
    opinionId: number;
    opinionSlugId: string;
    opinionContentId: number;
}

async function importToAgora({
    axiosPolis,
    polisUserEmailDomain,
    polisUserEmailLocalPart,
    polisUserPassword,
    db,
    conversationTitle,
    conversationBody,
    users,
    conversationAuthor,
    comments,
    votesByCommentId,
}: ImportToAgoraProps) {
    await db.transaction(async (tx) => {
        // create users
        await tx
            .insert(userTable)
            .values([...Object.values(users), conversationAuthor]);
        await polisService.createUser({
            axiosPolis,
            polisUserEmailDomain,
            polisUserEmailLocalPart,
            polisUserPassword,
            userId: conversationAuthor.id,
        });
        for (const user of Object.values(users)) {
            await polisService.createUser({
                axiosPolis,
                polisUserEmailDomain,
                polisUserEmailLocalPart,
                polisUserPassword,
                userId: user.id,
            });
        }
        // create conversation
        const { conversationId, conversationSlugId, conversationContentId } =
            await conversationService.importNewPost({
                db: tx,
                conversationTitle,
                conversationBody,
                authorId: conversationAuthor.id,
                axiosPolis,
            });

        // create opinions
        const opinionMetadataByCommentIds: Record<string, OpinionMetadata> = {};
        for (const comment of Object.values(comments)) {
            const opinionMetadata = await opinionService.importNewOpinion({
                db: tx,
                commentId: comment["comment-id"],
                commentBody: comment["comment-body"],
                conversationSlugId,
                conversationId,
                conversationContentId,
                userId: users[comment["author-id"]].id,
                axiosPolis,
            });
            opinionMetadataByCommentIds[opinionMetadata.commentId] = {
                opinionSlugId: opinionMetadata.opinionSlugId,
                opinionId: opinionMetadata.opinionId,
                opinionContentId: opinionMetadata.opinionContentId,
            };
        }

        // create votes
        for (const [commentId, voteForCommentByUserId] of Object.entries(
            votesByCommentId,
        )) {
            for (const [userId, vote] of Object.entries(
                voteForCommentByUserId,
            )) {
                if (vote !== 0) {
                    await votingService.importNewVote({
                        db: tx,
                        conversationId,
                        conversationSlugId,
                        userId: users[userId].id,
                        externalUserId: userId,
                        externalCommentId: commentId,
                        opinionSlugId:
                            opinionMetadataByCommentIds[commentId]
                                .opinionSlugId,
                        opinionId:
                            opinionMetadataByCommentIds[commentId].opinionId,
                        opinionContentId:
                            opinionMetadataByCommentIds[commentId]
                                .opinionContentId,
                        votingAction: vote === -1 ? "agree" : "disagree", // in Polis, -1 = agree oO
                        axiosPolis,
                    });
                } else {
                    log.info(
                        `Ignoring pass for user ${userId} and comment ${commentId}`,
                    );
                }
            }
        }

        // get math
        await polisService.delayedPolisGetAndUpdateMath({
            db: tx,
            conversationId,
            conversationSlugId,
            axiosPolis,
            polisDelayToFetch: 0,
            awsAiLabelSummaryPromptArn: undefined, // too expensive to run it at every import..
            awsAiLabelSummaryPromptRegion: "",
        });
    });
    log.info("Import done");
    process.exit(0);
}
