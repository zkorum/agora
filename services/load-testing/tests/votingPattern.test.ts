import assert from "node:assert/strict";
import { test } from "node:test";
import {
    chooseVotingAction,
    type VotingAction,
    type VotingPatternConfig,
} from "../src/utils/votingPattern.ts";

const opinions = Array.from(
    { length: 1000 },
    (_, index) => `s${String(index).padStart(6, "0")}`,
);
const config: VotingPatternConfig = {
    pattern: "clustered",
    clusterCount: 4,
    noiseRate: 0,
    outlierRate: 0,
};

function votesForUser({
    userId,
    votingPatternConfig = config,
}: {
    userId: string;
    votingPatternConfig?: VotingPatternConfig;
}): VotingAction[] {
    return opinions.map((opinionSlugId) =>
        chooseVotingAction({
            userId,
            opinionSlugId,
            votingPatternConfig,
        }),
    );
}

await test("clustered participants share four reproducible, distinct preference vectors", () => {
    const cohorts = new Map<string, { size: number; votes: VotingAction[] }>();
    for (let index = 0; index < 200; index++) {
        const userId =
            index < 60
                ? `creator-${String(index)}`
                : `voter-${String(index - 60)}`;
        const votes = votesForUser({ userId });
        assert.deepEqual(votesForUser({ userId }), votes);
        const signature = JSON.stringify(votes);
        cohorts.set(signature, {
            size: (cohorts.get(signature)?.size ?? 0) + 1,
            votes,
        });
    }

    assert.equal(cohorts.size, 4);
    for (const { size } of cohorts.values()) {
        assert.ok(
            size >= 30 && size <= 70,
            `Unbalanced synthetic cohort: ${String(size)}`,
        );
    }

    const preferences = [...cohorts.values()].map(({ votes }) => votes);
    for (const [index, votes] of preferences.entries()) {
        for (const other of preferences.slice(index + 1)) {
            const disagreementRate =
                votes.filter(
                    (vote, opinionIndex) => vote !== other[opinionIndex],
                ).length / opinions.length;
            assert.ok(
                disagreementRate > 0.4 && disagreementRate < 0.75,
                `Synthetic groups should differ meaningfully: ${String(disagreementRate)}`,
            );
        }
    }
});

await test("fully noisy clustered votes use the same random choices as random mode", (context) => {
    const observedVotes = new Set<VotingAction>();
    for (const roll of [0, 0.5, 0.99]) {
        const random = context.mock.method(Math, "random", () => roll);
        const userId = "voter-42";
        const randomVotes = votesForUser({
            userId,
            votingPatternConfig: { ...config, pattern: "random" },
        });
        const noisyVotes = votesForUser({
            userId,
            votingPatternConfig: { ...config, noiseRate: 1 },
        });
        assert.deepEqual(noisyVotes, randomVotes);
        for (const vote of randomVotes) {
            observedVotes.add(vote);
        }
        random.mock.restore();
    }
    assert.deepEqual(observedVotes, new Set(["agree", "disagree", "pass"]));
});

await test("outliers invert their cohort's agree/disagree preferences consistently", () => {
    const userId = "voter-42";
    const normal = votesForUser({ userId });
    const outlier = votesForUser({
        userId,
        votingPatternConfig: { ...config, outlierRate: 1 },
    });
    assert.deepEqual(
        outlier,
        normal.map((vote) =>
            vote === "agree"
                ? "disagree"
                : vote === "disagree"
                  ? "agree"
                  : "pass",
        ),
    );
});
