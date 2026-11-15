import { describe, expect, it } from "vitest";
import { Dto } from "@/shared/types/dto.js";
import { zodParticipantStatements } from "@/shared/types/zod.js";
import { defaultConversationStatementSettings } from "@/shared/utils/participantStatements.js";
import { zodSSEConversationSettingsData } from "@/shared/types/sse.js";

const base = {
    conversationTitle: "Public transit priorities",
    isIndexed: true,
    participationMode: "guest",
    multilingualSetting: {
        additionalLanguageCodes: [],
        dynamicTranslationEnabled: false,
    },
    seedOpinionList: [],
};

describe("participant statement contracts", () => {
    it("rejects cross-family realtime policy while accepting retained events without a policy", () => {
        const settings = {
            isIndexed: true,
            participationMode: "guest",
            aiLabelingEnabled: false,
            presentation: {
                conversationType: "prioritizing",
                prioritizationType: "qv",
                creditPricing: "quadratic",
                allowOpposition: true,
            },
            preferredOpinionGroupCount: null,
            isClosed: false,
        };
        expect(zodSSEConversationSettingsData.safeParse(settings).success).toBe(
            true,
        );
        expect(
            zodSSEConversationSettingsData.safeParse({
                ...settings,
                participantStatements: { supported: false },
            }).success,
        ).toBe(true);
        expect(
            zodSSEConversationSettingsData.safeParse({
                ...settings,
                participantStatements: { supported: true, enabled: true },
            }).success,
        ).toBe(false);
    });
    it("defaults opinion mapping to ON and preserves explicit OFF", () => {
        const request = { ...base, conversationType: "polis" };
        expect(Dto.createNewConversationRequest.parse(request)).toMatchObject({
            allowParticipantStatements: true,
        });
        expect(
            Dto.createNewConversationRequest.parse({
                ...request,
                allowParticipantStatements: false,
            }),
        ).toMatchObject({ allowParticipantStatements: false });
    });
    it.each(["bws", "pairwise"])(
        "defaults %s to OFF and preserves explicit ON",
        (comparisonMethod) => {
            const request = {
                ...base,
                conversationType: "prioritizing",
                prioritizationType: "comparisons",
                comparisonMethod,
            };
            expect(
                Dto.createNewConversationRequest.parse(request),
            ).toMatchObject({ allowParticipantStatements: false });
            expect(
                Dto.createNewConversationRequest.parse({
                    ...request,
                    allowParticipantStatements: true,
                }),
            ).toMatchObject({ allowParticipantStatements: true });
        },
    );
    it.each([false, true])(
        "QV rejects even an explicitly supplied %s flag",
        (allowParticipantStatements) => {
            const request = {
                ...base,
                conversationType: "prioritizing",
                prioritizationType: "qv",
                creditPricing: "quadratic",
                allowOpposition: true,
                seedStatements: [{ title: "A statement" }],
            };
            expect(
                Dto.createNewConversationRequest.safeParse(request).success,
            ).toBe(true);
            expect(
                Dto.createNewConversationRequest.safeParse({
                    ...request,
                    allowParticipantStatements,
                }).success,
            ).toBe(false);
        },
    );
    it("unsupported capability cannot carry an enabled field", () => {
        expect(zodParticipantStatements.parse({ supported: false })).toEqual({
            supported: false,
        });
        expect(
            zodParticipantStatements.safeParse({
                supported: false,
                enabled: true,
            }).success,
        ).toBe(false);
    });
    it("has family-specific frontend defaults independent of comparison method", () => {
        expect(
            defaultConversationStatementSettings({
                conversationType: "polis",
                votingPresentation: "list",
            }).participantStatements,
        ).toEqual({ supported: true, enabled: true });
        expect(
            defaultConversationStatementSettings({
                conversationType: "prioritizing",
                prioritizationType: "comparisons",
                comparisonMethod: "pairwise",
            }).participantStatements,
        ).toEqual({ supported: true, enabled: false });
        expect(
            defaultConversationStatementSettings({
                conversationType: "prioritizing",
                prioritizationType: "qv",
                creditPricing: "quadratic",
                allowOpposition: true,
            }).participantStatements,
        ).toEqual({ supported: false });
    });
});
