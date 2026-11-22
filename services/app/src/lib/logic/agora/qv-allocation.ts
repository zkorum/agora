export interface QvAllocationRow {
  id: string;
  title: string;
  description: string;
  votes: number;
}

export interface QvAllocationChange {
  id: string;
  direction: "fewer" | "more";
}

export function getRemainingCredits({
  rows,
  totalCredits,
}: {
  rows: readonly Pick<QvAllocationRow, "votes">[];
  totalCredits: number;
}): number {
  return totalCredits - rows.reduce((spent, row) => spent + row.votes ** 2, 0);
}

export function canChangeAllocation({
  votes,
  direction,
  remainingCredits,
  voteLimit,
}: {
  votes: number;
  direction: QvAllocationChange["direction"];
  remainingCredits: number;
  voteLimit: number | undefined;
}): boolean {
  const nextVotes = votes + (direction === "more" ? 1 : -1);
  const additionalCost = nextVotes ** 2 - votes ** 2;
  // A lowered allowance or limit must not trap an existing draft above it.
  if (additionalCost <= 0) return true;
  return (
    (voteLimit === undefined || Math.abs(nextVotes) <= voteLimit) &&
    additionalCost <= remainingCredits
  );
}
