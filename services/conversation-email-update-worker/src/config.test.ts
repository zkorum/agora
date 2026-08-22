import { describe, expect, it } from "vitest";
import { parseConversationEmailWorkerEnvironment } from "./config.js";

const baseEnvironment: NodeJS.ProcessEnv = {
    NODE_ENV: "development",
    AGORA_DEV_MODE: "true",
    CONVERSATION_EMAIL_UPDATES_ENABLED: "true",
    CONVERSATION_EMAIL_UPDATES_KILL_SWITCH: "false",
    CONVERSATION_EMAIL_UPDATE_SITE_BASE_URL: "https://localhost.example",
};

describe("Conversation Email Updates simulator configuration", () => {
    it("accepts an explicitly enabled development simulator", () => {
        expect(
            parseConversationEmailWorkerEnvironment({
                ...baseEnvironment,
                CONVERSATION_EMAIL_UPDATE_PROVIDER: "simulated",
                CONVERSATION_EMAIL_UPDATE_SIMULATOR_ENABLED: "true",
            }).CONVERSATION_EMAIL_UPDATE_PROVIDER,
        ).toBe("simulated");
    });

    it.each(["staging", "production", "test"])(
        "rejects the simulator in %s",
        (NODE_ENV) => {
            expect(() =>
                parseConversationEmailWorkerEnvironment({
                    ...baseEnvironment,
                    NODE_ENV,
                    CONVERSATION_EMAIL_UPDATE_PROVIDER: "simulated",
                    CONVERSATION_EMAIL_UPDATE_SIMULATOR_ENABLED: "true",
                }),
            ).toThrow();
        },
    );

    it("rejects simulation without both explicit safety switches", () => {
        expect(() =>
            parseConversationEmailWorkerEnvironment({
                ...baseEnvironment,
                AGORA_DEV_MODE: "false",
                CONVERSATION_EMAIL_UPDATE_PROVIDER: "simulated",
                CONVERSATION_EMAIL_UPDATE_SIMULATOR_ENABLED: "true",
            }),
        ).toThrow();
        expect(() =>
            parseConversationEmailWorkerEnvironment({
                ...baseEnvironment,
                CONVERSATION_EMAIL_UPDATE_PROVIDER: "simulated",
                CONVERSATION_EMAIL_UPDATE_SIMULATOR_ENABLED: "false",
            }),
        ).toThrow();
    });

    it("rejects simultaneous simulated and SES configuration", () => {
        expect(() =>
            parseConversationEmailWorkerEnvironment({
                ...baseEnvironment,
                CONVERSATION_EMAIL_UPDATE_PROVIDER: "simulated",
                CONVERSATION_EMAIL_UPDATE_SIMULATOR_ENABLED: "true",
                CONVERSATION_EMAIL_UPDATE_EMAIL_FROM_ADDRESS:
                    "updates@example.com",
            }),
        ).toThrow();
    });
});
