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
import { httpErrors } from "@fastify/sensible";
import { log } from "@/app.js";
import { useCommonPost } from "@/service/common.js";

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
    voteFilePath: string;
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
    const voteFile = await fs.readFile(voteFilePath, "utf8");
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
            const trimmedConvBody = result[7][1].slice(0, 200);
            conversationBody = `${trimmedConvBody} <br />Imported from ${result[1][1]}`; // we limit to 260 chars

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
                        comments[result["comment-id"]] = result;
                        userIds.add(result["author-id"]);
                    }

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
                                        result["comment-id"] in votesByCommentId
                                    ) {
                                        votesByCommentId[result["comment-id"]][
                                            result["voter-id"]
                                        ] = result.vote;
                                    } else {
                                        votesByCommentId[result["comment-id"]] =
                                            {};
                                        votesByCommentId[result["comment-id"]][
                                            result["voter-id"]
                                        ] = result.vote;
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
        const { conversationSlugId } = await conversationService.createNewPost({
            db: tx,
            conversationTitle,
            conversationBody,
            authorId: conversationAuthor.id,
            pollingOptionList: null,
            axiosPolis,
        });
        const { getPostMetadataFromSlugId } = useCommonPost();
        const { id } = await getPostMetadataFromSlugId({
            db: tx,
            conversationSlugId,
        });

        // create opinions
        const opinionSlugIdByCommentIds: Record<string, string> = {};
        for (const comment of Object.values(comments)) {
            const response = await opinionService.postNewOpinion({
                db: tx,
                commentBody: comment["comment-body"],
                conversationSlugId,
                userId: users[comment["author-id"]].id,
                axiosPolis,
                polisDelayToFetch: -1,
                httpErrors: httpErrors,
            });
            if (!response.success) {
                throw new Error(
                    `Error while adding opinion to conversation: ${response.reason}`,
                );
            } else {
                opinionSlugIdByCommentIds[comment["comment-id"]] =
                    response.opinionSlugId;
            }
        }

        // create votes
        const votePromises = [];
        for (const [commentId, voteForCommentByUserId] of Object.entries(
            votesByCommentId,
        )) {
            for (const [userId, vote] of Object.entries(
                voteForCommentByUserId,
            )) {
                if (vote !== 0) {
                    log.info(
                        `Casting vote for user ${userId} and comment ${commentId}`,
                    );
                    votePromises.push(
                        votingService.castVoteForOpinionSlugId({
                            db: tx,
                            userId: users[userId].id,
                            opinionSlugId: opinionSlugIdByCommentIds[commentId],
                            votingAction: vote === -1 ? "agree" : "disagree", // in Polis, -1 = agree oO
                            axiosPolis,
                            polisDelayToFetch: -1,
                        }),
                    );
                } else {
                    log.info(
                        `Ignoring pass for user ${userId} and comment ${commentId}`,
                    );
                }
            }
        }
        await Promise.all(votePromises);

        // get math
        await polisService.delayedPolisGetAndUpdateMath({
            db: tx,
            conversationId: id,
            conversationSlugId,
            axiosPolis,
            polisDelayToFetch: 3000,
        });
    });
    log.info("Import done");
}
