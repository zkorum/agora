/**
 * Scenario 1: Conversation Voting Load Test
 *
 * Sequential test flow:
 * 1. First X users (OPINION_CREATOR_COUNT, default 50) each create 1 opinion
 *    distributed across one or more conversations
 * 2. Then these X users each vote on 50-100% of all fetched opinions
 * 3. Finally Y additional users (ADDITIONAL_VOTERS, default 50) join and each vote on 50-100% of opinions
 *
 * Total participants: OPINION_CREATOR_COUNT + ADDITIONAL_VOTERS (default: 100)
 * Initial opinions: OPINION_CREATOR_COUNT (default: 50)
 * Each user votes on: 50-100% of opinions across all configured conversations
 *
 * - Includes teardown phase to clean up user accounts
 */

// Polyfill for TextEncoder/TextDecoder (k6 doesn't provide these globally)
import "fast-text-encoding";

import { sleep } from "k6";
import { Counter, Trend, Rate } from "k6/metrics";
import { SharedArray } from "k6/data";
import execution from "k6/execution";
import { createDidIfDoesNotExist, exportKeys, importKeys, type ExportedKeys } from "./crypto/ucan/operation.js";
import {
    createOpinion,
    deleteUser,
    fetchOpinions,
    fetchConversationPage,
    type CreateOpinionResponse,
    type VoteResponse,
    type DeleteUserResponse,
} from "./utils/api.js";
import { logLoadEvent } from "./utils/semanticLog.js";
import { performUserActions } from "./utils/userActions.js";

// Configuration constants - Simple and configurable
const OPINION_CREATOR_COUNT = Number(__ENV.OPINION_CREATOR_COUNT) || 50; // Users who create opinions
const ADDITIONAL_VOTERS = Number(__ENV.ADDITIONAL_VOTERS) || 50; // Additional users who only vote
const TOTAL_USERS = OPINION_CREATOR_COUNT + ADDITIONAL_VOTERS;
const MIN_VOTE_PERCENTAGE = 0.5; // Each user votes on at least 50% of opinions
const MAX_VOTE_PERCENTAGE = 1.0; // Each user votes on at most 100% of opinions
const INTERMITTENT_OPINION_CREATION_PROBABILITY = Number(__ENV.INTERMITTENT_OPINION_CREATION_PROBABILITY) || 0.1;

// Sleep timing configuration (in seconds)
const SLEEP_BETWEEN_ACTIONS = 0.5;
const INITIAL_WAIT_FOR_OPINIONS_SECONDS = 10; // Initial wait for opinion creators to finish
const OPINION_FETCH_RETRY_ATTEMPTS = 5; // Number of times to retry fetching opinions
const OPINION_FETCH_RETRY_DELAY = 2; // Seconds between fetch retries

// Page fetching configuration
const MAIN_PAGE_FETCH_PROBABILITY = Number(__ENV.MAIN_PAGE_FETCH_PROBABILITY) || 0.1; // 10% chance to fetch main page during actions
const CONVERSATION_PAGE_FETCH_PROBABILITY = Number(__ENV.CONVERSATION_PAGE_FETCH_PROBABILITY) || 0.15; // 15% chance to fetch conversation page during actions (higher because users refresh to see updates)

// Cleanup configuration
const CLEANUP_BATCH_PAUSE_SIZE = 50; // Pause after this many deletions
const CLEANUP_BATCH_PAUSE_DURATION = 1.0; // Seconds to pause

// Custom metrics
const opinionsCreated = new Counter("opinions_created");
const opinionsFailed = new Counter("opinions_failed");
const votesSuccessful = new Counter("votes_successful");
const votesFailed = new Counter("votes_failed");
const usersDeleted = new Counter("users_deleted");
const conversationPageFetches = new Counter("conversation_page_fetches");
const mainPageFetches = new Counter("main_page_fetches");
const opinionResponseTime = new Trend("opinion_response_time");
const voteResponseTime = new Trend("vote_response_time");
const deleteResponseTime = new Trend("delete_response_time");
const conversationPageResponseTime = new Trend("conversation_page_response_time");
const mainPageResponseTime = new Trend("main_page_response_time");
const opinionSuccessRate = new Rate("opinion_success_rate");
const voteSuccessRate = new Rate("vote_success_rate");

// Test configuration - each VU executes one user flow.
export const options = {
    scenarios: {
        sequential_users: {
            executor: "shared-iterations",
            vus: TOTAL_USERS,
            iterations: TOTAL_USERS,
            maxDuration: "30m",
        },
    },
    thresholds: {
        opinion_success_rate: ["rate>0.95"],
        vote_success_rate: ["rate>0.95"],
        opinion_response_time: ["p(95)<5000"],
        vote_response_time: ["p(95)<5000"],
        http_req_failed: ["rate<0.05"],
    },
    teardownTimeout: "10m",
};

// Environment variables (set these before running the test)
const CONVERSATION_SLUG_IDS_STR = __ENV.CONVERSATION_SLUG_IDS || __ENV.CONVERSATION_SLUG_ID || "";

if (!CONVERSATION_SLUG_IDS_STR) {
    throw new Error(
        "CONVERSATION_SLUG_IDS environment variable is required. Example: k6 run -e CONVERSATION_SLUG_IDS=abc123,def456 dist/scenario1-single-conversation.cjs",
    );
}

const CONVERSATION_SLUG_IDS = CONVERSATION_SLUG_IDS_STR.split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);

if (CONVERSATION_SLUG_IDS.length === 0) {
    throw new Error("At least one conversation slug ID is required");
}

console.log(
    `Testing with ${String(CONVERSATION_SLUG_IDS.length)} conversation(s): ${CONVERSATION_SLUG_IDS.join(", ")}`,
);
logLoadEvent({
    phase: "configuration",
    action: "scenario_configured",
    outcome: "info",
    count: CONVERSATION_SLUG_IDS.length,
    metadata: {
        opinionCreatorCount: OPINION_CREATOR_COUNT,
        additionalVoters: ADDITIONAL_VOTERS,
        totalUsers: TOTAL_USERS,
    },
});

// Sample opinion texts for variety
const opinionTexts = new SharedArray("opinion_texts", function () {
    return [
        "I think this is a great proposal that benefits everyone.",
        "We should consider the environmental impact before proceeding.",
        "The budget allocation seems reasonable for this project.",
        "I have concerns about the timeline being too aggressive.",
        "This aligns well with our community values and goals.",
        "We need more data before making such an important decision.",
        "I support this initiative but with some modifications.",
        "The implementation plan needs more detail and clarity.",
        "This could set a positive precedent for future projects.",
        "I appreciate the thorough research that went into this.",
        "The economic implications need further consideration.",
        "This addresses a critical need in our community.",
        "I would like to see more stakeholder input first.",
        "The proposed solution seems both practical and effective.",
        "We should evaluate alternative approaches as well.",
    ];
});

// Voting options (users vote once per opinion, can't change their vote)
const VOTING_OPTIONS: ("agree" | "disagree" | "pass")[] = [
    "agree",
    "disagree",
    "pass",
];

// Backend DID from environment variable
// Default to localhost for local development
const BACKEND_DID = __ENV.BACKEND_DID || "did:web:localhost%3A8084";

interface UserData {
    userId: string;
    did: string;
    prefixedKey: string;
    exportedKeys: ExportedKeys;
}

interface SetupData {
    users: UserData[];
}

/**
 * Setup function - generates all user keypairs and exports them
 * This runs once before the test starts and shares data with default() and teardown()
 */
export async function setup(): Promise<SetupData> {
    console.log("=== Setup: Generating keypairs for all users ===");
    logLoadEvent({
        phase: "setup",
        action: "generate_keypairs",
        outcome: "start",
        count: TOTAL_USERS,
    });
    const users: UserData[] = [];

    for (let i = 0; i < TOTAL_USERS; i++) {
        const userId = i < OPINION_CREATOR_COUNT
            ? `creator-${String(i)}`
            : `voter-${String(i - OPINION_CREATOR_COUNT)}`;

        // Generate keypair
        const { did, prefixedKey } = await createDidIfDoesNotExist(userId);

        // Export keys so they can be shared with VUs and teardown
        const exportedKeys = await exportKeys(prefixedKey);

        users.push({ userId, did, prefixedKey, exportedKeys });

        if ((i + 1) % 10 === 0) {
            console.log(`Generated ${String(i + 1)}/${String(TOTAL_USERS)} users`);
            logLoadEvent({
                phase: "setup",
                action: "generate_keypairs",
                outcome: "info",
                count: i + 1,
                metadata: { totalUsers: TOTAL_USERS },
            });
        }
    }

    console.log(`=== Setup complete: ${String(TOTAL_USERS)} users ready ===`);
    logLoadEvent({
        phase: "setup",
        action: "generate_keypairs",
        outcome: "complete",
        count: TOTAL_USERS,
    });
    return { users };
}

/**
 * Main test function - each VU executes this sequentially
 * First 50 VUs create opinions, all 100 VUs vote
 */
export default async function (data: SetupData) {
    const iterationIndex = execution.scenario.iterationInTest;
    const isOpinionCreator = iterationIndex < OPINION_CREATOR_COUNT;
    const assignedConversationSlugId = CONVERSATION_SLUG_IDS[iterationIndex % CONVERSATION_SLUG_IDS.length];

    // Get user data from setup
    const user = data.users[iterationIndex];
    const { userId, did, prefixedKey, exportedKeys } = user;

    console.log(`[${userId}] Starting (iteration ${String(iterationIndex)})`);
    logLoadEvent({
        phase: "user_flow",
        action: "start_user",
        outcome: "start",
        userId,
        iterationIndex,
        conversationSlugId: assignedConversationSlugId,
    });

    // Step 1: Import user credentials into this VU's keystore
    await importKeys(prefixedKey, exportedKeys);

    // Step 2: Fetch conversation page (simulates user landing on the frontend page)
    // This will trigger the frontend to make multiple API calls to the backend
    console.log(`[${userId}] Fetching conversation page...`);
    const conversationPageResult = fetchConversationPage({
        conversationSlugId: assignedConversationSlugId,
    });

    conversationPageFetches.add(1);
    conversationPageResponseTime.add(conversationPageResult.responseTime);

    if (!conversationPageResult.success) {
        console.error(`[${userId}] Failed to fetch conversation page: ${String(conversationPageResult.error)}`);
        logLoadEvent({
            phase: "page_fetch",
            action: "fetch_conversation_page",
            outcome: "failure",
            userId,
            iterationIndex,
            conversationSlugId: assignedConversationSlugId,
            responseTimeMs: conversationPageResult.responseTime,
            error: String(conversationPageResult.error),
        });
    } else {
        logLoadEvent({
            phase: "page_fetch",
            action: "fetch_conversation_page",
            outcome: "success",
            userId,
            iterationIndex,
            conversationSlugId: assignedConversationSlugId,
            responseTimeMs: conversationPageResult.responseTime,
        });
    }

    sleep(1); // Brief pause after page load

    // Step 3: Opinion creators create 1 opinion before everyone fetches and votes
    let initialCreatedOpinionSlug: string | undefined;
    if (isOpinionCreator) {
        const opinionText = opinionTexts[iterationIndex % opinionTexts.length];
        console.log(`[${userId}] Creating opinion in ${assignedConversationSlugId}`);

        const opinionResult = await createOpinion({
            conversationSlugId: assignedConversationSlugId,
            opinionText,
            did,
            prefixedKey,
            backendDid: BACKEND_DID,
        });

        if (opinionResult.success && opinionResult.opinionSlugId) {
            initialCreatedOpinionSlug = opinionResult.opinionSlugId;
            opinionsCreated.add(1);
            opinionSuccessRate.add(1);
            console.log(`[${userId}] Created opinion: ${opinionResult.opinionSlugId} (${String(opinionResult.responseTime)}ms)`);
            logLoadEvent({
                phase: "initial_opinion",
                action: "create_opinion",
                outcome: "success",
                userId,
                iterationIndex,
                conversationSlugId: assignedConversationSlugId,
                opinionSlugId: opinionResult.opinionSlugId,
                responseTimeMs: opinionResult.responseTime,
            });
        } else {
            opinionsFailed.add(1);
            opinionSuccessRate.add(0);
            const reason = opinionResult.reason ?? "Unknown error";
            console.error(`[${userId}] OPINION CREATION FAILED - Reason: ${reason} - Response time: ${String(opinionResult.responseTime)}ms`);
            logLoadEvent({
                phase: "initial_opinion",
                action: "create_opinion",
                outcome: "failure",
                userId,
                iterationIndex,
                conversationSlugId: assignedConversationSlugId,
                responseTimeMs: opinionResult.responseTime,
                error: reason,
            });
        }

        opinionResponseTime.add(opinionResult.responseTime);
    }

    // Step 4: Wait for opinions to be visible before fetching and voting
    console.log(`[${userId}] Waiting ${String(INITIAL_WAIT_FOR_OPINIONS_SECONDS)}s for opinions to be created...`);
    sleep(INITIAL_WAIT_FOR_OPINIONS_SECONDS);

    // Step 5: Fetch available opinions from every configured conversation
    let fetchedOpinionSlugs: string[] = [];
    for (let attempt = 1; attempt <= OPINION_FETCH_RETRY_ATTEMPTS; attempt++) {
        console.log(`[${userId}] Fetching opinions (attempt ${String(attempt)}/${String(OPINION_FETCH_RETRY_ATTEMPTS)})...`);

        const fetchedOpinionSlugSet = new Set<string>();
        let fetchFailed = false;

        for (const conversationSlugId of CONVERSATION_SLUG_IDS) {
            const fetchResult = fetchOpinions({
                conversationSlugId,
            });

            if (fetchResult.success) {
                for (const opinion of fetchResult.opinions) {
                    fetchedOpinionSlugSet.add(opinion.opinionSlugId);
                }
            } else {
                fetchFailed = true;
                console.error(`[${userId}] Failed to fetch opinions for ${conversationSlugId}: ${String(fetchResult.error)}`);
                logLoadEvent({
                    phase: "opinion_fetch",
                    action: "fetch_opinions",
                    outcome: "failure",
                    userId,
                    iterationIndex,
                    conversationSlugId,
                    error: String(fetchResult.error),
                    metadata: { attempt },
                });
            }
        }

        fetchedOpinionSlugs = Array.from(fetchedOpinionSlugSet);
        console.log(`[${userId}] Fetched ${String(fetchedOpinionSlugs.length)} opinions from ${String(CONVERSATION_SLUG_IDS.length)} conversation(s)`);
        logLoadEvent({
            phase: "opinion_fetch",
            action: "fetch_opinions",
            outcome: fetchFailed ? "failure" : "success",
            userId,
            iterationIndex,
            count: fetchedOpinionSlugs.length,
            metadata: { attempt, conversationCount: CONVERSATION_SLUG_IDS.length },
        });

        const expectedMinimum = OPINION_CREATOR_COUNT * 0.9;
        if (!fetchFailed && fetchedOpinionSlugs.length >= expectedMinimum) {
            console.log(`[${userId}] Got sufficient opinions (${String(fetchedOpinionSlugs.length)}/${String(OPINION_CREATOR_COUNT)})`);
            break;
        }

        if (attempt < OPINION_FETCH_RETRY_ATTEMPTS) {
            console.log(`[${userId}] Only got ${String(fetchedOpinionSlugs.length)}/${String(OPINION_CREATOR_COUNT)} expected opinions, retrying in ${String(OPINION_FETCH_RETRY_DELAY)}s...`);
            sleep(OPINION_FETCH_RETRY_DELAY);
        }
    }

    // Step 6: Calculate how many votes to cast
    const availableOpinions = fetchedOpinionSlugs.length;
    const minVotes = Math.floor(availableOpinions * MIN_VOTE_PERCENTAGE);
    const maxVotes = Math.floor(availableOpinions * MAX_VOTE_PERCENTAGE);
    const numVotesToCast = availableOpinions > 0
        ? Math.floor(Math.random() * (maxVotes - minVotes + 1)) + minVotes
        : 0;

    console.log(`[${userId}] Will vote on ${String(numVotesToCast)} opinions (${String(availableOpinions)} available)`);
    logLoadEvent({
        phase: "vote_plan",
        action: "plan_votes",
        outcome: "info",
        userId,
        iterationIndex,
        count: numVotesToCast,
        metadata: { availableOpinions },
    });

    // Step 7: Perform voting actions. Opinion creators already created the initial batch.
    const userActionResult = await performUserActions({
        config: {
            did,
            prefixedKey,
            backendDid: BACKEND_DID,
            userId,
            numOpinionsToCreate: 0,
            numVotesToCast,
            conversationSlugIds: CONVERSATION_SLUG_IDS,
            opinionTexts,
            votingOptions: VOTING_OPTIONS,
            sleepBetweenActions: SLEEP_BETWEEN_ACTIONS,
            allAvailableOpinions: fetchedOpinionSlugs,
            alreadyVotedOpinionSlugs: initialCreatedOpinionSlug ? [initialCreatedOpinionSlug] : [],
            intermittentOpinionCreationProbability: INTERMITTENT_OPINION_CREATION_PROBABILITY,
            fetchMainPageProbability: MAIN_PAGE_FETCH_PROBABILITY,
            fetchConversationPageProbability: CONVERSATION_PAGE_FETCH_PROBABILITY,
        },
        onOpinionCreated: (
            opinionResult: CreateOpinionResponse & {
                conversationSlugId?: string;
                userId?: string;
            },
        ) => {
            if (opinionResult.success && opinionResult.opinionSlugId) {
                opinionsCreated.add(1);
                opinionSuccessRate.add(1);
                console.log(`[${userId}] Created opinion: ${opinionResult.opinionSlugId} (${String(opinionResult.responseTime)}ms)`);
                logLoadEvent({
                    phase: "user_action",
                    action: "create_opinion",
                    outcome: "success",
                    userId,
                    iterationIndex,
                    conversationSlugId: opinionResult.conversationSlugId,
                    opinionSlugId: opinionResult.opinionSlugId,
                    responseTimeMs: opinionResult.responseTime,
                });
            } else {
                opinionsFailed.add(1);
                opinionSuccessRate.add(0);
                const reason = opinionResult.reason ?? "Unknown error";
                console.error(`[${userId}] OPINION CREATION FAILED - Reason: ${reason} - Response time: ${String(opinionResult.responseTime)}ms`);
                logLoadEvent({
                    phase: "user_action",
                    action: "create_opinion",
                    outcome: "failure",
                    userId,
                    iterationIndex,
                    conversationSlugId: opinionResult.conversationSlugId,
                    responseTimeMs: opinionResult.responseTime,
                    error: reason,
                });

            }
            opinionResponseTime.add(opinionResult.responseTime);
        },
        onVoteCast: (voteResult: VoteResponse & { targetOpinionSlugId?: string; userId?: string }) => {
            if (voteResult.success) {
                votesSuccessful.add(1);
                voteSuccessRate.add(1);
                console.log(`[${userId}] Voted on opinion: ${String(voteResult.targetOpinionSlugId)}`);
                logLoadEvent({
                    phase: "user_action",
                    action: "cast_vote",
                    outcome: "success",
                    userId,
                    iterationIndex,
                    opinionSlugId: voteResult.targetOpinionSlugId,
                    responseTimeMs: voteResult.responseTime,
                });
            } else {
                votesFailed.add(1);
                voteSuccessRate.add(0);
                console.error(`[${userId}] Vote failed: ${String(voteResult.error)}`);
                logLoadEvent({
                    phase: "user_action",
                    action: "cast_vote",
                    outcome: "failure",
                    userId,
                    iterationIndex,
                    opinionSlugId: voteResult.targetOpinionSlugId,
                    responseTimeMs: voteResult.responseTime,
                    error: String(voteResult.error),
                });
            }
            voteResponseTime.add(voteResult.responseTime);
        },
    });

    // Track page fetch metrics
    if (userActionResult.metrics.mainPageFetches > 0) {
        mainPageFetches.add(userActionResult.metrics.mainPageFetches);
        for (let i = 0; i < userActionResult.metrics.mainPageFetches; i++) {
            mainPageResponseTime.add(
                userActionResult.metrics.totalMainPageResponseTime / userActionResult.metrics.mainPageFetches
            );
        }
    }

    if (userActionResult.metrics.conversationPageFetches > 0) {
        conversationPageFetches.add(userActionResult.metrics.conversationPageFetches);
        for (let i = 0; i < userActionResult.metrics.conversationPageFetches; i++) {
            conversationPageResponseTime.add(
                userActionResult.metrics.totalConversationPageResponseTime / userActionResult.metrics.conversationPageFetches
            );
        }
    }

    console.log(`[${userId}] Completed`);
    logLoadEvent({
        phase: "user_flow",
        action: "complete_user",
        outcome: "complete",
        userId,
        iterationIndex,
        metadata: {
            opinionsSucceeded: userActionResult.metrics.opinionsSucceeded,
            opinionsFailed: userActionResult.metrics.opinionsFailed,
            votesSucceeded: userActionResult.metrics.votesSucceeded,
            votesFailed: userActionResult.metrics.votesFailed,
        },
    });
}

/**
 * Teardown phase - clean up user accounts
 * Note: Opinions will be deleted automatically when the conversation is deleted
 * or can be cleaned up manually via the admin interface
 */
export async function teardown(data: SetupData) {
    console.log("=== Starting Teardown ===");
    console.log(`Deleting ${String(TOTAL_USERS)} users...`);
    logLoadEvent({
        phase: "teardown",
        action: "delete_users",
        outcome: "start",
        count: TOTAL_USERS,
    });

    // Delete all user accounts
    let usersDeletedCount = 0;
    let usersFailedCount = 0;

    console.log("Deleting user accounts...");
    for (const user of data.users) {
        // Import keys into teardown's keystore so we can sign the deletion request
        await importKeys(user.prefixedKey, user.exportedKeys);

        const result: DeleteUserResponse = await deleteUser({
            did: user.did,
            prefixedKey: user.prefixedKey,
            backendDid: BACKEND_DID,
        });

        if (result.success) {
            usersDeletedCount++;
            usersDeleted.add(1);
        } else {
            usersFailedCount++;
            const errorMessage: string = result.error ?? "Unknown error";
            console.error(
                `Failed to delete user ${user.did}: ${errorMessage}`,
            );
            logLoadEvent({
                phase: "teardown",
                action: "delete_user",
                outcome: "failure",
                userId: user.userId,
                responseTimeMs: result.responseTime,
                error: errorMessage,
            });
        }

        deleteResponseTime.add(result.responseTime);

        // Small delay to avoid overwhelming the server during cleanup
        if (usersDeletedCount % CLEANUP_BATCH_PAUSE_SIZE === 0) {
            sleep(CLEANUP_BATCH_PAUSE_DURATION);
        }
    }

    console.log(
        `Users: ${String(usersDeletedCount)} deleted, ${String(usersFailedCount)} failed`,
    );
    logLoadEvent({
        phase: "teardown",
        action: "delete_users",
        outcome: "complete",
        count: usersDeletedCount,
        metadata: { usersFailedCount },
    });

    console.log(
        `\nTo clean up the conversation(s), delete them via the admin interface or API`,
    );
    console.log("=== Teardown Complete ===");
}
