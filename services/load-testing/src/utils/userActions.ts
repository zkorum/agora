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
import { logLoadEvent } from "./semanticLog.js";

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
    allAvailableOpinions: string[];
    alreadyVotedOpinionSlugs?: string[];
    intermittentOpinionCreationProbability?: number; // Probability (0-1) of creating an opinion before a vote
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

interface PerformUserActionsParams {
    config: UserActionConfig;
    onOpinionCreated: (
        result: CreateOpinionResponse & {
            conversationSlugId?: string;
            userId?: string;
        },
    ) => void;
    onVoteCast: (
        result: VoteResponse & {
            targetOpinionSlugId?: string;
            userId?: string;
        },
    ) => void;
}

/**
 * Perform user actions: optionally create opinions, then cast votes while occasionally
 * creating more opinions to simulate active conversations.
 */
export async function performUserActions({
    config,
    onOpinionCreated,
    onVoteCast,
}: PerformUserActionsParams): Promise<UserActionResult> {
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
        alreadyVotedOpinionSlugs,
        intermittentOpinionCreationProbability,
        fetchMainPageProbability,
        fetchConversationPageProbability,
    } = config;

    const opinionsCreated: {
        slugId: string;
        conversationSlugId: string;
    }[] = [];
    const votedOpinions = new Set(alreadyVotedOpinionSlugs ?? []);
    const availableOpinionSlugs = [...allAvailableOpinions];

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
            const mainPageResult = fetchMainPage();
            metrics.mainPageFetches++;
            metrics.totalMainPageResponseTime += mainPageResult.responseTime;
            logLoadEvent({
                phase: "page_fetch",
                action: "fetch_main_page",
                outcome: mainPageResult.success ? "success" : "failure",
                userId,
                responseTimeMs: mainPageResult.responseTime,
                error: mainPageResult.error ?? undefined,
                metadata: { during: "opinion_creation" },
            });
        }

        if (fetchConversationPageProbability && Math.random() < fetchConversationPageProbability) {
            const conversationSlugId =
                conversationSlugIds[Math.floor(Math.random() * conversationSlugIds.length)];
            console.log(`[${userId}] Fetching conversation page (during opinion creation)`);
            const conversationPageResult = fetchConversationPage({
                conversationSlugId,
            });
            metrics.conversationPageFetches++;
            metrics.totalConversationPageResponseTime += conversationPageResult.responseTime;
            logLoadEvent({
                phase: "page_fetch",
                action: "fetch_conversation_page",
                outcome: conversationPageResult.success ? "success" : "failure",
                userId,
                conversationSlugId,
                responseTimeMs: conversationPageResult.responseTime,
                error: conversationPageResult.error ?? undefined,
                metadata: { during: "opinion_creation" },
            });
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

        onOpinionCreated({ ...result, conversationSlugId, userId });

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
            const mainPageResult = fetchMainPage();
            metrics.mainPageFetches++;
            metrics.totalMainPageResponseTime += mainPageResult.responseTime;
            logLoadEvent({
                phase: "page_fetch",
                action: "fetch_main_page",
                outcome: mainPageResult.success ? "success" : "failure",
                userId,
                responseTimeMs: mainPageResult.responseTime,
                error: mainPageResult.error ?? undefined,
                metadata: { during: "voting" },
            });
        }

        if (fetchConversationPageProbability && Math.random() < fetchConversationPageProbability) {
            const conversationSlugId =
                conversationSlugIds[Math.floor(Math.random() * conversationSlugIds.length)];
            console.log(`[${userId}] Fetching conversation page (during voting)`);
            const conversationPageResult = fetchConversationPage({
                conversationSlugId,
            });
            metrics.conversationPageFetches++;
            metrics.totalConversationPageResponseTime += conversationPageResult.responseTime;
            logLoadEvent({
                phase: "page_fetch",
                action: "fetch_conversation_page",
                outcome: conversationPageResult.success ? "success" : "failure",
                userId,
                conversationSlugId,
                responseTimeMs: conversationPageResult.responseTime,
                error: conversationPageResult.error ?? undefined,
                metadata: { during: "voting" },
            });
        }

        if (intermittentOpinionCreationProbability && Math.random() < intermittentOpinionCreationProbability) {
            const conversationSlugId =
                conversationSlugIds[Math.floor(Math.random() * conversationSlugIds.length)];
            const opinionText =
                opinionTexts[Math.floor(Math.random() * opinionTexts.length)];

            console.log(`[${userId}] Creating opinion during voting`);
            const opinionResult = await createOpinion({
                conversationSlugId,
                opinionText,
                did,
                prefixedKey,
                backendDid,
            });

            onOpinionCreated({ ...opinionResult, conversationSlugId, userId });

            if (opinionResult.success && opinionResult.opinionSlugId) {
                opinionsCreated.push({
                    slugId: opinionResult.opinionSlugId,
                    conversationSlugId,
                });
                availableOpinionSlugs.push(opinionResult.opinionSlugId);
                votedOpinions.add(opinionResult.opinionSlugId);
                metrics.opinionsSucceeded++;
            } else {
                metrics.opinionsFailed++;
            }

            sleep(sleepBetweenActions);
        }

        // Get unvoted opinions
        const unvotedOpinions = availableOpinionSlugs.filter(
            (opinionSlugId) => !votedOpinions.has(opinionSlugId),
        );

        if (unvotedOpinions.length === 0) {
            console.log(`User ${userId} has no more unvoted opinions (voted: ${String(votedOpinions.size)}/${String(availableOpinionSlugs.length)})`);
            logLoadEvent({
                phase: "user_action",
                action: "cast_vote",
                outcome: "skip",
                userId,
                metadata: {
                    reason: "no_unvoted_opinions",
                    votedOpinions: votedOpinions.size,
                    availableOpinions: availableOpinionSlugs.length,
                },
            });
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
