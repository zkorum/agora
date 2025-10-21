/**
 * Scenario 2: Multiple Conversations Heavy Voting Stress Test
 *
 * This scenario tests MULTIPLE conversations with:
 * - MANY guest users (each with unique DID) operating IN PARALLEL
 * - Users CREATE opinions and VOTE simultaneously (interleaved, not sequential phases)
 * - Each user creates opinions and votes across different conversations
 * - Users operate independently and concurrently (k6 VUs run in parallel)
 * - Sleep delays are per-user to simulate human behavior (thinking time between actions)
 * - Tests heavy load across multiple conversations to identify:
 *   - Database contention across different conversation contexts
 *   - Transaction throughput limits with distributed load
 *   - Cross-conversation locking and scalability issues
 * - Includes teardown phase to clean up created data (deletes opinions and user accounts)
 */

// Polyfill for TextEncoder/TextDecoder (k6 doesn't provide these globally)
import "fast-text-encoding";

import { sleep } from "k6";
import { Counter, Trend, Rate } from "k6/metrics";
import { SharedArray } from "k6/data";
import { createDidIfDoesNotExist } from "./crypto/ucan/operation.js";
import {
    deleteOpinion,
    deleteUser,
    type CreateOpinionResponse,
    type VoteResponse,
    type DeleteOpinionResponse,
    type DeleteUserResponse,
} from "./utils/api.js";
import { performUserActions } from "./utils/userActions.js";

// Configuration constants
const MIN_OPINIONS_PER_USER = 5;
const MAX_OPINIONS_PER_USER = 10;
const MIN_VOTES_PER_USER = 5;
const MAX_VOTES_PER_USER = 15;

// Sleep timing configuration (in seconds)
// These delays are PER USER to simulate human thinking time
// Multiple users operate in parallel (k6 VUs are concurrent)
const MIN_SLEEP_BETWEEN_OPINIONS = 0.5;
const MAX_SLEEP_BETWEEN_VOTES = 2.0;
const MIN_SLEEP_AFTER_USER_ACTIONS = 1.0;
const MAX_SLEEP_AFTER_USER_ACTIONS = 4.0;

// Cleanup configuration
const CLEANUP_BATCH_PAUSE_SIZE = 50; // Pause after this many deletions
const CLEANUP_BATCH_PAUSE_DURATION = 1.0; // Seconds to pause

// Vote finding configuration
const MAX_VOTE_TARGET_FIND_ATTEMPTS = 10;

// Custom metrics
const opinionsCreated = new Counter("opinions_created");
const opinionsFailed = new Counter("opinions_failed");
const votesSuccessful = new Counter("votes_successful");
const votesFailed = new Counter("votes_failed");
const opinionsDeleted = new Counter("opinions_deleted");
const usersDeleted = new Counter("users_deleted");
const opinionResponseTime = new Trend("opinion_response_time");
const voteResponseTime = new Trend("vote_response_time");
const deleteResponseTime = new Trend("delete_response_time");
const opinionSuccessRate = new Rate("opinion_success_rate");
const voteSuccessRate = new Rate("vote_success_rate");

// Test configuration
export const options = {
    stages: [
        { duration: "2m", target: 50 }, // Ramp up to 50 concurrent users
        { duration: "5m", target: 200 }, // Ramp up to 200 concurrent users
        { duration: "10m", target: 200 }, // Stay at 200 concurrent users
        { duration: "3m", target: 0 }, // Ramp down
    ],
    thresholds: {
        opinion_success_rate: ["rate>0.95"], // 95% success rate for opinion creation
        vote_success_rate: ["rate>0.95"], // 95% success rate for voting
        opinion_response_time: ["p(95)<5000"], // 95% under 5s
        vote_response_time: ["p(95)<5000"], // 95% under 5s
        http_req_failed: ["rate<0.05"], // Less than 5% failed requests
    },
    // Enable teardown for cleanup
    setupTimeout: "60s",
    teardownTimeout: "10m",
};

// Environment variables (set these before running the test)
// Comma-separated list of conversation slug IDs
const CONVERSATION_SLUG_IDS_STR = __ENV.CONVERSATION_SLUG_IDS || "";

if (!CONVERSATION_SLUG_IDS_STR) {
    throw new Error(
        "CONVERSATION_SLUG_IDS environment variable is required. Example: k6 run -e CONVERSATION_SLUG_IDS=abc123,def456,ghi789 dist/scenario2-multiple-conversations.js",
    );
}

// Parse conversation IDs
const CONVERSATION_SLUG_IDS = CONVERSATION_SLUG_IDS_STR.split(",").map((id) =>
    id.trim(),
);

if (CONVERSATION_SLUG_IDS.length < 2) {
    throw new Error(
        `At least 2 conversation IDs are required for multiple conversations test. Got: ${CONVERSATION_SLUG_IDS.length}`,
    );
}

console.log(
    `Testing with ${CONVERSATION_SLUG_IDS.length} conversations: ${CONVERSATION_SLUG_IDS.join(", ")}`,
);

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
const VOTING_OPTIONS: Array<"agree" | "disagree" | "pass"> = [
    "agree",
    "disagree",
    "pass",
];

// Shared arrays to store created data for cleanup
const createdOpinions: Array<{
    slugId: string;
    conversationSlugId: string;
    did: string;
    prefixedKey: string;
}> = [];

const createdUsers: Array<{
    did: string;
    prefixedKey: string;
}> = [];

// Backend DID from environment variable
// Default to localhost for local development
const BACKEND_DID = __ENV.BACKEND_DID || "did:web:localhost%3A8084";

/**
 * Main test function - executed by each VU (Virtual User) in parallel
 * Each VU represents one guest user performing actions across multiple conversations
 */
export default async function () {
    // Each VU (virtual user) represents a unique guest user
    // Generate a unique keypair for this guest user with a unique ID
    // Use VU ID + iteration to ensure uniqueness across all virtual users
    const uniqueUserId = `vu${String(__VU)}-iter${String(__ITER)}`;
    const { did, prefixedKey } = await createDidIfDoesNotExist(uniqueUserId);

    // Track this user for cleanup
    createdUsers.push({ did, prefixedKey });

    // Determine actions for this user
    const numOpinionsToCreate =
        Math.floor(
            Math.random() * (MAX_OPINIONS_PER_USER - MIN_OPINIONS_PER_USER + 1),
        ) + MIN_OPINIONS_PER_USER;
    const numVotesToCast =
        Math.floor(
            Math.random() * (MAX_VOTES_PER_USER - MIN_VOTES_PER_USER + 1),
        ) + MIN_VOTES_PER_USER;

    // Perform user actions (interleaved opinion creation and voting across conversations)
    const result = await performUserActions(
        {
            did,
            prefixedKey,
            backendDid: BACKEND_DID,
            userId: uniqueUserId,
            numOpinionsToCreate,
            numVotesToCast,
            conversationSlugIds: CONVERSATION_SLUG_IDS,
            opinionTexts: opinionTexts as unknown as string[],
            votingOptions: VOTING_OPTIONS,
            minSleepBetweenActions: MIN_SLEEP_BETWEEN_OPINIONS,
            maxSleepBetweenActions: MAX_SLEEP_BETWEEN_VOTES,
            allAvailableOpinions: [], // TODO: scenario2 needs shared opinion pool implementation
        },
        (opinionResult: CreateOpinionResponse & { userId?: string }) => {
            // Callback for opinion creation
            if (opinionResult.success && opinionResult.opinionSlugId) {
                opinionsCreated.add(1);
                opinionSuccessRate.add(1);
                // We need to track conversationSlugId for each opinion
                // This requires updating the result structure from performUserActions
                createdOpinions.push({
                    slugId: opinionResult.opinionSlugId,
                    conversationSlugId: "", // Will be filled by the utility
                    did,
                    prefixedKey,
                });
                console.log(`User ${String(uniqueUserId)} created opinion: ${opinionResult.opinionSlugId}`);
            } else {
                opinionsFailed.add(1);
                opinionSuccessRate.add(0);
                console.error(`User ${String(uniqueUserId)} opinion creation failed: ${String(opinionResult.reason)}`);
            }
            opinionResponseTime.add(opinionResult.responseTime);
        },
        (voteResult: VoteResponse & { targetOpinionSlugId?: string; userId?: string }) => {
            // Callback for voting
            if (voteResult.success) {
                votesSuccessful.add(1);
                voteSuccessRate.add(1);
                console.log(`User ${String(voteResult.userId)} voted on opinion: ${String(voteResult.targetOpinionSlugId)}`);
            } else {
                votesFailed.add(1);
                voteSuccessRate.add(0);
                console.error(`Vote failed: ${String(voteResult.error)}`);
            }
            voteResponseTime.add(voteResult.responseTime);
        },
    );

    // Store created opinions with conversation IDs from the result
    for (const opinion of result.opinionsCreated) {
        const existingIndex = createdOpinions.findIndex(
            (o) => o.slugId === opinion.slugId,
        );
        if (existingIndex !== -1) {
            createdOpinions[existingIndex].conversationSlugId =
                opinion.conversationSlugId;
        }
    }

    // Final sleep before this user's session ends
    sleep(
        Math.random() *
            (MAX_SLEEP_AFTER_USER_ACTIONS - MIN_SLEEP_AFTER_USER_ACTIONS) +
            MIN_SLEEP_AFTER_USER_ACTIONS,
    );
}

/**
 * Teardown phase - clean up all created opinions and user accounts
 */
export async function teardown() {
    console.log("=== Starting Teardown ===");
    console.log(
        `Deleting ${createdOpinions.length} opinions across ${CONVERSATION_SLUG_IDS.length} conversations and ${createdUsers.length} users...`,
    );

    // Step 1: Delete all opinions
    let opinionsDeletedCount = 0;
    let opinionsFailedCount = 0;

    console.log("Step 1: Deleting opinions...");
    for (const opinion of createdOpinions) {
        const result: DeleteOpinionResponse = await deleteOpinion({
            opinionSlugId: opinion.slugId,
            did: opinion.did,
            prefixedKey: opinion.prefixedKey,
            backendDid: BACKEND_DID,
        });

        if (result.success) {
            opinionsDeletedCount++;
            opinionsDeleted.add(1);
        } else {
            opinionsFailedCount++;
            console.error(
                `Failed to delete opinion ${opinion.slugId}: ${result.error}`,
            );
        }

        deleteResponseTime.add(result.responseTime);

        if (opinionsDeletedCount % CLEANUP_BATCH_PAUSE_SIZE === 0) {
            sleep(CLEANUP_BATCH_PAUSE_DURATION);
        }
    }

    console.log(
        `Opinions: ${opinionsDeletedCount} deleted, ${opinionsFailedCount} failed`,
    );

    // Step 2: Delete all user accounts
    let usersDeletedCount = 0;
    let usersFailedCount = 0;

    console.log("Step 2: Deleting user accounts...");
    for (const user of createdUsers) {
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
            console.error(`Failed to delete user ${user.did}: ${result.error}`);
        }

        deleteResponseTime.add(result.responseTime);

        if (usersDeletedCount % CLEANUP_BATCH_PAUSE_SIZE === 0) {
            sleep(CLEANUP_BATCH_PAUSE_DURATION);
        }
    }

    console.log(
        `Users: ${usersDeletedCount} deleted, ${usersFailedCount} failed`,
    );
    console.log("=== Teardown Complete ===");
}
