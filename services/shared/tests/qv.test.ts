import assert from "node:assert/strict";
import { test } from "node:test";
import {
    DEFAULT_QV_CREDIT_BUDGET,
    DEFAULT_QV_CONFIG,
    MAX_QV_CREDIT_BUDGET,
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

test("limits derive from the supplied budget and reject non-integer votes", () => {
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
            config: { creditBudget: 9, allowNegativeVotes: true },
            allocations: [{ itemId: "a", votes: 4 }],
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
    assert.deepEqual(
        parseQvBallot({
            config: { creditBudget: 0, allowNegativeVotes: true },
            allocations: [],
        }),
        {
            valid: false,
            reason: "invalid_budget",
        },
    );
});

test("support-only QV rejects opposition while allowing positive votes", () => {
    const config = { creditBudget: 16, allowNegativeVotes: false };
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

test("a configurable budget uses the same quadratic rule within its bounds", () => {
    assert.equal(DEFAULT_QV_CREDIT_BUDGET, 100);
    assert.deepEqual(
        parseQvBallot({
            config: {
                creditBudget: MAX_QV_CREDIT_BUDGET,
                allowNegativeVotes: false,
            },
            allocations: [
                { itemId: "a", votes: 30 },
                { itemId: "b", votes: 10 },
            ],
        }),
        {
            valid: true,
            allocations: [
                { itemId: "a", votes: 30 },
                { itemId: "b", votes: 10 },
            ],
            creditsUsed: 1000,
        },
    );
    assert.deepEqual(
        parseQvBallot({
            config: {
                creditBudget: MAX_QV_CREDIT_BUDGET + 1,
                allowNegativeVotes: true,
            },
            allocations: [],
        }),
        { valid: false, reason: "invalid_budget" },
    );
});
