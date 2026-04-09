import { describe, expect, it } from "vitest";
import { sharedConfigSchema } from "../src/config.js";

describe("sharedConfigSchema QUEUE_VALKEY_URL", () => {
    it("treats an empty string as undefined", () => {
        const config = sharedConfigSchema.parse({ QUEUE_VALKEY_URL: "" });

        expect(config.QUEUE_VALKEY_URL).toBeUndefined();
    });

    it("parses a valid Valkey URL into typed config", () => {
        const config = sharedConfigSchema.parse({
            QUEUE_VALKEY_URL:
                "valkeys://user%20name:pass%40word@cache.example.com:6380",
        });

        expect(config.QUEUE_VALKEY_URL).toEqual({
            urlString:
                "valkeys://user%20name:pass%40word@cache.example.com:6380",
            host: "cache.example.com",
            port: 6380,
            username: "user name",
            password: "pass@word",
            useTLS: true,
        });
    });

    it("rejects unsupported URL schemes", () => {
        expect(() => {
            sharedConfigSchema.parse({
                QUEUE_VALKEY_URL: "https://cache.example.com:6379",
            });
        }).toThrow("Unsupported Valkey URL protocol");
    });
});
