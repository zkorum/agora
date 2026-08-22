import { describe, expect, it } from "vitest";
import { renderConversationEmail } from "./renderer.js";

const base = {
    subject: "A <critical> update",
    bodyHtml:
        '<p>Hello <strong>participants</strong></p><script>alert("x")</script>',
    bodyPlainText: "Hello participants",
    projectTitle: "Harbor & Streets",
    conversations: [
        {
            title: "Trees <script>",
            url: "https://www.agoracitizen.app/conversation/trees/",
        },
    ],
    language: "en" as const,
};

describe("conversation email renderer", () => {
    it("escapes chrome and sanitizes the stored authored body", () => {
        const rendered = renderConversationEmail({
            ...base,
            variant: "participant",
            actions: {
                unsubscribeUrl: "https://www.agoracitizen.app/unsubscribe/one",
                manageUrl: "https://www.agoracitizen.app/preferences/two",
                reportUrl: "https://www.agoracitizen.app/report/three",
            },
        });
        expect(rendered.html).toContain("A &lt;critical&gt; update");
        expect(rendered.html).toContain("Harbor &amp; Streets");
        expect(rendered.html).not.toContain("<script>");
        expect(rendered.text).not.toContain("alert");
        expect(rendered.html).toContain("/unsubscribe/one");
        expect(rendered.text).toContain("/preferences/two");
    });

    it("derives readable plain text from the same sanitized HTML", () => {
        const rendered = renderConversationEmail({
            ...base,
            bodyHtml:
                "<p>Tasks:</p><ol><li>Register</li><li>Vote<ul><li>Early</li></ul></li></ol><p><strike>Old wording</strike></p>",
            bodyPlainText:
                "Tasks:\n\n1. Register\n2. Vote\n    - Early\n\nOld wording",
            variant: "test",
            actions: undefined,
        });

        expect(rendered.html).toContain("<strike>Old wording</strike>");
        expect(rendered.text).toContain(
            "Tasks:\n\n1. Register\n2. Vote\n    - Early\n\nOld wording",
        );
    });

    it("neutralizes invalid URLs in both alternatives", () => {
        const rendered = renderConversationEmail({
            ...base,
            conversations: [{ title: "Unsafe", url: "javascript:alert(1)" }],
            variant: "participant",
            actions: {
                unsubscribeUrl: "not a URL",
                manageUrl: "https://www.agoracitizen.app/preferences/two",
                reportUrl: "https://www.agoracitizen.app/report/three",
            },
        });

        expect(rendered.html).not.toContain("javascript:");
        expect(rendered.html).toContain('href="#"');
        expect(rendered.text).not.toContain("javascript:");
        expect(rendered.text).toContain("- Unsafe: #");
    });

    it("renders tests with a marker and no participant action URLs", () => {
        const rendered = renderConversationEmail({
            ...base,
            variant: "test",
            actions: undefined,
        });
        expect(rendered.subject).toBe("[TEST] A <critical> update");
        expect(rendered.html).toContain("TEST EMAIL");
        expect(rendered.html).not.toContain("Unsubscribe from these updates");
        expect(rendered.text).not.toContain("/unsubscribe/");
        expect(rendered.text).not.toContain("because you chose email updates");
    });

    it("renders owner copies without participant actions", () => {
        const rendered = renderConversationEmail({
            ...base,
            variant: "owner_copy",
            actions: undefined,
        });
        expect(rendered.text).toContain("mandatory copy");
        expect(rendered.html).not.toContain("Manage preferences");
    });
});
