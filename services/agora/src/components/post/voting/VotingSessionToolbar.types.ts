export type VotingSessionProgress =
  | { kind: "count"; label: string }
  | { kind: "percentage"; value: number };
