import { equal } from "node:assert/strict";
import test from "node:test";
import type { Message } from "@aws-sdk/client-bedrock-runtime";
import { extractTextContentFromMessage } from "./bedrockMessage.js";

void test("extractTextContentFromMessage concatenates split text blocks", () => {
    const message: Message = {
        role: "assistant",
        content: [{ text: "```json\n" }, { text: '{"clusters":{}}' }, { text: "\n```" }],
    };

    equal(
        extractTextContentFromMessage(message),
        '```json\n{"clusters":{}}\n```',
    );
});

void test("extractTextContentFromMessage returns undefined for whitespace-only text", () => {
    const message: Message = {
        role: "assistant",
        content: [{ text: "   " }, { text: "\n\t" }],
    };

    equal(extractTextContentFromMessage(message), undefined);
});

void test("extractTextContentFromMessage returns undefined when no message is present", () => {
    equal(extractTextContentFromMessage(undefined), undefined);
});

void test("extractTextContentFromMessage ignores non-text content blocks", () => {
    const message: Message = {
        role: "assistant",
        content: [
            { text: '{"clusters":' },
            {
                toolUse: {
                    toolUseId: "tool-1",
                    name: "lookup",
                    input: {},
                },
            },
            { text: "{}}" },
        ],
    };

    equal(extractTextContentFromMessage(message), '{"clusters":{}}');
});

void test("extractTextContentFromMessage returns undefined for empty content", () => {
    const message: Message = {
        role: "assistant",
        content: [],
    };

    equal(extractTextContentFromMessage(message), undefined);
});

void test(
    "extractTextContentFromMessage returns undefined when content is non-text only",
    () => {
        const message: Message = {
            role: "assistant",
            content: [
                {
                    toolUse: {
                        toolUseId: "tool-1",
                        name: "lookup",
                        input: {},
                    },
                },
            ],
        };

        equal(extractTextContentFromMessage(message), undefined);
    },
);

void test("extractTextContentFromMessage preserves long responses", () => {
    const chunk = "a".repeat(1024);
    const message: Message = {
        role: "assistant",
        content: [{ text: chunk }, { text: chunk }, { text: chunk }],
    };

    equal(extractTextContentFromMessage(message), chunk.repeat(3));
});
