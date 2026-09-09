import { parseHTML } from "linkedom";
import { describe, expect, it } from "vitest";
import {
    createConversationEmailPreviewDocument,
    renderConversationEmail,
} from "@/generated/email/render.js";
import { Dto } from "@/shared/types/dto.js";
import { projectOrganizationAttributionRoleValues } from "@/shared/types/project.js";
import { createConversationEmailExampleBranding } from "./conversationEmailUpdateDevFixtures.js";

const siteBaseUrl = "https://app.example.org";
const common = {
    subject: "Our next steps",
    bodyHtml: "<p>Thank you for <strong>participating</strong>.</p>",
    bodyPlainText: "Thank you for participating.",
    conversations: [],
    language: "en",
    variant: "test",
} as const;

describe("dev examples through the production email renderer", () => {
    it("keeps project headers title-only across background and credit combinations", async () => {
        for (const backgroundPicture of [false, true]) {
            for (let mask = 0; mask < 8; mask += 1) {
                for (const attributionLogos of [false, true]) {
                    const roles =
                        projectOrganizationAttributionRoleValues.filter(
                            (_, index) => (mask & (1 << index)) !== 0,
                        );
                    const request =
                        Dto.conversationEmailUpdateDevPreviewRequest.parse({
                            fixture: "project",
                            backgroundPicture,
                            attributions: roles,
                            attributionLogos,
                            language: "en",
                            variant: "test",
                        });
                    const branding = createConversationEmailExampleBranding({
                        example: request,
                        language: "en",
                        siteBaseUrl,
                    });
                    const email = await renderConversationEmail({
                        ...common,
                        branding,
                    });
                    expect(
                        parseHTML(email.html)
                            .document.querySelector("p a")
                            ?.getAttribute("href"),
                    ).toBe("https://app.example.org/project/amplify/");
                    const preview = createConversationEmailPreviewDocument({
                        email,
                        imageOrigins: [siteBaseUrl],
                    });
                    const { document } = parseHTML(preview.html);
                    expect(document.querySelectorAll("img")).toHaveLength(
                        Number(backgroundPicture) +
                            (attributionLogos ? roles.length : 0),
                    );
                    const headings = Array.from(
                        document.querySelectorAll("h2"),
                    ).map((node) => node.textContent);
                    expect(headings.includes("Project Owners")).toBe(
                        roles.includes("project_owner"),
                    );
                    expect(headings.includes("Sponsors")).toBe(
                        roles.includes("sponsor"),
                    );
                    expect(headings.includes("Partners")).toBe(
                        roles.includes("partner"),
                    );
                    expect(headings.at(-1)).toBe("Included conversations");
                    if (roles.includes("partner")) {
                        expect(email.text.indexOf("Partners")).toBeLessThan(
                            email.text.indexOf("Included conversations"),
                        );
                    }
                    expect(email.text.includes("European Union")).toBe(
                        roles.includes("sponsor"),
                    );
                    expect(
                        email.text.includes("Search for Common Ground"),
                    ).toBe(roles.includes("partner"));
                    expect(document.querySelector("strong")?.textContent).toBe(
                        "participating",
                    );
                    expect(document.querySelectorAll("[href]")).toHaveLength(0);
                    const header = document.querySelector("p")?.closest("tr");
                    expect(
                        header
                            ?.querySelector("a")
                            ?.firstChild?.textContent?.trim(),
                    ).toBe(branding.name);
                    expect(header?.children).toHaveLength(1);
                    expect(
                        header?.querySelectorAll("img, span[aria-label]"),
                    ).toHaveLength(0);
                    expect(document.body.textContent).not.toContain(
                        common.subject,
                    );
                    expect(email.text).not.toContain(common.subject);
                }
            }
        }
    });

    it.each([
        { fixture: "personal" },
        { fixture: "organization", organizationLogo: false },
        { fixture: "organization", organizationLogo: true },
    ])(
        "renders no-project example %j without project branding",
        async (example) => {
            const request = Dto.conversationEmailUpdateDevPreviewRequest.parse({
                ...example,
                language: "en",
                variant: "test",
            });
            const branding = createConversationEmailExampleBranding({
                example: request,
                language: "en",
                siteBaseUrl,
            });
            const email = await renderConversationEmail({
                ...common,
                branding,
            });
            const { document } = parseHTML(email.html);
            expect(document.querySelectorAll("img")).toHaveLength(
                example.organizationLogo === true ? 1 : 0,
            );
            const header = document.querySelector("p")?.closest("tr");
            expect(header?.children).toHaveLength(2);
            expect(
                header?.children[0]?.querySelector("img, span"),
            ).toBeTruthy();
            expect(header?.children[1]?.textContent).toBe(branding.name);
            expect(email.text).not.toContain("Project Owners");
            expect(email.text).not.toContain("Sponsors");
            expect(email.text).not.toContain("Partners");
            expect(email.text).toContain(
                example.fixture === "personal" ? "Alex Citizen" : "Civic Union",
            );
        },
    );

    it("rejects project-only options on no-project examples and unbounded attribution inputs", () => {
        const input = { language: "en", variant: "test" };
        expect(
            Dto.conversationEmailUpdateDevPreviewRequest.safeParse({
                ...input,
                fixture: "personal",
                backgroundPicture: true,
            }).success,
        ).toBe(false);
        expect(
            Dto.conversationEmailUpdateDevPreviewRequest.safeParse({
                ...input,
                fixture: "organization",
                attributions: ["sponsor"],
            }).success,
        ).toBe(false);
        expect(
            Dto.conversationEmailUpdateDevPreviewRequest.safeParse({
                ...input,
                fixture: "project",
                attributions: ["sponsor", "sponsor"],
            }).success,
        ).toBe(false);
        expect(
            Dto.conversationEmailUpdateDevPreviewRequest.safeParse({
                ...input,
                fixture: "project",
                imageUrl: "https://untrusted.example.org/pixel",
            }).success,
        ).toBe(false);
    });
});
