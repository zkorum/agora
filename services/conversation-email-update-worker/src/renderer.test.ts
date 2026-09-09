import { parseHTML } from "linkedom";
import { describe, expect, it } from "vitest";
import {
    createConversationEmailPreviewDocument,
    renderConversationEmail,
    type RenderConversationEmailParams,
    type RenderConversationEmailParamsCommon,
} from "@/generated/email/render.js";
import {
    ZodSupportedDisplayLanguageCodes,
    getLanguageTextDirection,
    type SupportedDisplayLanguageCodes,
} from "@/shared/languages.js";

const content = {
    subject: "A <critical> update",
    bodyHtml:
        '<p>Hello <strong>participants</strong></p><script>alert("x")</script>',
    bodyPlainText: "Hello participants",
    branding: { name: "Harbor & Streets", palette: "blue" },
    conversations: [
        {
            title: "Trees <script>",
            url: "https://example.org/conversation/trees/",
        },
    ],
    language: "en",
} satisfies RenderConversationEmailParamsCommon;
const actions = {
    unsubscribeScope: "project",
    unsubscribeUrl: "https://example.org/unsubscribe/one",
    manageUrl: "https://example.org/preferences/two",
    reportUrl: "https://example.org/report/three",
} satisfies Extract<
    RenderConversationEmailParams,
    { actions: unknown }
>["actions"];

const adminLabels: Record<SupportedDisplayLanguageCodes, string> = {
    en: "Admin Copy",
    fr: "Copie admin",
    es: "Copia de administración",
    "zh-Hans": "管理员副本",
    "zh-Hant": "管理員副本",
    ja: "管理者用コピー",
    ar: "نسخة إدارية",
    he: "עותק למנהל",
    fa: "نسخه مدیر",
    ky: "Администратор көчүрмөсү",
    ru: "Копия для администратора",
};

describe("compiled Vue email renderer", () => {
    for (const language of ZodSupportedDisplayLanguageCodes.options) {
        const variants = [
            "test",
            "participant",
            "owner_copy",
        ] satisfies RenderConversationEmailParams["variant"][];
        it.each(variants)(
            `renders ${language} %s without a Vue loader or browser`,
            async (variant) => {
                const email = await renderConversationEmail(
                    variant === "test"
                        ? { ...content, language, variant }
                        : { ...content, language, variant, actions },
                );
                const { document } = parseHTML(email.html);
                expect(document.documentElement.lang).toBe(language);
                expect(document.documentElement.dir).toBe(
                    getLanguageTextDirection(language),
                );
                expect(document.title).toBe(
                    variant === "owner_copy"
                        ? `[${adminLabels[language]}] ${content.subject}`
                        : content.subject,
                );
                expect(document.body.textContent).not.toContain(
                    content.subject,
                );
                expect(email.text).not.toContain(content.subject);
                expect(document.querySelectorAll("script")).toHaveLength(0);
                expect(email.text).toContain(content.bodyPlainText);
                expect(
                    email.text.startsWith(`${content.branding.name}\n`),
                ).toBe(true);
                expect(document.body.textContent).toContain(
                    content.branding.name,
                );
                expect(document.body.textContent.match(/Agora/g)).toHaveLength(
                    1,
                );
                expect(email.subject).toBe(
                    variant === "test"
                        ? `[TEST] ${content.subject}`
                        : variant === "owner_copy"
                          ? `[${adminLabels[language]}] ${content.subject}`
                          : content.subject,
                );
                expect(document.querySelectorAll("a")).toHaveLength(
                    variant === "test" ? 2 : variant === "owner_copy" ? 3 : 5,
                );
                if (variant === "owner_copy") {
                    expect(
                        document.querySelectorAll(
                            'a[href*="/unsubscribe/"], a[href*="/preferences/"]',
                        ),
                    ).toHaveLength(0);
                    expect(email.text).not.toContain(actions.unsubscribeUrl);
                    expect(email.text).not.toContain(actions.manageUrl);
                    expect(email.text).not.toContain(
                        `[${adminLabels[language]}]`,
                    );
                    expect(email.text).toContain(actions.reportUrl);
                }
                expect(email.html).not.toContain("GENERATED FROM");
            },
        );
    }

    it("escapes branding and strips authored active markup and attributes", async () => {
        const name = 'Harbor <img src=x onerror="alert(1)"> & team';
        const email = await renderConversationEmail({
            ...content,
            branding: {
                name,
                palette: "purple",
                imageUrl: "javascript:alert(1)",
            },
            bodyHtml:
                '<p style="display:none" onclick="alert(1)">Safe <strong>body</strong></p><img src="https://tracker.invalid/pixel"><iframe src="https://tracker.invalid"></iframe><svg onload="alert(1)"></svg><style>body{display:none}</style><meta http-equiv="refresh" content="0;url=https://tracker.invalid"><script>alert(1)</script>',
            variant: "test",
        });
        const { document } = parseHTML(email.html);
        expect(document.body.textContent).toContain(name);
        expect(
            document.querySelectorAll(
                "img, script, iframe, svg, style, [onclick], [onerror], meta[http-equiv]",
            ),
        ).toHaveLength(0);
        expect(email.html).toContain("<p>Safe <strong>body</strong></p>");
        expect(email.html).not.toContain("tracker.invalid");
    });

    it.each([
        "javascript:alert(1)",
        "java\nscript:alert(1)",
        "data:text/html,<script>x</script>",
        "file:///etc/passwd",
        "//attacker.example/path",
        "not a URL",
        "https://user:password@example.org/",
    ])("neutralizes unsafe URLs: %s", async (url) => {
        const email = await renderConversationEmail({
            ...content,
            conversations: [{ title: "Unsafe", url }],
            variant: "participant",
            actions: {
                unsubscribeScope: "project",
                unsubscribeUrl: url,
                manageUrl: url,
                reportUrl: url,
            },
        });
        const { document } = parseHTML(email.html);
        expect(document.querySelectorAll('a[href="#"]')).toHaveLength(4);
        expect(email.text.match(/: #/g)).toHaveLength(4);
    });

    it("preserves the stored plaintext alternative and ordering", async () => {
        const bodyPlainText = "Tasks:\n\n1. Register\n2. Vote\n    - Early";
        const email = await renderConversationEmail({
            ...content,
            bodyPlainText,
            variant: "test",
            conversations: [
                { title: "Zebra", url: "https://example.org/z" },
                { title: "Apple", url: "https://example.org/a" },
            ],
        });
        expect(email.text).toContain(bodyPlainText);
        expect(email.text.indexOf("Apple")).toBeLessThan(
            email.text.indexOf("Zebra"),
        );
    });

    it.each(["River Association", "alex"])(
        "keeps No Project copy scope-neutral for %s",
        async (name) => {
            const email = await renderConversationEmail({
                ...content,
                branding: { name, palette: "green" },
                variant: "owner_copy",
                actions: { reportUrl: actions.reportUrl },
            });
            expect(email.text).toContain(
                "Reply to this email to contact the facilitator.",
            );
            expect(email.subject).toBe(`[Admin Copy] ${content.subject}`);
            expect(email.text).not.toContain("operational owner");
            expect(email.text).not.toContain("You opted in");
            expect(email.text).not.toContain("project");
            expect(email.text).not.toContain("Unsubscribe");
            expect(email.text).not.toContain("Manage preferences");
        },
    );

    it("keeps participant footer actions compact and readable", async () => {
        const email = await renderConversationEmail({
            ...content,
            variant: "participant",
            actions,
        });
        const { document } = parseHTML(email.html);
        const footer = Array.from(document.querySelectorAll("td")).at(-1);
        expect(footer?.getAttribute("style")).toContain("font-size:14px");
        expect(footer?.querySelectorAll("p")).toHaveLength(3);
        expect(
            Array.from(footer?.querySelectorAll("a") ?? []).map(
                (link) => link.textContent,
            ),
        ).toEqual([
            "Unsubscribe",
            "Manage preferences",
            "Report this update",
            "Agora",
        ]);
        expect(footer?.querySelector("p")?.textContent).toBe(
            "You opted in to conversation updates. Reply to this email to contact the facilitator.",
        );
        expect(
            footer?.querySelector('a[href="https://www.agoracitizen.app"]')
                ?.textContent,
        ).toBe("Agora");
        expect(email.text).toContain(
            "Powered by Agora: https://www.agoracitizen.app",
        );
        expect(email.html).not.toContain("linear-gradient");
        expect(email.text).not.toContain(
            "or unsubscribe from specific conversations",
        );
    });

    it.each(["en", "ar"] as const)(
        "links project titles with a direction-aware cue in %s",
        async (language) => {
            const projectUrl = "https://example.org/project/harbor/";
            const email = await renderConversationEmail({
                ...content,
                language,
                variant: "test",
                branding: {
                    ...content.branding,
                    scopeKind: "project",
                    projectUrl,
                },
            });
            const { document } = parseHTML(email.html);
            const titleLink = document.querySelector("p a");
            expect(titleLink?.getAttribute("href")).toBe(projectUrl);
            expect(titleLink?.getAttribute("target")).toBe("_blank");
            expect(
                titleLink?.querySelector('[aria-hidden="true"]')?.textContent,
            ).toBe(language === "ar" ? "↖" : "↗");
            expect(email.text).toContain(
                `${content.branding.name}: ${projectUrl}`,
            );
        },
    );

    it.each([
        "javascript:alert(1)",
        "https://user:password@example.org/project/",
        "not a URL",
    ])("omits unsafe project title links: %s", async (projectUrl) => {
        const email = await renderConversationEmail({
            ...content,
            variant: "test",
            branding: { ...content.branding, scopeKind: "project", projectUrl },
        });
        expect(
            parseHTML(email.html)
                .document.querySelector("p")
                ?.querySelector("a"),
        ).toBeNull();
        expect(email.text).not.toContain(projectUrl);
    });

    it("does not add a project link to no-project titles", async () => {
        const email = await renderConversationEmail({
            ...content,
            variant: "test",
            branding: {
                ...content.branding,
                scopeKind: "no-project",
                projectUrl: "https://example.org/project/harbor/",
            },
        });
        expect(
            parseHTML(email.html)
                .document.querySelector("p")
                ?.querySelector("a"),
        ).toBeNull();
    });

    it("builds an inert preview with a controlled image allowlist", async () => {
        const email = await renderConversationEmail({
            ...content,
            branding: {
                ...content.branding,
                scopeKind: "no-project",
                imageUrl: "https://images.example.org/logo.png",
                bannerImageUrl: "https://tracker.invalid/banner.png",
            },
            variant: "participant",
            actions,
        });
        const preview = createConversationEmailPreviewDocument({
            email,
            imageOrigins: [
                "https://images.example.org/path",
                "javascript:alert(1)",
            ],
        });
        const { document } = parseHTML(preview.html);
        expect(
            document.head.firstElementChild?.getAttribute("http-equiv"),
        ).toBe("Content-Security-Policy");
        expect(
            document.head.firstElementChild?.getAttribute("content"),
        ).toContain("img-src https://images.example.org;");
        expect(
            document.head.firstElementChild?.getAttribute("content"),
        ).toContain("script-src 'none'");
        expect(
            document.head.firstElementChild?.getAttribute("content"),
        ).toContain("form-action 'none'");
        expect(document.querySelectorAll("[href]")).toHaveLength(0);
        expect(document.querySelectorAll("img")).toHaveLength(1);
        expect(preview.html).not.toContain("tracker.invalid");
        expect(preview.text).toBe(email.text);
        expect(preview.subject).toBe(email.subject);
        expect(email.html).toContain(
            'href="https://example.org/unsubscribe/one"',
        );
    });
});
