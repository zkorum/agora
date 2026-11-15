/** **** WARNING: GENERATED FROM SHARED DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
export const CREDIT_VOTING_BUDGET = 100;
export const CREDIT_VOTING_RULE_VERSION = 1;
export const CREDIT_VOTING_ALGORITHM_VERSION = 1;

export interface QvConfig {
    allowNegativeVotes: boolean;
}

export const DEFAULT_QV_CONFIG: QvConfig = {
    allowNegativeVotes: true,
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

/** All activities use the same fixed credit budget. */
export function parseQvBallot({
    allocations,
    config,
}: {
    allocations: readonly QvAllocation[];
    config: QvConfig;
}): QvBallotResult {
    const { allowNegativeVotes } = config;
    const maxVotesPerItem = Math.floor(Math.sqrt(CREDIT_VOTING_BUDGET));
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
        if (!allowNegativeVotes && allocation.votes < 0) {
            return { valid: false, reason: "negative_votes_disabled" };
        }

        creditsUsed += allocation.votes * allocation.votes;
        if (creditsUsed > CREDIT_VOTING_BUDGET) {
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
