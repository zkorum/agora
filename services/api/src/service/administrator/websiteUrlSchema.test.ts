import { describe, expect, it } from "vitest";
import { Dto } from "@/shared/types/dto.js";
import { zodHttpsUrl } from "@/shared/types/zod.js";

const organization = {
    name: "Example Organization",
    slug: "example-organization",
    description: "",
    defaultLanguageCode: "en",
    localizations: [],
    canUseDynamicTranslation: false,
};

describe("website URL schemas", () => {
    it("accepts HTTPS website URLs", () => {
        const result = Dto.getOrganizationDetailsResponse.safeParse({
            organization: {
                ...organization,
                websiteUrl: "https://example.com",
            },
        });

        expect(result.success).toBe(true);
    });

    it("rejects HTTP website URLs", () => {
        const result = Dto.getOrganizationDetailsResponse.safeParse({
            organization: {
                ...organization,
                websiteUrl: "http://example.com",
            },
        });

        expect(result.success).toBe(false);
    });

    it("rejects URLs with embedded credentials", () => {
        expect(
            zodHttpsUrl.safeParse("https://user:password@example.com").success,
        ).toBe(false);
    });
});

describe("administrator project legacy contact response", () => {
    it("allows a sanitized contact with no remaining contact channel", () => {
        const result = Dto.getAllProjectsResponse.safeParse({
            projectList: [
                {
                    projectSlug: "example-project",
                    projectTitle: "Example Project",
                    ownerOrganizationSlugs: ["example-organization"],
                    bannerIsFullPath: false,
                    contentLocalizations: [],
                    machineContentLocalizations: [],
                    languageSettings: {
                        dynamicTranslationEnabled: false,
                        targetLanguageCodes: [],
                    },
                    attributions: [],
                    contact: {
                        firstName: "Example",
                        isFullImagePath: false,
                    },
                },
            ],
        });

        expect(result.success).toBe(true);
    });
});
