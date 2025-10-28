/**
 * User action utilities for simulating realistic guest user behavior
 */

import { sleep } from "k6";
import {
    createOpinion,
    castVote,
    fetchMainPage,
    fetchConversationPage,
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
    sleepBetweenActions: number;
    allAvailableOpinions: string[]; // Shared cache of all opinion slugs across all VUs
    fetchMainPageProbability?: number; // Probability (0-1) of fetching main page during actions
    fetchConversationPageProbability?: number; // Probability (0-1) of fetching conversation page during actions
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
        mainPageFetches: number;
        totalMainPageResponseTime: number;
        conversationPageFetches: number;
        totalConversationPageResponseTime: number;
    };
}

/**
 * Perform user actions: first create all opinions, then cast all votes
 * Simplified sequential approach
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
        sleepBetweenActions,
        allAvailableOpinions,
        fetchMainPageProbability,
        fetchConversationPageProbability,
    } = config;

    const opinionsCreated: {
        slugId: string;
        conversationSlugId: string;
    }[] = [];
    const votedOpinions = new Set<string>();

    const metrics = {
        opinionsSucceeded: 0,
        opinionsFailed: 0,
        votesSucceeded: 0,
        votesFailed: 0,
        mainPageFetches: 0,
        totalMainPageResponseTime: 0,
        conversationPageFetches: 0,
        totalConversationPageResponseTime: 0,
    };

    // Phase 1: Create all opinions first
    for (let i = 0; i < numOpinionsToCreate; i++) {
        // Randomly fetch pages to simulate realistic browsing behavior
        if (fetchMainPageProbability && Math.random() < fetchMainPageProbability) {
            console.log(`[${userId}] Fetching main page (during opinion creation)`);
            const mainPageResult = await fetchMainPage();
            metrics.mainPageFetches++;
            metrics.totalMainPageResponseTime += mainPageResult.responseTime;
        }

        if (fetchConversationPageProbability && Math.random() < fetchConversationPageProbability) {
            const conversationSlugId =
                conversationSlugIds[Math.floor(Math.random() * conversationSlugIds.length)];
            console.log(`[${userId}] Fetching conversation page (during opinion creation)`);
            const conversationPageResult = await fetchConversationPage({
                conversationSlugId,
            });
            metrics.conversationPageFetches++;
            metrics.totalConversationPageResponseTime += conversationPageResult.responseTime;
        }

        const conversationSlugId =
            conversationSlugIds[Math.floor(Math.random() * conversationSlugIds.length)];
        const opinionText =
            opinionTexts[Math.floor(Math.random() * opinionTexts.length)];

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
            // User auto-votes on their own opinion
            votedOpinions.add(result.opinionSlugId);
            metrics.opinionsSucceeded++;
        } else {
            metrics.opinionsFailed++;
        }

        sleep(sleepBetweenActions);
    }

    // Phase 2: Cast all votes
    let votesAttempted = 0;
    while (votesAttempted < numVotesToCast) {
        // Randomly fetch pages to simulate realistic browsing behavior
        if (fetchMainPageProbability && Math.random() < fetchMainPageProbability) {
            console.log(`[${userId}] Fetching main page (during voting)`);
            const mainPageResult = await fetchMainPage();
            metrics.mainPageFetches++;
            metrics.totalMainPageResponseTime += mainPageResult.responseTime;
        }

        if (fetchConversationPageProbability && Math.random() < fetchConversationPageProbability) {
            const conversationSlugId =
                conversationSlugIds[Math.floor(Math.random() * conversationSlugIds.length)];
            console.log(`[${userId}] Fetching conversation page (during voting)`);
            const conversationPageResult = await fetchConversationPage({
                conversationSlugId,
            });
            metrics.conversationPageFetches++;
            metrics.totalConversationPageResponseTime += conversationPageResult.responseTime;
        }

        // Get unvoted opinions
        const unvotedOpinions = allAvailableOpinions.filter(
            (opinionSlugId) => !votedOpinions.has(opinionSlugId),
        );

        if (unvotedOpinions.length === 0) {
            console.log(`User ${userId} has no more unvoted opinions (voted: ${String(votedOpinions.size)}/${String(allAvailableOpinions.length)})`);
            break;
        }

        // Randomly select an unvoted opinion
        const targetOpinionSlugId =
            unvotedOpinions[Math.floor(Math.random() * unvotedOpinions.length)];

        const votingAction =
            votingOptions[Math.floor(Math.random() * votingOptions.length)];

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

        votesAttempted++;
        sleep(sleepBetweenActions);
    }

    console.log(`User ${userId} finished (opinions: ${String(metrics.opinionsSucceeded)}/${String(numOpinionsToCreate)}, votes: ${String(metrics.votesSucceeded)}/${String(numVotesToCast)})`);

    return {
        opinionsCreated,
        votedOpinions,
        metrics,
    };
}
