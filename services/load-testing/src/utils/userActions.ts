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
    priorityOpinionSlugs?: string[];
    minPriorityVotesToCast?: number;
    intermittentOpinionCreationProbability?: number; // Probability (0-1) of creating an opinion before a vote
    fetchMainPageProbability?: number; // Probability (0-1) of fetching main page during actions
    fetchConversationPageProbability?: number; // Probability (0-1) of fetching conversation page during actions
    votingPatternConfig: VotingPatternConfig;
}

export type VotingPattern = "random" | "clustered";

export interface VotingPatternConfig {
    pattern: VotingPattern;
    clusterCount: number;
    noiseRate: number;
    outlierRate: number;
}

type VotingAction = "agree" | "disagree" | "pass";

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

function stableHash(value: string): number {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index++) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function stableFraction(value: string): number {
    return stableHash(value) / 0x100000000;
}

function randomAllowedVotingAction(votingOptions: VotingAction[]): VotingAction {
    return votingOptions[Math.floor(Math.random() * votingOptions.length)];
}

function allowedVotingAction({
    preferredAction,
    votingOptions,
}: {
    preferredAction: VotingAction;
    votingOptions: VotingAction[];
}): VotingAction {
    if (votingOptions.includes(preferredAction)) {
        return preferredAction;
    }
    return randomAllowedVotingAction(votingOptions);
}

function invertVotingAction(action: VotingAction): VotingAction {
    if (action === "agree") {
        return "disagree";
    }
    if (action === "disagree") {
        return "agree";
    }
    return "pass";
}

function clusteredVotingAction({
    userId,
    opinionSlugId,
    votingOptions,
    votingPatternConfig,
}: {
    userId: string;
    opinionSlugId: string;
    votingOptions: VotingAction[];
    votingPatternConfig: VotingPatternConfig;
}): VotingAction {
    const clusterCount = Math.max(
        1,
        Math.floor(votingPatternConfig.clusterCount),
    );
    const userCluster = stableHash(`user:${userId}`) % clusterCount;
    const noiseRoll = stableFraction(`noise:${userId}:${opinionSlugId}`);
    if (noiseRoll < votingPatternConfig.noiseRate) {
        return randomAllowedVotingAction(votingOptions);
    }

    const opinionRoll = stableFraction(
        `opinion:${opinionSlugId}:cluster:${String(userCluster)}`,
    );
    const baseAction: VotingAction =
        opinionRoll < 0.45
            ? "agree"
            : opinionRoll < 0.55
              ? "pass"
              : "disagree";
    const outlierRoll = stableFraction(`outlier:${userId}`);
    const action =
        outlierRoll < votingPatternConfig.outlierRate
            ? invertVotingAction(baseAction)
            : baseAction;

    return allowedVotingAction({ preferredAction: action, votingOptions });
}

function chooseVotingAction({
    userId,
    opinionSlugId,
    votingOptions,
    votingPatternConfig,
}: {
    userId: string;
    opinionSlugId: string;
    votingOptions: VotingAction[];
    votingPatternConfig: VotingPatternConfig;
}): VotingAction {
    if (votingPatternConfig.pattern === "random") {
        return randomAllowedVotingAction(votingOptions);
    }

    return clusteredVotingAction({
        userId,
        opinionSlugId,
        votingOptions,
        votingPatternConfig,
    });
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
        priorityOpinionSlugs,
        minPriorityVotesToCast,
        intermittentOpinionCreationProbability,
        fetchMainPageProbability,
        fetchConversationPageProbability,
        votingPatternConfig,
    } = config;

    const opinionsCreated: {
        slugId: string;
        conversationSlugId: string;
    }[] = [];
    const votedOpinions = new Set(alreadyVotedOpinionSlugs ?? []);
    const availableOpinionSlugs = [...allAvailableOpinions];
    const priorityOpinionSlugSet = new Set(priorityOpinionSlugs ?? []);
    const priorityVoteTarget = minPriorityVotesToCast ?? 0;
    let priorityVotesSucceeded = 0;

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
        if (
            fetchMainPageProbability &&
            Math.random() < fetchMainPageProbability
        ) {
            console.log(
                `[${userId}] Fetching main page (during opinion creation)`,
            );
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

        if (
            fetchConversationPageProbability &&
            Math.random() < fetchConversationPageProbability
        ) {
            const conversationSlugId =
                conversationSlugIds[
                    Math.floor(Math.random() * conversationSlugIds.length)
                ];
            console.log(
                `[${userId}] Fetching conversation page (during opinion creation)`,
            );
            const conversationPageResult = fetchConversationPage({
                conversationSlugId,
            });
            metrics.conversationPageFetches++;
            metrics.totalConversationPageResponseTime +=
                conversationPageResult.responseTime;
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
            conversationSlugIds[
                Math.floor(Math.random() * conversationSlugIds.length)
            ];
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
        const shouldPrioritizeVotes =
            priorityVotesSucceeded < priorityVoteTarget;

        // Randomly fetch pages to simulate realistic browsing behavior
        if (
            !shouldPrioritizeVotes &&
            fetchMainPageProbability &&
            Math.random() < fetchMainPageProbability
        ) {
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

        if (
            !shouldPrioritizeVotes &&
            fetchConversationPageProbability &&
            Math.random() < fetchConversationPageProbability
        ) {
            const conversationSlugId =
                conversationSlugIds[
                    Math.floor(Math.random() * conversationSlugIds.length)
                ];
            console.log(
                `[${userId}] Fetching conversation page (during voting)`,
            );
            const conversationPageResult = fetchConversationPage({
                conversationSlugId,
            });
            metrics.conversationPageFetches++;
            metrics.totalConversationPageResponseTime +=
                conversationPageResult.responseTime;
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

        if (
            !shouldPrioritizeVotes &&
            intermittentOpinionCreationProbability &&
            Math.random() < intermittentOpinionCreationProbability
        ) {
            const conversationSlugId =
                conversationSlugIds[
                    Math.floor(Math.random() * conversationSlugIds.length)
                ];
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
            console.log(
                `User ${userId} has no more unvoted opinions (voted: ${String(votedOpinions.size)}/${String(availableOpinionSlugs.length)})`,
            );
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

        const priorityUnvotedOpinions = shouldPrioritizeVotes
            ? unvotedOpinions.filter((opinionSlugId) =>
                  priorityOpinionSlugSet.has(opinionSlugId),
              )
            : [];
        const targetOpinionPool =
            priorityUnvotedOpinions.length > 0
                ? priorityUnvotedOpinions
                : unvotedOpinions;

        // Randomly select an unvoted opinion, prioritizing the assigned conversation first.
        const targetOpinionSlugId =
            targetOpinionPool[
                Math.floor(Math.random() * targetOpinionPool.length)
            ];

        const votingAction = chooseVotingAction({
            userId,
            opinionSlugId: targetOpinionSlugId,
            votingOptions,
            votingPatternConfig,
        });

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
            if (priorityOpinionSlugSet.has(targetOpinionSlugId)) {
                priorityVotesSucceeded++;
            }
            metrics.votesSucceeded++;
        } else {
            metrics.votesFailed++;
        }

        votesAttempted++;
        sleep(sleepBetweenActions);
    }

    console.log(
        `User ${userId} finished (opinions: ${String(metrics.opinionsSucceeded)}/${String(numOpinionsToCreate)}, votes: ${String(metrics.votesSucceeded)}/${String(numVotesToCast)})`,
    );

    return {
        opinionsCreated,
        votedOpinions,
        metrics,
    };
}
