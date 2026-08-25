import { describe, expect, it } from "vitest";
import type { SupportedDisplayLanguageCodes } from "@/shared/languages.js";
import {
    renderConversationEmail,
    type ConversationEmailActionLinks,
} from "./renderer.js";

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

const actions = {
    unsubscribeScope: "project",
    unsubscribeUrl: "https://www.agoracitizen.app/unsubscribe/one",
    manageUrl: "https://www.agoracitizen.app/preferences/two",
    reportUrl: "https://www.agoracitizen.app/report/three",
} satisfies ConversationEmailActionLinks;

const supportedLanguages = [
    "en",
    "es",
    "fr",
    "zh-Hant",
    "zh-Hans",
    "ja",
    "ar",
    "fa",
    "he",
    "ky",
    "ru",
] satisfies readonly SupportedDisplayLanguageCodes[];

const ownerExplanationSnippets: Record<SupportedDisplayLanguageCodes, string> =
    {
        en: "Participant email preferences do not disable operational owner copies",
        es: "Las preferencias de seguimiento por correo de los participantes no desactivan",
        fr: "Les préférences de suivi par e-mail des participants ne désactivent pas",
        "zh-Hant": "參與者的電子郵件偏好不會停用",
        "zh-Hans": "参与者的电子邮件偏好不会停用",
        ja: "参加者のメール設定で運用上の所有者向けコピーが無効になることはありません",
        ar: "لا تؤدي تفضيلات البريد الإلكتروني للمشاركين إلى تعطيل",
        fa: "ترجیحات ایمیلی شرکت‌کنندگان نسخه‌های عملیاتی مالک را غیرفعال نمی‌کند",
        he: "העדפות הדוא״ל של המשתתפים אינן משביתות",
        ky: "Катышуучулардын электрондук почта жөндөөлөрү ээсине арналган операциялык көчүрмөлөрдү өчүрбөйт",
        ru: "Настройки электронной почты участников не отключают",
    };

describe("conversation email renderer", () => {
    it("escapes chrome and sanitizes the stored authored body", () => {
        const rendered = renderConversationEmail({
            ...base,
            variant: "participant",
            actions,
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
                unsubscribeScope: "project",
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
        });
        expect(rendered.subject).toBe("[TEST] A <critical> update");
        expect(rendered.html).toContain("TEST EMAIL");
        expect(rendered.html).not.toContain("Unsubscribe from these updates");
        expect(rendered.text).not.toContain("/unsubscribe/");
        expect(rendered.text).not.toContain("because you chose email updates");
    });

    it("renders context-aware unsubscribe copy", () => {
        const rendered = renderConversationEmail({
            ...base,
            variant: "participant",
            actions: {
                ...actions,
                unsubscribeScope: "conversation",
            },
        });

        expect(rendered.text).toContain(
            "Unsubscribe from updates for this conversation",
        );
        expect(rendered.text).not.toContain(
            "Unsubscribe from updates for this project",
        );
    });

    it.each(supportedLanguages)(
        "renders operational owner explanation and active footer actions in %s",
        (language) => {
            const rendered = renderConversationEmail({
                ...base,
                language,
                variant: "owner_copy",
                actions,
            });

            expect(rendered.html).toContain("/unsubscribe/one");
            expect(rendered.text).toContain("/preferences/two");
            expect(rendered.text).toContain("/report/three");
            expect(rendered.text).toContain(ownerExplanationSnippets[language]);
        },
    );

    it("accurately describes the operational English owner copy", () => {
        const rendered = renderConversationEmail({
            ...base,
            variant: "owner_copy",
            actions,
        });
        expect(rendered.text).toContain("operational owner copy");
        expect(rendered.text).toContain(
            "authorized to manage Email Updates for an organization that owns this project",
        );
        expect(rendered.text).toContain(
            "Participant email preferences do not disable operational owner copies",
        );
        expect(rendered.html).not.toContain("own a selected conversation");
    });
});
