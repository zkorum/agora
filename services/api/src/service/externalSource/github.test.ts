import { describe, it, expect } from "vitest";
import {
    verifyWebhookSignature,
    mapGitHubStateToLifecycle,
    buildExternalId,
    parseWebhookPayload,
    convertMarkdownToHtml,
} from "./github.js";
import { createHmac } from "node:crypto";

describe("verifyWebhookSignature", () => {
    const secret = "test-secret-123";

    function computeSignature({ payload }: { payload: string }): string {
        return (
            "sha256=" +
            createHmac("sha256", secret).update(payload).digest("hex")
        );
    }

    it("accepts a valid signature", () => {
        const payload = '{"action":"opened"}';
        const signature = computeSignature({ payload });
        expect(
            verifyWebhookSignature({ payload, signature, secret }),
        ).toBe(true);
    });

    it("rejects an invalid signature", () => {
        const payload = '{"action":"opened"}';
        expect(
            verifyWebhookSignature({
                payload,
                signature: "sha256=0000000000000000000000000000000000000000000000000000000000000000",
                secret,
            }),
        ).toBe(false);
    });

    it("rejects a tampered payload", () => {
        const original = '{"action":"opened"}';
        const tampered = '{"action":"closed"}';
        const signature = computeSignature({ payload: original });
        expect(
            verifyWebhookSignature({
                payload: tampered,
                signature,
                secret,
            }),
        ).toBe(false);
    });

    it("rejects a wrong-length signature", () => {
        expect(
            verifyWebhookSignature({
                payload: "test",
                signature: "sha256=short",
                secret,
            }),
        ).toBe(false);
    });
});

describe("mapGitHubStateToLifecycle", () => {
    it("maps open issue to active", () => {
        expect(
            mapGitHubStateToLifecycle({
                state: "open",
                stateReason: null,
            }),
        ).toBe("active");
    });

    it("maps open issue with reopened reason to active", () => {
        expect(
            mapGitHubStateToLifecycle({
                state: "open",
                stateReason: "reopened",
            }),
        ).toBe("active");
    });

    it("maps closed/completed to completed", () => {
        expect(
            mapGitHubStateToLifecycle({
                state: "closed",
                stateReason: "completed",
            }),
        ).toBe("completed");
    });

    it("maps closed/not_planned to canceled", () => {
        expect(
            mapGitHubStateToLifecycle({
                state: "closed",
                stateReason: "not_planned",
            }),
        ).toBe("canceled");
    });

    it("maps closed with null reason to completed", () => {
        expect(
            mapGitHubStateToLifecycle({
                state: "closed",
                stateReason: null,
            }),
        ).toBe("completed");
    });

    it("maps closed/duplicate to canceled", () => {
        expect(
            mapGitHubStateToLifecycle({
                state: "closed",
                stateReason: "duplicate",
            }),
        ).toBe("canceled");
    });

    it("maps closed with unknown reason to canceled", () => {
        expect(
            mapGitHubStateToLifecycle({
                state: "closed",
                stateReason: "some_future_reason",
            }),
        ).toBe("canceled");
    });
});

describe("buildExternalId", () => {
    it("builds correct format", () => {
        expect(
            buildExternalId({ repo: "owner/repo", issueNumber: 42 }),
        ).toBe("owner/repo#42");
    });
});

describe("parseWebhookPayload", () => {
    it("parses a valid labeled payload", () => {
        const raw = {
            action: "labeled",
            issue: {
                number: 99,
                title: "Test feature",
                body: "Description here",
                state: "open",
                state_reason: null,
                html_url: "https://github.com/owner/repo/issues/99",
                labels: [{ name: "roadmap" }],
                assignees: [{ login: "user1" }],
                milestone: { title: "v1.0" },
            },
            label: { name: "roadmap" },
            repository: { full_name: "owner/repo" },
        };

        const result = parseWebhookPayload({ rawPayload: raw });
        expect(result.action).toBe("labeled");
        expect(result.issue.number).toBe(99);
        expect(result.issue.title).toBe("Test feature");
        expect(result.issue.labels).toHaveLength(1);
        expect(result.label?.name).toBe("roadmap");
        expect(result.repository.full_name).toBe("owner/repo");
    });

    it("parses a closed payload with not_planned reason", () => {
        const raw = {
            action: "closed",
            issue: {
                number: 5,
                title: "Won't do",
                body: null,
                state: "closed",
                state_reason: "not_planned",
                html_url: "https://github.com/owner/repo/issues/5",
                labels: [{ name: "roadmap" }],
                assignees: [],
                milestone: null,
            },
            repository: { full_name: "owner/repo" },
        };

        const result = parseWebhookPayload({ rawPayload: raw });
        expect(result.action).toBe("closed");
        expect(result.issue.state).toBe("closed");
        expect(result.issue.state_reason).toBe("not_planned");
    });

    it("handles missing optional fields", () => {
        const raw = {
            action: "opened",
            issue: {
                number: 1,
                title: "Minimal",
                body: null,
                state: "open",
                html_url: "https://github.com/owner/repo/issues/1",
                labels: [],
                assignees: [],
            },
            repository: { full_name: "owner/repo" },
        };

        const result = parseWebhookPayload({ rawPayload: raw });
        expect(result.issue.state_reason).toBeNull();
        expect(result.issue.milestone).toBeNull();
        expect(result.label).toBeUndefined();
    });

    it("throws on invalid payload", () => {
        expect(() =>
            parseWebhookPayload({ rawPayload: { bad: "data" } }),
        ).toThrow();
    });
});

describe("convertMarkdownToHtml", () => {
    it("returns null for null input", () => {
        expect(convertMarkdownToHtml({ markdown: null })).toBeNull();
    });

    it("returns null for empty string", () => {
        expect(convertMarkdownToHtml({ markdown: "" })).toBeNull();
    });

    it("returns null for whitespace-only string", () => {
        expect(convertMarkdownToHtml({ markdown: "   \n  " })).toBeNull();
    });

    it("wraps simple text in a paragraph", () => {
        expect(
            convertMarkdownToHtml({ markdown: "Hello world" }),
        ).toBe("<p>Hello world</p>\n");
    });

    it("converts **bold** to <strong>", () => {
        expect(
            convertMarkdownToHtml({ markdown: "This is **bold** text" }),
        ).toBe("<p>This is <strong>bold</strong> text</p>\n");
    });

    it("converts *italic* to <em>", () => {
        expect(
            convertMarkdownToHtml({ markdown: "This is *italic* text" }),
        ).toBe("<p>This is <em>italic</em> text</p>\n");
    });

    it("converts bullet list to <ul>/<li>", () => {
        expect(
            convertMarkdownToHtml({
                markdown: "- item 1\n- item 2\n- item 3",
            }),
        ).toBe(
            "<ul>\n<li>item 1</li>\n<li>item 2</li>\n<li>item 3</li>\n</ul>\n",
        );
    });

    it("converts numbered list to <ol>/<li>", () => {
        expect(
            convertMarkdownToHtml({ markdown: "1. first\n2. second" }),
        ).toBe("<ol>\n<li>first</li>\n<li>second</li>\n</ol>\n");
    });

    it("strips markdown links but preserves link text", () => {
        // [text](url) → <a> → sanitizer strips <a> → plain text remains
        expect(
            convertMarkdownToHtml({
                markdown: "See [docs](https://example.com)",
            }),
        ).toBe("<p>See docs</p>\n");
    });

    it("linkifies plain URLs into clickable <a> tags", () => {
        expect(
            convertMarkdownToHtml({
                markdown: "Visit https://example.com for more",
            }),
        ).toBe(
            '<p>Visit <a href="https://example.com" target="_blank" rel="noopener noreferrer nofollow">https://example.com</a> for more</p>\n',
        );
    });

    it("strips <script> tags completely", () => {
        expect(
            convertMarkdownToHtml({
                markdown: 'Hello <script>alert("xss")</script> world',
            }),
        ).toBe("<p>Hello  world</p>\n");
    });

    it("strips headings to plain text", () => {
        expect(
            convertMarkdownToHtml({
                markdown: "# Heading\n\nParagraph text",
            }),
        ).toBe("Heading\n<p>Paragraph text</p>\n");
    });

    it("strips code blocks to plain text", () => {
        expect(
            convertMarkdownToHtml({
                markdown: "```\nconsole.log('hello')\n```",
            }),
        ).toBe("console.log('hello')\n\n");
    });

    it("strips GFM strikethrough (~~) to plain text", () => {
        expect(
            convertMarkdownToHtml({
                markdown: "This is ~~deleted~~ text",
            }),
        ).toBe("<p>This is deleted text</p>\n");
    });

    it("handles a realistic GitHub issue body end-to-end", () => {
        const markdown = [
            "## Feature",
            "",
            "**Bold** and *italic*",
            "",
            "- item 1",
            "- item 2",
            "",
            "Visit https://example.com",
        ].join("\n");

        expect(convertMarkdownToHtml({ markdown })).toBe(
            'Feature\n<p><strong>Bold</strong> and <em>italic</em></p>\n<ul>\n<li>item 1</li>\n<li>item 2</li>\n</ul>\n<p>Visit <a href="https://example.com" target="_blank" rel="noopener noreferrer nofollow">https://example.com</a></p>\n',
        );
    });

    it("truncates text content to ~1000 chars", () => {
        const longText = "A".repeat(2000);
        const result = convertMarkdownToHtml({ markdown: longText });
        expect(result).not.toBeNull();
        // Strip tags to get raw text length
        const textOnly = result?.replace(/<[^>]*>/g, "").trim() ?? "";
        expect(textOnly.length).toBeLessThanOrEqual(1000);
    });

    it("final HTML fits within varchar(3000)", () => {
        const markdown = Array.from(
            { length: 200 },
            (_, i) => `- **Item ${String(i)}** with *formatting*`,
        ).join("\n");
        const result = convertMarkdownToHtml({ markdown });
        expect(result).not.toBeNull();
        expect(result?.length ?? 0).toBeLessThanOrEqual(3000);
    });
});
