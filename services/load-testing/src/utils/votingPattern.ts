import { stableHash, stableFraction } from "./deterministicRandom.ts";

export type VotingPattern = "random" | "clustered";

export interface VotingPatternConfig {
    readonly pattern: VotingPattern;
    readonly clusterCount: number;
    readonly noiseRate: number;
    readonly outlierRate: number;
}

export type VotingAction = "agree" | "disagree" | "pass";

function randomVotingAction(): VotingAction {
    const roll = Math.random();
    return roll < 1 / 3 ? "agree" : roll < 2 / 3 ? "disagree" : "pass";
}

function invertVotingAction(action: VotingAction): VotingAction {
    if (action === "agree") {
        return "disagree";
    }
    if (action === "disagree") {
        return "agree";
    }
    return "pass";
}

export function chooseVotingAction({
    userId,
    opinionSlugId,
    votingPatternConfig,
}: {
    userId: string;
    opinionSlugId: string;
    votingPatternConfig: VotingPatternConfig;
}): VotingAction {
    if (votingPatternConfig.pattern === "random") {
        return randomVotingAction();
    }

    const clusterCount = Math.max(
        1,
        Math.floor(votingPatternConfig.clusterCount),
    );
    const userCluster = stableHash(`user:${userId}`) % clusterCount;
    const noiseRoll = stableFraction(`noise:${userId}:${opinionSlugId}`);
    if (noiseRoll < votingPatternConfig.noiseRate) {
        return randomVotingAction();
    }

    const opinionRoll = stableFraction(
        `opinion:${opinionSlugId}:cluster:${String(userCluster)}`,
    );
    const baseAction: VotingAction =
        opinionRoll < 0.45 ? "agree" : opinionRoll < 0.55 ? "pass" : "disagree";
    const outlierRoll = stableFraction(`outlier:${userId}`);
    return outlierRoll < votingPatternConfig.outlierRate
        ? invertVotingAction(baseAction)
        : baseAction;
}
