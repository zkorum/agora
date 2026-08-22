import { describe, expect, it } from "vitest";
import { createSimulatedConversationEmailProvider } from "./simulatedProvider.js";

const message = {
    to: "participant@example.com",
    subject: "Update",
    html: "<p>Update</p>",
    text: "Update",
    replyToName: "Project contact",
    replyToEmail: "facilitator@example.com",
    tags: { conversation_update_attempt_id: "attempt-1" },
    unsubscribeUrl: undefined,
};

describe("simulated Conversation Email provider", () => {
    it("accepts with a unique synthetic provider message ID", async () => {
        const provider = createSimulatedConversationEmailProvider({
            mode: "success",
            retryableFailures: 1,
        });
        const first = await provider.send(message);
        const second = await provider.send({
            ...message,
            tags: { conversation_update_attempt_id: "attempt-2" },
        });

        expect(first.kind).toBe("provider_accepted");
        expect(second.kind).toBe("provider_accepted");
        if (
            first.kind === "provider_accepted" &&
            second.kind === "provider_accepted"
        ) {
            expect(first.messageId).toMatch(/^simulated-/);
            expect(second.messageId).not.toBe(first.messageId);
        }
    });

    it("can retry a message before accepting it", async () => {
        const provider = createSimulatedConversationEmailProvider({
            mode: "retryable_rejected_then_success",
            retryableFailures: 2,
        });

        expect((await provider.send(message)).kind).toBe("retryable_rejected");
        expect((await provider.send(message)).kind).toBe("retryable_rejected");
        expect((await provider.send(message)).kind).toBe("provider_accepted");
    });

    it.each([
        ["retryable_rejected", "retryable_rejected"],
        ["permanent_rejected", "permanent_rejected"],
        ["unknown", "unknown"],
    ] as const)("simulates %s", async (mode, expected) => {
        const provider = createSimulatedConversationEmailProvider({
            mode,
            retryableFailures: 1,
        });
        expect((await provider.send(message)).kind).toBe(expected);
    });
});
