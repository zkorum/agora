import { describe, expect, it } from "vitest";
import {
    MAX_BYTES_RICH_TEXT_HTML,
    countPlainTextCharacters,
} from "@/shared/shared.js";
import {
    convertHtmlToCountedTextWithFallback,
    countHtmlPlainTextCharacters,
    validateRichTextInput,
} from "@/shared/richText.js";
import { Dto } from "@/shared/types/dto.js";
import {
    zodSurveyAnswerDraft,
    zodSurveyConfig,
    zodSurveyConfigInput,
} from "@/shared/types/zod.js";
import { normalizeUserRichTextInput } from "./richText.js";
import { normalizeProviderRankingItemContent } from "./rankingItem.js";

describe("rich-text normalization", () => {
    it("counts visible grapheme clusters instead of UTF-16 code units", () => {
        expect(countHtmlPlainTextCharacters("<p>👨‍👩‍👧‍👦</p>")).toEqual({
            characterCount: 1,
        });
    });

    it("counts literal angle-bracket text without treating it as HTML", () => {
        expect(countPlainTextCharacters("<b>hello</b>")).toEqual({
            characterCount: 12,
        });
    });

    it("preserves list semantics in canonical plain text", () => {
        expect(
            normalizeUserRichTextInput({
                html: "<ul><li>A</li><li>B</li></ul>",
                validationMode: "opinion",
            }),
        ).toEqual({
            success: true,
            content: {
                html: "<ul><li>A</li><li>B</li></ul>",
                plainText: "- A\n- B",
            },
        });
    });

    it("preserves paragraphs and ordered nested lists", () => {
        expect(
            normalizeUserRichTextInput({
                html: "<p>Tasks:</p><ol><li>Register</li><li>Vote<ul><li>Early</li></ul></li></ol>",
                validationMode: "conversation_email_update",
            }),
        ).toEqual({
            success: true,
            content: {
                html: "<p>Tasks:</p><ol><li>Register</li><li>Vote<ul><li>Early</li></ul></li></ol>",
                plainText: "Tasks:\n\n1. Register\n2. Vote\n    - Early",
            },
        });
    });

    it("uses the Conversation Update 10,000-character limit", () => {
        const text = "a".repeat(10_000);
        expect(
            normalizeUserRichTextInput({
                html: `<p>${text}</p>`,
                validationMode: "conversation_email_update",
            }),
        ).toEqual({
            success: true,
            content: { html: `<p>${text}</p>`, plainText: text },
        });

        expect(
            normalizeUserRichTextInput({
                html: `<p>${text}a</p>`,
                validationMode: "conversation_email_update",
            }),
        ).toEqual({
            success: false,
            reason: "plain_text_too_long",
            count: 10_001,
            limit: 10_000,
        });
    });

    it("keeps Conversation Update validation within the database text limit", () => {
        const text = "a\u0301".repeat(5_200);
        expect(
            normalizeUserRichTextInput({
                html: `<p>${text}</p>`,
                validationMode: "conversation_email_update",
            }),
        ).toEqual({
            success: false,
            reason: "plain_text_too_long",
            count: 10_400,
            limit: 10_000,
        });
    });

    it("rejects unsafe Conversation Update subjects", () => {
        const parseRequest = (subject: string) =>
            Dto.conversationEmailUpdateSendTestRequest.parse({
                selection: {
                    kind: "no_project",
                    conversationSlugId: "abcdefghij",
                },
                subject,
                bodyHtml: "<p>Body</p>",
            });

        expect(() =>
            parseRequest("Update\r\nBcc: attacker@example.com"),
        ).toThrow();
        expect(() => parseRequest("safe\u202Etxt")).toThrow();
        expect(() => parseRequest("\u200B")).toThrow();
        expect(() => parseRequest("first\u2028second")).toThrow();
        expect(() => parseRequest("first\u2029second")).toThrow();
        expect(() => parseRequest("😀".repeat(140))).not.toThrow();
        expect(() => parseRequest("😀".repeat(141))).toThrow();
    });

    it("enforces the Conversation Update HTML limit in UTF-8 bytes", () => {
        expect(() =>
            Dto.conversationEmailUpdateSendTestRequest.parse({
                selection: {
                    kind: "no_project",
                    conversationSlugId: "conversation",
                },
                subject: "Update",
                bodyHtml: "é".repeat(9_000),
            }),
        ).toThrow();
    });

    it("returns best-effort text when the primary converter throws", () => {
        const conversionError = new Error("converter failed");
        const result = convertHtmlToCountedTextWithFallback({
            htmlString:
                "<p>Hello<br>world</p><ul><li>Fish &amp; chips</li></ul>",
            primaryConverter: () => {
                throw conversionError;
            },
        });

        expect(result).toEqual({
            usedFallback: true,
            plainText: "Hello\nworld\nFish & chips",
            error: conversionError,
        });
    });

    it("removes non-display control characters before persistence", () => {
        expect(
            normalizeUserRichTextInput({
                html: "<p>A\u0000\u0001B</p>",
                validationMode: "opinion",
            }),
        ).toEqual({
            success: true,
            content: {
                html: "<p>AB</p>",
                plainText: "AB",
            },
        });
    });

    it("removes encoded non-display control characters after sanitization", () => {
        expect(
            normalizeUserRichTextInput({
                html: "<p>A&#1;&#x7f;&lrm;B</p>",
                validationMode: "opinion",
            }),
        ).toEqual({
            success: true,
            content: {
                html: "<p>AB</p>",
                plainText: "AB",
            },
        });
    });

    it("removes bidi control characters before persistence", () => {
        expect(
            normalizeUserRichTextInput({
                html: "<p>safe\u202Etxt</p>",
                validationMode: "opinion",
            }),
        ).toEqual({
            success: true,
            content: {
                html: "<p>safetxt</p>",
                plainText: "safetxt",
            },
        });
    });

    it("removes bidi controls from provider ranking titles", async () => {
        const content = await normalizeProviderRankingItemContent({
            title: "safe\u202Etxt",
        });

        expect(content.title).toBe("safetxt");
    });

    it("leaves survey character limits to the question configuration", () => {
        const text = "a".repeat(1_001);
        expect(
            normalizeUserRichTextInput({
                html: `<p>${text}</p>`,
                validationMode: "survey",
            }),
        ).toEqual({
            success: true,
            content: {
                html: `<p>${text}</p>`,
                plainText: text,
            },
        });
    });

    it("allows grapheme-valid survey drafts across the DTO boundary", () => {
        const text = "😀".repeat(1_000);
        expect(
            zodSurveyAnswerDraft.parse({
                questionType: "free_text",
                textValueHtml: `<p>${text}</p>`,
                textValuePlainText: text,
            }),
        ).toEqual({
            questionType: "free_text",
            textValueHtml: `<p>${text}</p>`,
            textValuePlainText: text,
        });
    });

    it("preserves bare URLs without persisting generated links", () => {
        const html =
            "<p>Compare http://Tournesol.org with <strong>http://Tournesol.app</strong></p>";
        const result = normalizeUserRichTextInput({
            html,
            validationMode: "opinion",
        });

        expect(result).toEqual({
            success: true,
            content: {
                html,
                plainText:
                    "Compare http://Tournesol.org with http://Tournesol.app",
            },
        });
    });

    it("reports the visible count and limit for oversized statements", () => {
        expect(
            validateRichTextInput({
                htmlString: `<p>${"a".repeat(281)}</p>`,
                mode: "opinion",
            }),
        ).toEqual({
            success: false,
            reason: "plain_text_too_long",
            count: 281,
            limit: 280,
        });
    });

    it("rejects statements emptied by sanitization", () => {
        expect(
            normalizeUserRichTextInput({
                html: "<img src=x>",
                validationMode: "opinion",
            }),
        ).toEqual({
            success: false,
            reason: "plain_text_empty",
            count: 0,
            limit: 1,
        });
    });

    it.each(["\u200B", "\uFE0F", "\u034F"])(
        "rejects statements containing only default-ignorable text %#",
        (invisibleText) => {
            expect(
                normalizeUserRichTextInput({
                    html: `<p>${invisibleText}</p>`,
                    validationMode: "opinion",
                }),
            ).toEqual({
                success: false,
                reason: "plain_text_empty",
                count: 0,
                limit: 1,
            });
        },
    );

    it("reports UTF-8 bytes for the technical HTML limit", () => {
        const html = `${"<strong></strong>".repeat(1_000)}é`;
        const result = validateRichTextInput({
            htmlString: html,
            mode: "opinion",
        });

        expect(result).toEqual({
            success: false,
            reason: "html_too_long",
            count: new TextEncoder().encode(html).length,
            limit: MAX_BYTES_RICH_TEXT_HTML,
        });
    });

    it("rejects oversized raw HTML before sanitization can shrink it", () => {
        const html = `<img alt="${"a".repeat(MAX_BYTES_RICH_TEXT_HTML)}">`;

        expect(
            normalizeUserRichTextInput({
                html,
                validationMode: "opinion",
            }),
        ).toEqual({
            success: false,
            reason: "html_too_long",
            count: new TextEncoder().encode(html).length,
            limit: MAX_BYTES_RICH_TEXT_HTML,
        });
    });

    it("preserves raw seed HTML for validation after the byte preflight", () => {
        const html = `<p>hello</p>${"<p></p>".repeat(3_000)}`;

        const request = Dto.createNewConversationRequest.parse({
            conversationType: "polis",
            conversationTitle: "Test",
            isIndexed: false,
            participationMode: "account_required",
            multilingualSetting: {
                additionalLanguageCodes: [],
                dynamicTranslationEnabled: false,
            },
            seedOpinionList: [html],
        });
        expect(request.seedOpinionList).toEqual([html]);
    });

    it("lets canonical validation handle exactly empty statement HTML", () => {
        expect(
            Dto.createOpinionRequest.parse({
                conversationSlugId: "conversation",
                opinionBody: "",
            }).opinionBody,
        ).toBe("");
    });

    it("accepts legacy survey limits for reads but rejects them for new input", () => {
        const legacyConfig = {
            questions: [
                {
                    questionType: "free_text" as const,
                    questionText: "Why?",
                    isRequired: true,
                    displayOrder: 0,
                    constraints: {
                        type: "free_text" as const,
                        inputMode: "rich_text" as const,
                        maxPlainTextLength: 500,
                        maxHtmlLength: 5_000,
                    },
                },
            ],
        };

        expect(zodSurveyConfig.parse(legacyConfig).questions).toHaveLength(1);
        expect(() => zodSurveyConfigInput.parse(legacyConfig)).toThrow();
    });

    it("requires creation failure location and limit metadata", () => {
        expect(
            Dto.createNewConversationResponse.parse({
                success: false,
                failure: {
                    reason: "plain_text_too_long",
                    target: "seed_opinion",
                    index: 2,
                    count: 281,
                    limit: 280,
                },
            }),
        ).toEqual({
            success: false,
            failure: {
                reason: "plain_text_too_long",
                target: "seed_opinion",
                index: 2,
                count: 281,
                limit: 280,
            },
        });
        expect(() =>
            Dto.createNewConversationResponse.parse({
                success: false,
                failure: {
                    reason: "plain_text_too_long",
                    target: "seed_opinion",
                },
            }),
        ).toThrow();
    });
});
