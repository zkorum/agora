import assert from "node:assert/strict";
import { test } from "node:test";
import type { ConversationTypeConfig } from "../src/types/zod.ts";
import { canEditPublishedConversationTypeConfig } from "../src/utils/conversationTypeConfig.ts";

const configs = [
    { conversationType: "polis", votingPresentation: "list" },
    { conversationType: "polis", votingPresentation: "one_at_a_time" },
    {
        conversationType: "prioritizing",
        prioritizationType: "comparisons",
        comparisonMethod: "bws",
    },
    {
        conversationType: "prioritizing",
        prioritizationType: "comparisons",
        comparisonMethod: "pairwise",
    },
    {
        conversationType: "prioritizing",
        prioritizationType: "qv",
        creditPricing: "quadratic",
        allowOpposition: true,
    },
    {
        conversationType: "prioritizing",
        prioritizationType: "qv",
        creditPricing: "quadratic",
        allowOpposition: false,
    },
] satisfies ConversationTypeConfig[];

test("publication fixes every method and QV rule, but not Polis presentation", () => {
    for (const current of configs) {
        for (const requested of configs) {
            assert.equal(
                canEditPublishedConversationTypeConfig({ current, requested }),
                current === requested ||
                    (current.conversationType === "polis" &&
                        requested.conversationType === "polis"),
                `${JSON.stringify(current)} -> ${JSON.stringify(requested)}`,
            );
        }
    }
});
