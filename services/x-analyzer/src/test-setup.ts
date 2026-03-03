// Runs before each test file — sets env vars before fetch.ts module-level code executes
process.env.X_BEARER_TOKEN = "test-bearer-token-for-vitest";
