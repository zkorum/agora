/**
 * Scenario 1: Single Conversation Heavy Voting Stress Test
 *
 * This scenario tests a single conversation with:
 * - MANY guest users (each with unique DID) operating IN PARALLEL
 * - Each user CREATES MANY opinions/comments dynamically
 * - Each user votes on ANY opinion from a SHARED POOL (created by any user)
 * - Users auto-vote on their own opinions when creating them (so they're excluded from voting)
 * - Users can't change votes (vote once per opinion)
 * - Users operate independently and concurrently (k6 VUs run in parallel)
 * - Sleep delays are per-user to simulate human behavior (thinking time between actions)
 * - Tests heavy load on a single conversation to identify database contention,
 *   locking issues, and transaction throughput limits
 * - Includes teardown phase to clean up user accounts (conversation must be deleted manually)
 */

// Polyfill for TextEncoder/TextDecoder (k6 doesn't provide these globally)
import "fast-text-encoding";

import { sleep } from "k6";
import { Counter, Trend, Rate } from "k6/metrics";
import { SharedArray } from "k6/data";
import { createDidIfDoesNotExist } from "./crypto/ucan/operation.js";
import {
    deleteUser,
    type CreateOpinionResponse,
    type VoteResponse,
    type DeleteUserResponse,
} from "./utils/api.js";
import { performUserActions } from "./utils/userActions.js";

// Configuration constants
// Reduced opinions per user to ensure users can vote on others' opinions
// With fewer opinions created per user, the shared pool contains more opinions from OTHER users
const MIN_OPINIONS_PER_USER = 1;
const MAX_OPINIONS_PER_USER = 3;
const MIN_VOTES_PER_USER = 10;
const MAX_VOTES_PER_USER = 20;

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

// Custom metrics
const opinionsCreated = new Counter("opinions_created");
const opinionsFailed = new Counter("opinions_failed");
const votesSuccessful = new Counter("votes_successful");
const votesFailed = new Counter("votes_failed");
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

// Shared arrays to store created data for cleanup and voting
// These arrays are shared across ALL VUs (Virtual Users) for cross-user voting
const allOpinionSlugs: string[] = []; // All opinion slugs created by any user

const createdUsers: {
    did: string;
    prefixedKey: string;
}[] = [];

// Backend DID from environment variable
// Default to localhost for local development
const BACKEND_DID = __ENV.BACKEND_DID || "did:web:localhost%3A8084";

/**
 * Main test function - executed by each VU (Virtual User) in parallel
 * Each VU represents one guest user performing actions
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

    // Perform user actions (interleaved opinion creation and voting)
    await performUserActions(
        {
            did,
            prefixedKey,
            backendDid: BACKEND_DID,
            userId: uniqueUserId,
            numOpinionsToCreate,
            numVotesToCast,
            conversationSlugIds: [CONVERSATION_SLUG_ID],
            opinionTexts: opinionTexts as unknown as string[],
            votingOptions: VOTING_OPTIONS,
            minSleepBetweenActions: MIN_SLEEP_BETWEEN_OPINIONS,
            maxSleepBetweenActions: MAX_SLEEP_BETWEEN_VOTES,
            allAvailableOpinions: allOpinionSlugs, // Pass shared opinion cache
        },
        (opinionResult: CreateOpinionResponse & { userId?: string }) => {
            // Callback for opinion creation
            if (opinionResult.success && opinionResult.opinionSlugId) {
                opinionsCreated.add(1);
                opinionSuccessRate.add(1);
                // Add to shared cache so ALL users can vote on it
                allOpinionSlugs.push(opinionResult.opinionSlugId);
                console.log(
                    `User ${uniqueUserId} created opinion: ${opinionResult.opinionSlugId}`,
                );
            } else {
                opinionsFailed.add(1);
                opinionSuccessRate.add(0);
                console.error(
                    `User ${uniqueUserId} opinion creation failed: ${String(opinionResult.reason)}`,
                );
            }
            opinionResponseTime.add(opinionResult.responseTime);
        },
        (
            voteResult: VoteResponse & {
                targetOpinionSlugId?: string;
                userId?: string;
            },
        ) => {
            // Callback for voting
            if (voteResult.success) {
                votesSuccessful.add(1);
                voteSuccessRate.add(1);
                console.log(
                    `User ${String(voteResult.userId)} voted on opinion: ${String(voteResult.targetOpinionSlugId)}`,
                );
            } else {
                votesFailed.add(1);
                voteSuccessRate.add(0);
                console.error(`Vote failed: ${String(voteResult.error)}`);
            }
            voteResponseTime.add(voteResult.responseTime);
        },
    );

    // Final sleep before this user's session ends
    sleep(
        Math.random() *
            (MAX_SLEEP_AFTER_USER_ACTIONS - MIN_SLEEP_AFTER_USER_ACTIONS) +
            MIN_SLEEP_AFTER_USER_ACTIONS,
    );
}

/**
 * Teardown phase - clean up user accounts
 * Note: Opinions will be deleted automatically when the conversation is deleted
 * or can be cleaned up manually via the admin interface
 */
export async function teardown() {
    console.log("=== Starting Teardown ===");
    console.log(`Deleting ${String(createdUsers.length)} users...`);

    // Delete all user accounts
    let usersDeletedCount = 0;
    let usersFailedCount = 0;

    console.log("Deleting user accounts...");
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
            console.error(
                `Failed to delete user ${user.did}: ${String(result.error)}`,
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
    console.log(
        `To clean up the conversation, delete it via the admin interface or API`,
    );
    console.log("=== Teardown Complete ===");
}
