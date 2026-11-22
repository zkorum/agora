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
        conversationEmailUpdateEnabledOverride,
        conversationType: "polis",
        aiLabelingEnabled: true,
        preferredOpinionGroupCount: null,
        surveyConfig: undefined,
    };
}

describe("conversation creation DTO", () => {
    const qvRequest = {
        conversationTitle: "Priorities",
        isIndexed: true,
        participationMode: "guest",
        multilingualSetting: {
            additionalLanguageCodes: [],
            dynamicTranslationEnabled: false,
        },
        conversationType: "prioritizing",
        prioritizationType: "qv",
        creditPricing: "quadratic",
        seedStatements: [
            { title: "A required title", description: "Optional details" },
        ],
    };
    it("defaults QV opposition on and keeps structured statement content", () => {
        expect(Dto.createNewConversationRequest.parse(qvRequest)).toMatchObject(
            {
                allowOpposition: true,
                seedOpinionList: [],
                seedStatements: qvRequest.seedStatements,
            },
        );
        expect(
            Dto.createNewConversationRequest.parse({
                ...qvRequest,
                allowOpposition: false,
            }),
        ).toMatchObject({ allowOpposition: false });
    });
    it.each([
        {},
        { title: "" },
        { title: "   ", description: "Description alone" },
    ])("requires a statement title: %j", (statement) => {
        expect(
            Dto.createNewConversationRequest.safeParse({
                ...qvRequest,
                seedStatements: [statement],
            }).success,
        ).toBe(false);
    });
    it("rejects custom budgets, comparison settings and unstructured QV seed content", () => {
        for (const fields of [
            { creditBudget: 200 },
            { comparisonMethod: "bws" },
            { externalSourceConfig: null },
            { seedOpinionList: ["Text only"] },
        ]) {
            expect(
                Dto.createNewConversationRequest.safeParse({
                    ...qvRequest,
                    ...fields,
                }).success,
            ).toBe(false);
        }
    });
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
                hasParticipantContactEmail: false,
                scopeDefaultEnabled: false,
            },
            projectList: [
                {
                    projectSlug: "public-plan",
                    canUseDynamicTranslation: false,
                    projectTitle: "Public Plan",
                    participationMode: "strong_verification",
                    defaultLanguageCode: "en",
                    languageSettings: {
                        dynamicTranslationEnabled: false,
                        targetLanguageCodes: [],
                    },
                    emailUpdates: {
                        canConfigure: true,
                        hasParticipantContactEmail: true,
                        scopeDefaultEnabled: true,
                    },
                },
            ],
        });

        expect(response).toMatchObject({
            success: true,
            noProjectEmailUpdates: {
                canConfigure: true,
                hasParticipantContactEmail: false,
                scopeDefaultEnabled: false,
            },
            projectList: [
                {
                    participationMode: "strong_verification",
                    emailUpdates: {
                        canConfigure: true,
                        hasParticipantContactEmail: true,
                        scopeDefaultEnabled: true,
                    },
                },
            ],
        });
    });
});

describe("conversation update DTO", () => {
    it.each([undefined, null, true, false])(
        "preserves the Email Updates override command %s",
        (conversationEmailUpdateEnabledOverride) => {
            const request = Dto.updateConversationRequest.parse({
                conversationSlugId: "conv-one",
                conversationTitle: "Updated conversation",
                conversationBody: undefined,
                isIndexed: true,
                participationMode: "account_required",
                conversationTypeConfig: {
                    conversationType: "polis",
                    votingPresentation: "list",
                },
                multilingualSetting: {
                    additionalLanguageCodes: [],
                    dynamicTranslationEnabled: false,
                },
                conversationEmailUpdateEnabledOverride,
            });

            expect(request.conversationEmailUpdateEnabledOverride).toBe(
                conversationEmailUpdateEnabledOverride,
            );
        },
    );
});
