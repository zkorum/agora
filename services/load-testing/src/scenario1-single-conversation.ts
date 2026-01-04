/**
 * Scenario 1: Single Conversation Load Test (Simplified)
 *
 * Sequential test flow:
 * 1. First X users (OPINION_CREATOR_COUNT, default 50) each create 1 opinion
 * 2. Then these X users each vote on 50-100% of all opinions
 * 3. Finally Y additional users (ADDITIONAL_VOTERS, default 50) join and each vote on 50-100% of opinions
 *
 * Total participants: OPINION_CREATOR_COUNT + ADDITIONAL_VOTERS (default: 100)
 * Total opinions: OPINION_CREATOR_COUNT (default: 50)
 * Each user votes on: 50-100% of opinions
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
    deleteUser,
    fetchOpinions,
    fetchConversationPage,
    type CreateOpinionResponse,
    type VoteResponse,
    type DeleteUserResponse,
} from "./utils/api.js";
import { performUserActions } from "./utils/userActions.js";

// Configuration constants - Simple and configurable
const OPINION_CREATOR_COUNT = Number(__ENV.OPINION_CREATOR_COUNT) || 50; // Users who create opinions
const ADDITIONAL_VOTERS = Number(__ENV.ADDITIONAL_VOTERS) || 50; // Additional users who only vote
const TOTAL_USERS = OPINION_CREATOR_COUNT + ADDITIONAL_VOTERS;
const MIN_VOTE_PERCENTAGE = 0.5; // Each user votes on at least 50% of opinions
const MAX_VOTE_PERCENTAGE = 1.0; // Each user votes on at most 100% of opinions

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

// Track failure reasons for debugging
const opinionFailureReasons: Record<string, number> = {};

// Test configuration - Single VU scenario, each VU does everything sequentially
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
const CONVERSATION_SLUG_ID = __ENV.CONVERSATION_SLUG_ID || "";

if (!CONVERSATION_SLUG_ID) {
    throw new Error(
        "CONVERSATION_SLUG_ID environment variable is required. Example: k6 run -e CONVERSATION_SLUG_ID=abc123 dist/scenario1-single-conversation.js",
    );
}

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
        }
    }

    console.log(`=== Setup complete: ${String(TOTAL_USERS)} users ready ===`);
    return { users };
}

/**
 * Main test function - each VU executes this sequentially
 * First 50 VUs create opinions, all 100 VUs vote
 */
export default async function (data: SetupData) {
    const iterationIndex = execution.scenario.iterationInTest;
    const isOpinionCreator = iterationIndex < OPINION_CREATOR_COUNT;

    // Get user data from setup
    const user = data.users[iterationIndex];
    const { userId, did, prefixedKey, exportedKeys } = user;

    console.log(`[${userId}] Starting (iteration ${String(iterationIndex)})`);

    // Step 1: Import user credentials into this VU's keystore
    await importKeys(prefixedKey, exportedKeys);

    // Step 2: Fetch conversation page (simulates user landing on the frontend page)
    // This will trigger the frontend to make multiple API calls to the backend
    console.log(`[${userId}] Fetching conversation page...`);
    const conversationPageResult = fetchConversationPage({
        conversationSlugId: CONVERSATION_SLUG_ID,
    });

    conversationPageFetches.add(1);
    conversationPageResponseTime.add(conversationPageResult.responseTime);

    if (!conversationPageResult.success) {
        console.error(`[${userId}] Failed to fetch conversation page: ${String(conversationPageResult.error)}`);
    }

    sleep(1); // Brief pause after page load

    // Step 3: Opinion creators create 1 opinion
    let numOpinionsToCreate = 0;
    if (isOpinionCreator) {
        numOpinionsToCreate = 1;
        console.log(`[${userId}] Will create ${String(numOpinionsToCreate)} opinion`);
    }

    // Step 4: Wait for opinions to be created (voters wait longer than creators)
    const waitTime = isOpinionCreator ? 2 : INITIAL_WAIT_FOR_OPINIONS_SECONDS;
    console.log(`[${userId}] Waiting ${String(waitTime)}s for opinions to be created...`);
    sleep(waitTime);

    // Step 5: Fetch available opinions from API (both creators and voters need this)
    let fetchedOpinionSlugs: string[] = [];
    for (let attempt = 1; attempt <= OPINION_FETCH_RETRY_ATTEMPTS; attempt++) {
        console.log(`[${userId}] Fetching opinions (attempt ${String(attempt)}/${String(OPINION_FETCH_RETRY_ATTEMPTS)})...`);

        const fetchResult = fetchOpinions({
            conversationSlugId: CONVERSATION_SLUG_ID,
        });

        if (fetchResult.success) {
            fetchedOpinionSlugs = fetchResult.opinions.map(o => o.opinionSlugId);
            console.log(`[${userId}] Fetched ${String(fetchedOpinionSlugs.length)} opinions from API`);

            // Check if we have enough opinions (at least close to expected count)
            const expectedMinimum = isOpinionCreator ? 10 : OPINION_CREATOR_COUNT * 0.9;
            if (fetchedOpinionSlugs.length >= expectedMinimum) {
                console.log(`[${userId}] Got sufficient opinions (${String(fetchedOpinionSlugs.length)}/${String(OPINION_CREATOR_COUNT)})`);
                break;
            } else if (attempt < OPINION_FETCH_RETRY_ATTEMPTS) {
                console.log(`[${userId}] Only got ${String(fetchedOpinionSlugs.length)}/${String(OPINION_CREATOR_COUNT)} opinions, retrying in ${String(OPINION_FETCH_RETRY_DELAY)}s...`);
                sleep(OPINION_FETCH_RETRY_DELAY);
            }
        } else {
            console.error(`[${userId}] Failed to fetch opinions: ${String(fetchResult.error)}`);
            if (attempt < OPINION_FETCH_RETRY_ATTEMPTS) {
                sleep(OPINION_FETCH_RETRY_DELAY);
            }
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

    // Step 7: Perform actions (create opinion + vote)
    const userActionResult = await performUserActions(
        {
            did,
            prefixedKey,
            backendDid: BACKEND_DID,
            userId,
            numOpinionsToCreate,
            numVotesToCast,
            conversationSlugIds: [CONVERSATION_SLUG_ID],
            opinionTexts: opinionTexts as unknown as string[],
            votingOptions: VOTING_OPTIONS,
            sleepBetweenActions: SLEEP_BETWEEN_ACTIONS,
            allAvailableOpinions: fetchedOpinionSlugs,
            fetchMainPageProbability: MAIN_PAGE_FETCH_PROBABILITY,
            fetchConversationPageProbability: CONVERSATION_PAGE_FETCH_PROBABILITY,
        },
        (opinionResult: CreateOpinionResponse & { userId?: string }) => {
            if (opinionResult.success && opinionResult.opinionSlugId) {
                opinionsCreated.add(1);
                opinionSuccessRate.add(1);
                console.log(`[${userId}] Created opinion: ${opinionResult.opinionSlugId} (${String(opinionResult.responseTime)}ms)`);
            } else {
                opinionsFailed.add(1);
                opinionSuccessRate.add(0);
                const reason = opinionResult.reason ?? "Unknown error";
                console.error(`[${userId}] ❌ OPINION CREATION FAILED - Reason: ${reason} - Response time: ${String(opinionResult.responseTime)}ms`);

                // Track failure reason
                if (!opinionFailureReasons[reason]) {
                    opinionFailureReasons[reason] = 0;
                }
                opinionFailureReasons[reason]++;
            }
            opinionResponseTime.add(opinionResult.responseTime);
        },
        (voteResult: VoteResponse & { targetOpinionSlugId?: string; userId?: string }) => {
            if (voteResult.success) {
                votesSuccessful.add(1);
                voteSuccessRate.add(1);
                console.log(`[${userId}] Voted on opinion: ${String(voteResult.targetOpinionSlugId)}`);
            } else {
                votesFailed.add(1);
                voteSuccessRate.add(0);
                console.error(`[${userId}] Vote failed: ${String(voteResult.error)}`);
            }
            voteResponseTime.add(voteResult.responseTime);
        },
    );

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
}

/**
 * Teardown phase - clean up user accounts
 * Note: Opinions will be deleted automatically when the conversation is deleted
 * or can be cleaned up manually via the admin interface
 */
export async function teardown(data: SetupData) {
    console.log("=== Starting Teardown ===");
    console.log(`Deleting ${String(TOTAL_USERS)} users...`);

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

    // Print opinion failure summary
    const totalOpinionFailures = Object.values(opinionFailureReasons).reduce((a, b) => a + b, 0);
    console.log("\n=== Opinion Failure Summary ===");
    if (totalOpinionFailures > 0) {
        console.log(`Total failed opinions: ${String(totalOpinionFailures)}`);
        console.log("Failure reasons:");
        for (const [reason, count] of Object.entries(opinionFailureReasons)) {
            console.log(`  - ${reason}: ${String(count)} occurrence(s)`);
        }
    } else {
        console.log("No opinion failures detected (all opinions created successfully)");
    }

    console.log(
        `\nTo clean up the conversation, delete it via the admin interface or API`,
    );
    console.log("=== Teardown Complete ===");
}
