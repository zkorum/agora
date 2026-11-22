import { describe, expect, it } from "vitest";
import {
    Dto,
    type GetAllProjectsResponse,
    type GetOrganizationDetailsResponse,
} from "@/shared/types/dto.js";
import { zodHttpsUrl } from "@/shared/types/zod.js";

const organization = {
    name: "Example Organization",
    slug: "example-organization",
    description: "",
    defaultLanguageCode: "en",
    localizations: [],
    canUseDynamicTranslation: false,
} satisfies NonNullable<GetOrganizationDetailsResponse["organization"]>;

const permissions = {
    canUpdate: false,
    canManageMembers: false,
    canCreateProjects: false,
    canDelete: false,
    canConfigureEmailUpdates: false,
} satisfies GetOrganizationDetailsResponse["permissions"];

describe("website URL schemas", () => {
    it("accepts HTTPS website URLs", () => {
        const result = Dto.getOrganizationDetailsResponse.safeParse({
            permissions,
            organization: {
                ...organization,
                websiteUrl: "https://example.com",
            },
        });

        expect(result.success).toBe(true);
    });

    it("rejects HTTP website URLs", () => {
        const result = Dto.getOrganizationDetailsResponse.safeParse({
            permissions,
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
                    directoryVisibility: "listed",
                    participationMode: "guest",
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
        } satisfies GetAllProjectsResponse);

        expect(result.success).toBe(true);
    });
});
