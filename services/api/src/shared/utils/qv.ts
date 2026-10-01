/** **** WARNING: GENERATED FROM SHARED DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
export const DEFAULT_QV_CREDIT_BUDGET = 100;
export const MAX_QV_CREDIT_BUDGET = 1000;

export interface QvConfig {
    creditBudget: number;
    allowNegativeVotes: boolean;
}

export const DEFAULT_QV_CONFIG: QvConfig = {
    creditBudget: DEFAULT_QV_CREDIT_BUDGET,
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
              | "invalid_budget"
              | "invalid_item"
              | "duplicate_item"
              | "invalid_votes"
              | "negative_votes_disabled"
              | "over_budget";
      };

/** The budget is supplied by the activity configuration, never by the ballot. */
export function parseQvBallot({
    allocations,
    config,
}: {
    allocations: readonly QvAllocation[];
    config: QvConfig;
}): QvBallotResult {
    const { creditBudget, allowNegativeVotes } = config;
    if (
        !Number.isSafeInteger(creditBudget) ||
        creditBudget <= 0 ||
        creditBudget > MAX_QV_CREDIT_BUDGET
    ) {
        return { valid: false, reason: "invalid_budget" };
    }

    const maxVotesPerItem = Math.floor(Math.sqrt(creditBudget));
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
        if (creditsUsed > creditBudget) {
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
