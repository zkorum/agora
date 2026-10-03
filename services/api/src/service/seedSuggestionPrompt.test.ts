import { describe, expect, it } from "vitest";

import {
    DEFAULT_SEED_SUGGESTION_SYSTEM_PROMPT,
    buildSeedSuggestionMessages,
    parseSeedSuggestionAnswer,
    selectUsableSeedStatements,
    selectUsableSeedTip,
} from "./seedSuggestionPrompt.js";

describe("seed suggestion prompt", () => {
    it("fills every placeholder", () => {
        const messages = buildSeedSuggestionMessages({
            systemPrompt: DEFAULT_SEED_SUGGESTION_SYSTEM_PROMPT,
            input: {
                conversationTitle: "Night buses",
                conversationBody: "Which priorities?",
                existingStatements: ["Run every 30 minutes."],
                targetCount: 3,
            },
        });

        expect(messages.system).not.toContain("{{");
        expect(messages.system).toContain("produce 3 standalone statements");
        expect(messages.user).toBe(
            'Conversation title: Night buses\nConversation body: Which priorities?\nOpinions participants already wrote (may be empty): ["Run every 30 minutes."]',
        );
    });

    it("inserts author text as is, even when it looks like a placeholder or a pattern", () => {
        const messages = buildSeedSuggestionMessages({
            systemPrompt: DEFAULT_SEED_SUGGESTION_SYSTEM_PROMPT,
            input: {
                conversationTitle: "Costs: $& and {{conversation_body}}",
                conversationBody: "Body",
                existingStatements: [],
                targetCount: 3,
            },
        });

        expect(messages.user).toContain(
            "Conversation title: Costs: $& and {{conversation_body}}\n",
        );
        expect(messages.user).toContain("Conversation body: Body\n");
    });

    it("carries no instruction about the output language", () => {
        expect(DEFAULT_SEED_SUGGESTION_SYSTEM_PROMPT).not.toMatch(/language/i);
    });
});

describe("parseSeedSuggestionAnswer", () => {
    const answer = {
        confidence: true,
        user_feedback: "A tip.",
        statements: ["One.", "Two.", "Three."],
    };

    it("reads a plain JSON object", () => {
        expect(parseSeedSuggestionAnswer(JSON.stringify(answer))).toEqual({
            confidence: true,
            userFeedback: "A tip.",
            statements: ["One.", "Two.", "Three."],
        });
    });

    it("reads an answer wrapped in a code fence or surrounded by text", () => {
        const fenced = "```json\n" + JSON.stringify(answer) + "\n```";
        const surrounded =
            "Here is the result: " + JSON.stringify(answer) + " Done.";

        expect(parseSeedSuggestionAnswer(fenced)?.statements).toHaveLength(3);
        expect(parseSeedSuggestionAnswer(surrounded)?.statements).toHaveLength(3);
    });

    it("accepts a missing tip", () => {
        expect(
            parseSeedSuggestionAnswer(
                JSON.stringify({ confidence: true, statements: ["One."] }),
            ),
        ).toEqual({ confidence: true, userFeedback: "", statements: ["One."] });
    });

    it("rejects anything that is not the expected object", () => {
        for (const raw of [
            "",
            "I cannot help with that.",
            "[1, 2, 3]",
            JSON.stringify({ confidence: "high", statements: [] }),
            JSON.stringify({ confidence: true, statements: "One." }),
            JSON.stringify({ confidence: true, statements: [1, 2] }),
            '{"confidence": true, "statements": ["One."',
        ]) {
            expect(parseSeedSuggestionAnswer(raw)).toBeUndefined();
        }
    });
});

describe("selectUsableSeedStatements", () => {
    it("keeps statements of exactly 280 characters and drops longer ones", () => {
        expect(
            selectUsableSeedStatements({
                statements: ["a".repeat(280), "b".repeat(281)],
                existingStatements: [],
                targetCount: 3,
            }),
        ).toEqual(["a".repeat(280)]);
    });

    it("counts characters, not bytes", () => {
        const statement = "é".repeat(280);

        expect(
            selectUsableSeedStatements({
                statements: [statement],
                existingStatements: [],
                targetCount: 3,
            }),
        ).toEqual([statement]);
    });

    it("drops repeats within the answer", () => {
        expect(
            selectUsableSeedStatements({
                statements: ["One.", " one. ", "Two."],
                existingStatements: [],
                targetCount: 3,
            }),
        ).toEqual(["One.", "Two."]);
    });
});

describe("selectUsableSeedTip", () => {
    it("trims the tip and treats a blank one as missing", () => {
        expect(selectUsableSeedTip("  Add the question.  ")).toBe(
            "Add the question.",
        );
        expect(selectUsableSeedTip("   ")).toBeUndefined();
    });

    it("cuts an overlong tip to the maximum the page accepts", () => {
        expect(selectUsableSeedTip("x".repeat(1500))).toHaveLength(1000);
    });
});
