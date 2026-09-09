import type { EmailBranding } from "@/shared/branding/emailBranding.js";
import {
    conversationEmailExampleNames,
    type ConversationEmailExample,
} from "@/shared/branding/emailExamples.js";
import type { SupportedDisplayLanguageCodes } from "@/shared/languages.js";

export function createConversationEmailExampleBranding({
    example,
    language,
    siteBaseUrl,
}: {
    example: ConversationEmailExample;
    language: SupportedDisplayLanguageCodes;
    siteBaseUrl: string;
}): EmailBranding {
    // The same local assets used by /dev/project-page.
    const image = (name: string): string =>
        new URL(`/local-project-assets/project-page/${name}`, siteBaseUrl).href;
    const organizationLogo = image("civic-union-logo.png");
    switch (example.fixture) {
        case "personal":
            return {
                name: conversationEmailExampleNames.personal,
                scopeKind: "no-project",
                palette: "green",
            };
        case "organization":
            return {
                name: conversationEmailExampleNames.organization,
                scopeKind: "no-project",
                palette: "purple",
                imageUrl:
                    example.organizationLogo === true
                        ? organizationLogo
                        : undefined,
            };
        case "project": {
            const entries = {
                project_owner: {
                    displayName: "Civic Union",
                    image: "civic-union-logo.png",
                },
                sponsor: {
                    displayName: "European Union",
                    image: "eu-funded-logo.png",
                },
                partner: {
                    displayName: "Search for Common Ground",
                    image: "search-common-ground-logo.png",
                },
            };
            const bannerLanguage =
                language === "ky" || language === "ru" ? language : "en";
            return {
                name: conversationEmailExampleNames.project,
                scopeKind: "project",
                projectUrl: new URL("/project/amplify/", siteBaseUrl).href,
                palette: "blue",
                bannerImageUrl:
                    example.backgroundPicture === true
                        ? image(`project-banner-${bannerLanguage}.png`)
                        : undefined,
                attributions: example.attributions?.map((role) => ({
                    role,
                    displayName: entries[role].displayName,
                    imageUrl:
                        example.attributionLogos === true
                            ? image(entries[role].image)
                            : undefined,
                })),
            };
        }
    }
}
