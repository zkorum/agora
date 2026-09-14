export type VotingPattern = "random" | "clustered";

export interface VotingPatternConfig {
    readonly pattern: VotingPattern;
    readonly clusterCount: number;
    readonly noiseRate: number;
    readonly outlierRate: number;
}

export type VotingAction = "agree" | "disagree" | "pass";

function stableHash(value: string): number {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index++) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    // MurmurHash3's avalanche finalizer mixes suffix changes into every bit.
    // Raw FNV-1a gives adjacent cluster IDs nearly identical vote probabilities.
    hash ^= hash >>> 16;
    hash = Math.imul(hash, 0x85ebca6b);
    hash ^= hash >>> 13;
    hash = Math.imul(hash, 0xc2b2ae35);
    hash ^= hash >>> 16;
    return hash >>> 0;
}

function stableFraction(value: string): number {
    return stableHash(value) / 0x100000000;
}

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
