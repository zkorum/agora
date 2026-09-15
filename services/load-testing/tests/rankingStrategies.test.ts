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
await test("zero noise is unanimous and full noise covers all best-worst pairs without preference bias", () => {
    const counts = new Map<string, number>();
    for (let userIndex = 0; userIndex < 6000; userIndex++) {
        const unanimous = chooseStrategicComparison({
            ...base,
            strategy: "noisy",
            userIndex,
            noiseRate: 0,
        });
        assert.equal(unanimous.best, "a");
        assert.equal(unanimous.worst, "d");
        const noisy = chooseStrategicComparison({
            ...base,
            strategy: "noisy",
            userIndex,
            noiseRate: 1,
        });
        const key = `${noisy.best}:${noisy.worst}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    assert.equal(counts.size, 12);
    for (const count of counts.values())
        assert.ok(count > 400 && count < 600, String(count));
});
await test("ten-percent noise has the expected rate of non-reference choices", () => {
    let different = 0;
    for (let userIndex = 0; userIndex < 6000; userIndex++) {
        const vote = chooseStrategicComparison({
            ...base,
            strategy: "noisy",
            userIndex,
            noiseRate: 0.1,
        });
        if (vote.best !== "a" || vote.worst !== "d") different++;
    }
    // A random four-item task still agrees with the reference with probability 1/12.
    assert.ok(different / 6000 > 0.075 && different / 6000 < 0.11);
});
await test("polarized users split evenly into opposite orders and a 100% majority is unanimous", () => {
    let forward = 0;
    let reverse = 0;
    for (let userIndex = 0; userIndex < 100; userIndex++) {
        const vote = chooseStrategicComparison({
            ...base,
            strategy: "polarized",
            userIndex,
        });
        if (vote.best === "a" && vote.worst === "d") forward++;
        else if (vote.best === "d" && vote.worst === "a") reverse++;
        const allMajority = chooseStrategicComparison({
            ...base,
            strategy: "majority",
            userIndex,
            majorityShare: 1,
        });
        assert.equal(allMajority.best, "a");
        assert.equal(allMajority.worst, "d");
    }
    assert.equal(forward, 50);
    assert.equal(reverse, 50);
});
await test("cohort members share complete preference vectors and the four cohorts differ", () => {
    const items = Array.from(
        { length: 20 },
        (_, index) => `item-${String(index)}`,
    );
    const signatures = Array.from({ length: 8 }, (_, userIndex) => {
        const vote = createRankingVoter({
            ...base,
            itemOrder: items,
            strategy: "cohorts",
            userIndex,
        });
        return items
            .flatMap((a, index) =>
                items
                    .slice(index + 1)
                    .map((b) =>
                        vote({ candidateSet: [a, b], comparisonIndex: 0 })
                            .best === a
                            ? "1"
                            : "0",
                    ),
            )
            .join("");
    });
    assert.equal(new Set(signatures.slice(0, 4)).size, 4);
    for (let index = 0; index < 4; index++)
        assert.equal(signatures[index], signatures[index + 4]);
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
await test("sparse dropout zero retains all work and half dropout shortens roughly half the sessions", () => {
    let shortened = 0;
    for (let userIndex = 0; userIndex < 1000; userIndex++) {
        const parameters = {
            strategy: "sparse" as const,
            seed: "test",
            userIndex,
            maximum: 20,
        };
        assert.equal(comparisonBudget({ ...parameters, dropoutRate: 0 }), 20);
        if (comparisonBudget({ ...parameters, dropoutRate: 0.5 }) < 20)
            shortened++;
        assert.equal(
            comparisonBudget({ ...parameters, maximum: 1, dropoutRate: 1 }),
            1,
        );
    }
    assert.ok(shortened > 450 && shortened < 550);
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
