import { parseHTML } from "linkedom";
import { describe, expect, it } from "vitest";
import {
    createConversationEmailPreviewDocument,
    renderConversationEmail,
} from "@/generated/email/render.js";
import type { EmailBranding } from "@/shared/branding/emailBranding.js";
import {
    conversationEmailImageOrigins,
    resolveConversationEmailImage,
} from "./conversationEmailUpdateImages.js";

const baseImageServiceUrl = "https://app.example.org/images/";
const s3Origin = "https://branding.s3.eu-west-1.amazonaws.com";
const ownerLogo = `${s3Origin}/owner.png`;
const sponsorLogo = `${s3Origin}/sponsor.png`;

describe("stored branding images in the actual email template", () => {
    it("preserves public absolute S3 logos as well as image-service paths", () => {
        expect(
            resolveConversationEmailImage({
                imagePath: ownerLogo,
                isFullImagePath: true,
                baseImageServiceUrl,
            }),
        ).toBe(ownerLogo);
        expect(
            resolveConversationEmailImage({
                imagePath: "owner.png",
                isFullImagePath: false,
                baseImageServiceUrl,
            }),
        ).toBe(`${baseImageServiceUrl}owner.png`);
    });

    it.each([
        null,
        "",
        "javascript:alert(1)",
        "data:image/png;base64,AA",
        "https://user:pass@example.org/logo.png",
    ])("omits absent or unsafe stored image %s", (imagePath) => {
        expect(
            resolveConversationEmailImage({
                imagePath,
                isFullImagePath: true,
                baseImageServiceUrl,
            }),
        ).toBeUndefined();
    });

    it.each(["test", "participant", "owner_copy"] as const)(
        "keeps S3 sponsor/owner logos and the banner in %s delivery and preview HTML",
        async (variant) => {
            const resolveImage = (imagePath: string) =>
                resolveConversationEmailImage({
                    imagePath,
                    isFullImagePath: true,
                    baseImageServiceUrl,
                });
            const banner = `${baseImageServiceUrl}banner.png`;
            const branding: EmailBranding = {
                name: "Logo regression project",
                scopeKind: "project",
                palette: "blue",
                bannerImageUrl: resolveImage(banner),
                attributions: [
                    {
                        role: "sponsor",
                        displayName: "Sponsor",
                        imageUrl: resolveImage(sponsorLogo),
                    },
                    {
                        role: "project_owner",
                        displayName: "Owner",
                        imageUrl: resolveImage(ownerLogo),
                    },
                    { role: "partner", displayName: "Without logo" },
                ],
            };
            const common = {
                subject: "Logo regression",
                bodyHtml:
                    '<p>Update</p><img src="https://untrusted.example/pixel.png">',
                bodyPlainText: "Update",
                branding,
                conversations: [],
                language: "en",
            } as const;
            const actions = {
                unsubscribeScope: "project",
                unsubscribeUrl: "https://app.example.org/unsubscribe",
                manageUrl: "https://app.example.org/manage",
                reportUrl: "https://app.example.org/report",
            } as const;
            const email = await renderConversationEmail(
                variant === "test"
                    ? { ...common, variant }
                    : { ...common, variant, actions },
            );
            const imageOrigins = conversationEmailImageOrigins(branding);
            expect(imageOrigins).toEqual(["https://app.example.org", s3Origin]);
            const preview = createConversationEmailPreviewDocument({
                email,
                imageOrigins,
            });
            for (const rendered of [email, preview]) {
                const { document } = parseHTML(rendered.html);
                expect(
                    Array.from(document.querySelectorAll("img"), (image) =>
                        image.getAttribute("src"),
                    ),
                ).toEqual([banner, sponsorLogo, ownerLogo]);
                expect(document.body.textContent).toContain("Without logo");
            }
            const policy = parseHTML(preview.html)
                .document.querySelector(
                    'meta[http-equiv="Content-Security-Policy"]',
                )
                ?.getAttribute("content");
            expect(policy).toContain(
                `img-src https://app.example.org ${s3Origin};`,
            );
            expect(policy).not.toContain("untrusted.example");
        },
    );

    it("keeps the organization header logo for no-project updates", async () => {
        const branding: EmailBranding = {
            name: "Organization",
            scopeKind: "no-project",
            palette: "blue",
            imageUrl: resolveConversationEmailImage({
                imagePath: ownerLogo,
                isFullImagePath: true,
                baseImageServiceUrl,
            }),
        };
        const email = await renderConversationEmail({
            subject: "Update",
            bodyHtml: "<p>Update</p>",
            bodyPlainText: "Update",
            branding,
            conversations: [],
            language: "en",
            variant: "test",
        });
        const preview = createConversationEmailPreviewDocument({
            email,
            imageOrigins: conversationEmailImageOrigins(branding),
        });
        expect(
            parseHTML(preview.html)
                .document.querySelector("img")
                ?.getAttribute("src"),
        ).toBe(ownerLogo);
    });
});
