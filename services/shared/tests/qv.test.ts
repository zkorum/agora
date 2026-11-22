import assert from "node:assert/strict";
import { test } from "node:test";
import {
    QV_CREDIT_BUDGET,
    DEFAULT_QV_CONFIG,
    parseQvBallot,
    qvCreditsToChangeVote,
} from "../src/utils/qv.ts";

test("signed allocations cost the same and unused credits are valid", () => {
    assert.deepEqual(
        parseQvBallot({
            config: DEFAULT_QV_CONFIG,
            allocations: [
                { itemId: "a", votes: 3 },
                { itemId: "b", votes: -4 },
                { itemId: "c", votes: 0 },
            ],
        }),
        {
            valid: true,
            allocations: [
                { itemId: "a", votes: 3 },
                { itemId: "b", votes: -4 },
            ],
            creditsUsed: 25,
        },
    );
    assert.equal(qvCreditsToChangeVote({ currentVotes: 2, nextVotes: 3 }), 5);
    assert.equal(
        qvCreditsToChangeVote({ currentVotes: -3, nextVotes: -2 }),
        -5,
    );
});

test("the full ballot cannot overspend or hide duplicate items", () => {
    assert.deepEqual(
        parseQvBallot({
            config: DEFAULT_QV_CONFIG,
            allocations: [
                { itemId: "a", votes: 8 },
                { itemId: "b", votes: -7 },
            ],
        }),
        { valid: false, reason: "over_budget" },
    );
    assert.deepEqual(
        parseQvBallot({
            config: DEFAULT_QV_CONFIG,
            allocations: [
                { itemId: "a", votes: 0 },
                { itemId: "a", votes: 1 },
            ],
        }),
        { valid: false, reason: "duplicate_item" },
    );
});

test("limits derive from the fixed budget and reject non-integer votes", () => {
    assert.deepEqual(
        parseQvBallot({
            config: DEFAULT_QV_CONFIG,
            allocations: [{ itemId: "a", votes: -10 }],
        }),
        {
            valid: true,
            allocations: [{ itemId: "a", votes: -10 }],
            creditsUsed: 100,
        },
    );
    assert.deepEqual(
        parseQvBallot({
            config: DEFAULT_QV_CONFIG,
            allocations: [{ itemId: "a", votes: 11 }],
        }),
        { valid: false, reason: "invalid_votes" },
    );
    assert.deepEqual(
        parseQvBallot({
            config: DEFAULT_QV_CONFIG,
            allocations: [{ itemId: "a", votes: Number.NaN }],
        }),
        { valid: false, reason: "invalid_votes" },
    );
});

test("support-only QV rejects opposition while allowing positive votes", () => {
    const config = { allowOpposition: false };
    assert.deepEqual(
        parseQvBallot({
            config,
            allocations: [{ itemId: "a", votes: -1 }],
        }),
        { valid: false, reason: "negative_votes_disabled" },
    );
    assert.deepEqual(
        parseQvBallot({
            config,
            allocations: [{ itemId: "a", votes: 4 }],
        }),
        {
            valid: true,
            allocations: [{ itemId: "a", votes: 4 }],
            creditsUsed: 16,
        },
    );
});

test("the fixed budget cannot be exceeded across multiple statements", () => {
    assert.equal(QV_CREDIT_BUDGET, 100);
    assert.deepEqual(
        parseQvBallot({
            config: {
                allowOpposition: false,
            },
            allocations: [
                { itemId: "a", votes: 6 },
                { itemId: "b", votes: 8 },
            ],
        }),
        {
            valid: true,
            allocations: [
                { itemId: "a", votes: 6 },
                { itemId: "b", votes: 8 },
            ],
            creditsUsed: 100,
        },
    );
    assert.deepEqual(
        parseQvBallot({
            config: {
                allowOpposition: true,
            },
            allocations: [
                { itemId: "a", votes: 10 },
                { itemId: "b", votes: 1 },
            ],
        }),
        { valid: false, reason: "over_budget" },
    );
});
