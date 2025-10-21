/**
 * User action utilities for simulating realistic guest user behavior
 */

import { sleep } from "k6";
import {
    createOpinion,
    castVote,
    type CreateOpinionResponse,
    type VoteResponse,
} from "./api.js";

export interface UserActionConfig {
    did: string;
    prefixedKey: string;
    backendDid: string;
    userId: string; // Human-readable user identifier for logging
    numOpinionsToCreate: number;
    numVotesToCast: number;
    conversationSlugIds: string[]; // Can be single or multiple conversations
    opinionTexts: string[];
    votingOptions: ("agree" | "disagree" | "pass")[];
    minSleepBetweenActions: number;
    maxSleepBetweenActions: number;
    allAvailableOpinions: string[]; // Shared cache of all opinion slugs across all VUs
}

export interface UserActionResult {
    opinionsCreated: {
        slugId: string;
        conversationSlugId: string;
    }[];
    votedOpinions: Set<string>;
    metrics: {
        opinionsSucceeded: number;
        opinionsFailed: number;
        votesSucceeded: number;
        votesFailed: number;
    };
}

/**
 * Simulate realistic user behavior: interleave opinion creation and voting
 * Users don't do all opinions first then all votes - they mix both actions
 */
export async function performUserActions(
    config: UserActionConfig,
    onOpinionCreated: (result: CreateOpinionResponse) => void,
    onVoteCast: (
        result: VoteResponse & {
            targetOpinionSlugId?: string;
            userId?: string;
        },
    ) => void,
): Promise<UserActionResult> {
    const {
        did,
        prefixedKey,
        backendDid,
        userId,
        numOpinionsToCreate,
        numVotesToCast,
        conversationSlugIds,
        opinionTexts,
        votingOptions,
        minSleepBetweenActions,
        maxSleepBetweenActions,
        allAvailableOpinions,
    } = config;

    const opinionsCreated: {
        slugId: string;
        conversationSlugId: string;
    }[] = [];
    // Track opinions this user has voted on (including their own via auto-vote)
    const votedOpinions = new Set<string>();

    const metrics = {
        opinionsSucceeded: 0,
        opinionsFailed: 0,
        votesSucceeded: 0,
        votesFailed: 0,
    };

    let opinionsCreatedCount = 0;
    let votesCastCount = 0;

    const totalActions = numOpinionsToCreate + numVotesToCast;

    // Interleave opinion creation and voting
    for (let i = 0; i < totalActions; i++) {
        // If we've completed all required actions, stop
        if (
            opinionsCreatedCount >= numOpinionsToCreate &&
            votesCastCount >= numVotesToCast
        ) {
            console.log(
                `User ${userId} finished all its required actions, stopping`,
            );
            break;
        }

        // Calculate unvoted opinions fresh each iteration
        const unvotedOpinions = allAvailableOpinions.filter(
            (opinionSlugId) => !votedOpinions.has(opinionSlugId),
        );

        // Decide: create opinion or cast vote or pass?
        let shouldDoAction: "opinion" | "vote";

        // First check for creating opinions (we need opinion to vote on at the beginning)
        if (
            allAvailableOpinions.length < 30 &&
            opinionsCreatedCount < numOpinionsToCreate
        ) {
            shouldDoAction = "opinion";
        } else if (
            // else consider votes
            votesCastCount < numVotesToCast &&
            unvotedOpinions.length !== 0
        ) {
            // if user can also create opinions, use a random variable with bias towards voting
            if (
                opinionsCreatedCount < numOpinionsToCreate &&
                Math.random() > 0.7
            ) {
                shouldDoAction = "opinion";
            } else {
                shouldDoAction = "vote";
            }
        } else {
            console.log(
                `[2] User ${userId} finished all its required actions, stopping`,
            );
            break;
        }

        switch (shouldDoAction) {
            case "opinion": {
                // Create an opinion
                const conversationSlugId =
                    conversationSlugIds[
                        Math.floor(Math.random() * conversationSlugIds.length)
                    ];
                const opinionText =
                    opinionTexts[
                        Math.floor(Math.random() * opinionTexts.length)
                    ];

                const result = await createOpinion({
                    conversationSlugId,
                    opinionText,
                    did,
                    prefixedKey,
                    backendDid,
                });

                onOpinionCreated(result);

                if (result.success && result.opinionSlugId) {
                    opinionsCreated.push({
                        slugId: result.opinionSlugId,
                        conversationSlugId,
                    });
                    // User auto-votes on their own opinion, so mark it as voted
                    votedOpinions.add(result.opinionSlugId);
                    metrics.opinionsSucceeded++;
                } else {
                    metrics.opinionsFailed++;
                }

                opinionsCreatedCount++;
                break;
            }
            case "vote": {
                // Cast a vote on ANY unvoted opinion from the shared pool (created by any VU)

                // Randomly select from unvoted opinions
                const targetOpinionSlugId =
                    unvotedOpinions[
                        Math.floor(Math.random() * unvotedOpinions.length)
                    ];

                const votingAction =
                    votingOptions[
                        Math.floor(Math.random() * votingOptions.length)
                    ];

                const result = await castVote({
                    commentSlugId: targetOpinionSlugId,
                    votingAction,
                    did,
                    prefixedKey,
                    backendDid,
                });

                onVoteCast({ ...result, targetOpinionSlugId, userId });

                if (result.success) {
                    votedOpinions.add(targetOpinionSlugId);
                    metrics.votesSucceeded++;
                } else {
                    metrics.votesFailed++;
                }

                votesCastCount++;
                break;
            }
        }

        // Sleep between actions (simulates user thinking time)
        sleep(
            Math.random() * (maxSleepBetweenActions - minSleepBetweenActions) +
                minSleepBetweenActions,
        );
    }

    return {
        opinionsCreated,
        votedOpinions,
        metrics,
    };
}
