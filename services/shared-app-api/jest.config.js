/** @type {import('jest').Config} */
const config = {
    // see https://kulshekhar.github.io/ts-jest/docs/guides/esm-support/#use-esm-presets
    preset: "ts-jest/presets/default-esm", // or other ESM presets
    moduleNameMapper: {
        "^\\.\\./shared/(.*)\\.js$": "<rootDir>/../shared/src/$1",
        "^(\\.{1,2}/.*)\\.js$": "$1",
    },
    // Shared sources normally run inside the consuming service's synced tree.
    modulePaths: ["<rootDir>/node_modules"],
    transform: {
        // '^.+\\.[tj]sx?$' to process js/ts with `ts-jest`
        // '^.+\\.m?[tj]sx?$' to process js/ts/mjs/mts with `ts-jest`
        "^.+\\.tsx?$": [
            "ts-jest",
            {
                useESM: true,
            },
        ],
    },
    testEnvironment: "node",
    roots: ["<rootDir>/tests"],
    coveragePathIgnorePatterns: ["<rootDir>/__tests__", "<rootDir>/lib"],
    verbose: true,
};

export default config;
