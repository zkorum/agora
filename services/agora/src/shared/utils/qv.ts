/** **** WARNING: GENERATED FROM SHARED DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
export const QV_CREDIT_BUDGET = 100;
export const QV_RULE_VERSION = 1;
export const QV_ALGORITHM_VERSION = 1;

export interface QvConfig {
    allowOpposition: boolean;
}

export const DEFAULT_QV_CONFIG: QvConfig = {
    allowOpposition: true,
};

export interface QvAllocation {
    itemId: string;
    votes: number;
}

export type QvBallotResult =
    | { valid: true; allocations: QvAllocation[]; creditsUsed: number }
    | {
          valid: false;
          reason:
              | "invalid_item"
              | "duplicate_item"
              | "invalid_votes"
              | "negative_votes_disabled"
              | "over_budget";
      };

/** All QV conversations use the same fixed credit budget. */
export function parseQvBallot({
    allocations,
    config,
}: {
    allocations: readonly QvAllocation[];
    config: QvConfig;
}): QvBallotResult {
    const { allowOpposition } = config;
    const maxVotesPerItem = Math.floor(Math.sqrt(QV_CREDIT_BUDGET));
    const seen = new Set<string>();
    const nonzeroAllocations: QvAllocation[] = [];
    let creditsUsed = 0;

    for (const allocation of allocations) {
        if (allocation.itemId.length === 0) {
            return { valid: false, reason: "invalid_item" };
        }
        if (seen.has(allocation.itemId)) {
            return { valid: false, reason: "duplicate_item" };
        }
        seen.add(allocation.itemId);

        if (
            !Number.isSafeInteger(allocation.votes) ||
            Math.abs(allocation.votes) > maxVotesPerItem
        ) {
            return { valid: false, reason: "invalid_votes" };
        }
        if (!allowOpposition && allocation.votes < 0) {
            return { valid: false, reason: "negative_votes_disabled" };
        }

        creditsUsed += allocation.votes * allocation.votes;
        if (creditsUsed > QV_CREDIT_BUDGET) {
            return { valid: false, reason: "over_budget" };
        }
        if (allocation.votes !== 0) {
            nonzeroAllocations.push({
                itemId: allocation.itemId,
                votes: allocation.votes,
            });
        }
    }

    return { valid: true, allocations: nonzeroAllocations, creditsUsed };
}

export function qvCreditsToChangeVote({
    currentVotes,
    nextVotes,
}: {
    currentVotes: number;
    nextVotes: number;
}): number {
    return nextVotes * nextVotes - currentVotes * currentVotes;
}
