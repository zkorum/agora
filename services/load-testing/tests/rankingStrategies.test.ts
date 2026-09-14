import assert from "node:assert/strict";
import { test } from "node:test";
import {
    createRankingVoter,
    comparisonBudget,
    evaluateRanking,
    preferenceGroup,
} from "../src/utils/rankingStrategies.ts";
import {
    parseSolidagoConfig,
    buildSolidagoScenarios,
} from "../src/utils/solidagoWorkload.ts";
import { stableHash } from "../src/utils/deterministicRandom.ts";

const itemOrder = ["a", "b", "c", "d"];
const base = {
    itemOrder,
    candidateSet: ["c", "a", "d", "b"],
    seed: "test",
    userIndex: 0,
    comparisonIndex: 0,
    majorityShare: 0.8,
    noiseRate: 0,
};

function chooseStrategicComparison({
    candidateSet,
    comparisonIndex,
    ...config
}: Parameters<typeof createRankingVoter>[0] & {
    candidateSet: string[];
    comparisonIndex: number;
}) {
    return createRankingVoter(config)({ candidateSet, comparisonIndex });
}

await test("known utility order and its opposite produce the expected best/worst", () => {
    assert.deepEqual(
        chooseStrategicComparison({ ...base, strategy: "unanimous" }),
        { best: "a", worst: "d", set: base.candidateSet },
    );
    assert.deepEqual(
        chooseStrategicComparison({
            ...base,
            strategy: "polarized",
            userIndex: 1,
        }),
        { best: "d", worst: "a", set: base.candidateSet },
    );
    assert.throws(() =>
        chooseStrategicComparison({
            ...base,
            strategy: "unanimous",
            candidateSet: ["a", "a"],
        }),
    );
    assert.throws(() =>
        chooseStrategicComparison({
            ...base,
            strategy: "unanimous",
            candidateSet: ["a", "missing"],
        }),
    );
});

await test("cached voters preserve preferences across candidate ordering and support full Unicode seeds", () => {
    const vote = createRankingVoter({ ...base, strategy: "cohorts" });
    const first = vote({ candidateSet: itemOrder, comparisonIndex: 0 });
    const again = vote({
        candidateSet: [...itemOrder].reverse(),
        comparisonIndex: 1,
    });
    assert.equal(again.best, first.best);
    assert.equal(again.worst, first.worst);
    assert.notEqual(stableHash("seed-😀"), stableHash("seed-😁"));
});
await test("seeded noisy choices reproduce and majority cohorts have the requested mix", () => {
    let majority = 0;
    for (let userIndex = 0; userIndex < 1000; userIndex++) {
        const input = {
            ...base,
            userIndex,
            strategy: "noisy" as const,
            noiseRate: 0.5,
        };
        assert.deepEqual(
            chooseStrategicComparison(input),
            chooseStrategicComparison(input),
        );
        majority +=
            preferenceGroup({ ...base, strategy: "majority", userIndex }) === 0
                ? 1
                : 0;
    }
    assert.ok(majority > 750 && majority < 850);
});
await test("sparse budgets are reproducible and bounded", () => {
    const budgets = Array.from({ length: 50 }, (_, userIndex) =>
        comparisonBudget({
            strategy: "sparse",
            seed: "test",
            userIndex,
            maximum: 20,
            dropoutRate: 1,
        }),
    );
    assert.ok(budgets.every((budget) => budget >= 1 && budget < 20));
    assert.equal(
        comparisonBudget({
            strategy: "unanimous",
            seed: "test",
            userIndex: 0,
            maximum: 20,
            dropoutRate: 1,
        }),
        20,
    );
});
await test("evaluation distinguishes correct, reversed, tied, and missing scores", () => {
    const rankings = itemOrder.map((itemSlugId, index) => ({
        itemSlugId,
        score: 4 - index,
    }));
    const correct = evaluateRanking({ itemOrder, rankings, topK: 2 });
    assert.equal(correct.kendallTauA, 1);
    assert.equal(correct.topKRecovery, 1);
    assert.equal(
        evaluateRanking({ itemOrder: [...itemOrder].reverse(), rankings })
            .kendallTauA,
        -1,
    );
    assert.equal(
        evaluateRanking({
            itemOrder,
            rankings: rankings.map((r) => ({ ...r, score: 0 })),
        }).tieFraction,
        1,
    );
    assert.equal(
        evaluateRanking({
            itemOrder,
            rankings: rankings.map((r) => ({ ...r, score: 0 })),
            topK: 2,
        }).topKRecovery,
        null,
    );
    assert.equal(
        evaluateRanking({ itemOrder, rankings: [] }).kendallTauA,
        null,
    );
    assert.equal(
        evaluateRanking({ itemOrder, rankings: rankings.slice(0, 2) }).coverage,
        0.5,
    );
});
await test("workload executors preserve per-conversation pools and validate capacity", () => {
    for (const [mode, executor] of [
        ["iterations", "shared-iterations"],
        ["duration", "constant-vus"],
        ["arrival-rate", "constant-arrival-rate"],
    ]) {
        const config = parseSolidagoConfig({
            CONVERSATION_SLUG_IDS: "first,second",
            RANKING_WORKLOAD_MODE: mode,
        });
        const pools = Object.values(buildSolidagoScenarios(config));
        assert.equal(pools.length, 2);
        assert.ok(pools.every((p) => p.executor === executor));
    }
    assert.throws(() =>
        parseSolidagoConfig({
            CONVERSATION_SLUG_IDS: "first",
            RANKING_WORKLOAD_MODE: "arrival-rate",
            RANKING_VUS_PER_CONVERSATION: "20",
            RANKING_MAX_VUS_PER_CONVERSATION: "10",
        }),
    );
});

await test("invalid evaluation inputs and mistyped fixture orders fail explicitly", () => {
    assert.throws(() => evaluateRanking({ itemOrder, rankings: [], topK: 0 }));
    assert.throws(() =>
        evaluateRanking({
            itemOrder,
            rankings: [{ itemSlugId: "unknown", score: 1 }],
        }),
    );
    assert.throws(() =>
        evaluateRanking({
            itemOrder,
            rankings: [{ itemSlugId: "a", score: NaN }],
        }),
    );
    assert.throws(() =>
        evaluateRanking({
            itemOrder,
            rankings: [
                { itemSlugId: "a", score: 1 },
                { itemSlugId: "a", score: 1 },
            ],
        }),
    );
    assert.throws(() =>
        parseSolidagoConfig({
            CONVERSATION_SLUG_IDS: "fixture",
            RANKING_ITEM_ORDERS: JSON.stringify({ typo: itemOrder }),
        }),
    );
    assert.throws(() =>
        parseSolidagoConfig({
            CONVERSATION_SLUG_IDS: "fixture",
            RANKING_ITEM_ORDERS: JSON.stringify({
                fixture: ["a", "a", "c", "d"],
            }),
        }),
    );
});
