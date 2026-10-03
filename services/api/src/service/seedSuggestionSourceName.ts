export const seedSuggestionSourceNames = ["bedrock", "simulated"] as const;
export type SeedSuggestionSourceName =
    (typeof seedSuggestionSourceNames)[number];
