import { describe, expect, it } from "vitest";
import { Dto } from "@/shared/types/dto.js";

function buildRequest(
    conversationEmailUpdateEnabledOverride: boolean | undefined,
) {
    return {
        conversationTitle: "Create-time Email Updates",
        conversationBody: undefined,
        projectSlug: undefined,
        languageSettingsSource: "conversation_override",
        postAsOrganization: "agora-foundation",
        isIndexed: true,
        participationMode: "account_required",
        multilingualSetting: {
            additionalLanguageCodes: [],
            dynamicTranslationEnabled: false,
        },
        seedOpinionList: [],
        requiresEventTicket: undefined,
        conversationEmailUpdateEnabledOverride,
        conversationType: "polis",
        aiLabelingEnabled: true,
        preferredOpinionGroupCount: null,
        surveyConfig: undefined,
    };
}

describe("conversation creation DTO", () => {
    it.each([undefined, true, false])(
        "preserves the Email Updates override %s",
        (conversationEmailUpdateEnabledOverride) => {
            const request = Dto.createNewConversationRequest.parse(
                buildRequest(conversationEmailUpdateEnabledOverride),
            );

            expect(request.conversationEmailUpdateEnabledOverride).toBe(
                conversationEmailUpdateEnabledOverride,
            );
        },
    );

    it("returns create-time settings for No Project and listed projects", () => {
        const response = Dto.getConversationCreateProjectOptionsResponse.parse({
            success: true,
            noProjectEmailUpdates: {
                canConfigure: true,
                scopeDefaultEnabled: false,
            },
            projectList: [
                {
                    projectSlug: "public-plan",
                    projectTitle: "Public Plan",
                    defaultLanguageCode: "en",
                    languageSettings: {
                        dynamicTranslationEnabled: false,
                        targetLanguageCodes: [],
                    },
                    emailUpdates: {
                        canConfigure: true,
                        scopeDefaultEnabled: true,
                    },
                },
            ],
        });

        expect(response).toMatchObject({
            success: true,
            noProjectEmailUpdates: {
                canConfigure: true,
                scopeDefaultEnabled: false,
            },
            projectList: [
                {
                    emailUpdates: {
                        canConfigure: true,
                        scopeDefaultEnabled: true,
                    },
                },
            ],
        });
    });
});
