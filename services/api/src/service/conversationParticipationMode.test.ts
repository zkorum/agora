import { describe, expect, it } from "vitest";
import {
    resolveConversationParticipationMode,
    resolveEditedParticipationModeSettingsSource,
} from "@/shared/participationMode.js";
import { Dto } from "@/shared/types/dto.js";

describe("project participation defaults", () => {
    it("resolves inherited modes live while retaining explicit overrides", () => {
        for (const projectParticipationMode of [
            "guest",
            "account_required",
            "email_verification",
            "strong_verification",
        ] as const) {
            expect(
                resolveConversationParticipationMode({
                    projectParticipationMode,
                    participationMode: "guest",
                    source: "project_inherited",
                }),
            ).toBe(projectParticipationMode);
            expect(
                resolveConversationParticipationMode({
                    projectParticipationMode,
                    participationMode: "email_verification",
                    source: "conversation_override",
                }),
            ).toBe("email_verification");
        }
    });

    it("does not detach inheritance when legacy Vue saves an unrelated edit", () => {
        expect(
            resolveEditedParticipationModeSettingsSource({
                currentSource: "project_inherited",
                currentEffectiveMode: "account_required",
                requestedMode: "account_required",
                requestedSource: undefined,
            }),
        ).toBe("project_inherited");
        expect(
            resolveEditedParticipationModeSettingsSource({
                currentSource: "project_inherited",
                currentEffectiveMode: "account_required",
                requestedMode: "strong_verification",
                requestedSource: undefined,
            }),
        ).toBe("conversation_override");
    });

    it("allows explicit inheritance and detachment even when values coincide", () => {
        for (const requestedSource of [
            "project_inherited",
            "conversation_override",
        ] as const) {
            expect(
                resolveEditedParticipationModeSettingsSource({
                    currentSource: "project_inherited",
                    currentEffectiveMode: "guest",
                    requestedMode: "guest",
                    requestedSource,
                }),
            ).toBe(requestedSource);
        }
    });

    it("keeps omitted project defaults absent so old Vue edits cannot reset them", () => {
        const project = {
            projectSlug: "example",
            projectTitle: "Example",
            ownerOrganizationSlugs: ["example-owner"],
        };
        expect(
            Dto.createProjectRequest.parse(project).participationMode,
        ).toBeUndefined();
        expect(
            Dto.updateProjectRequest.parse({
                ...project,
                currentProjectSlug: "example",
            }).participationMode,
        ).toBeUndefined();
        expect(
            Dto.createProjectRequest.parse({
                ...project,
                participationMode: "strong_verification",
            }).participationMode,
        ).toBe("strong_verification");
    });

    it("keeps legacy conversation payloads valid and accepts opt-in inheritance", () => {
        const conversation = {
            conversationTitle: "Example",
            projectSlug: "example",
            isIndexed: false,
            participationMode: "guest",
            multilingualSetting: {
                additionalLanguageCodes: [],
                dynamicTranslationEnabled: false,
            },
            seedOpinionList: [],
        };
        expect(
            Dto.createNewConversationBaseRequest.parse(conversation)
                .participationModeSettingsSource,
        ).toBeUndefined();
        expect(
            Dto.createNewConversationBaseRequest.parse({
                ...conversation,
                participationModeSettingsSource: "project_inherited",
            }).participationModeSettingsSource,
        ).toBe("project_inherited");
        expect(
            Dto.createNewConversationBaseRequest.safeParse({
                ...conversation,
                participationModeSettingsSource: "invented",
            }).success,
        ).toBe(false);
    });
});
