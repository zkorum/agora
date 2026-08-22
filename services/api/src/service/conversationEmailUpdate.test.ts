import { describe, expect, it } from "vitest";
import {
    buildConversationEmailPreferenceGroups,
    resolveCompleteOwnerSnapshots,
    type RequiredOwnerSnapshot,
} from "./conversationEmailUpdate.js";
import { resolveConversationEmailPreference } from "./conversationEmailUpdatePolicy.js";

describe("resolveConversationEmailPreference", () => {
    it("keeps lower-level choices intact while globally paused", () => {
        expect(
            resolveConversationEmailPreference({
                globalPaused: true,
                projectEnabled: true,
                conversationEnabled: true,
                scopeKind: "project",
            }),
        ).toBe(false);
        expect(
            resolveConversationEmailPreference({
                globalPaused: false,
                projectEnabled: true,
                conversationEnabled: true,
                scopeKind: "project",
            }),
        ).toBe(true);
    });

    it("requires an explicit project choice for listed projects", () => {
        expect(
            resolveConversationEmailPreference({
                globalPaused: false,
                projectEnabled: undefined,
                conversationEnabled: true,
                scopeKind: "project",
            }),
        ).toBe(false);
        expect(
            resolveConversationEmailPreference({
                globalPaused: false,
                projectEnabled: true,
                conversationEnabled: undefined,
                scopeKind: "project",
            }),
        ).toBe(true);
        expect(
            resolveConversationEmailPreference({
                globalPaused: false,
                projectEnabled: true,
                conversationEnabled: false,
                scopeKind: "project",
            }),
        ).toBe(false);
    });

    it("requires an explicit conversation choice for No Project", () => {
        expect(
            resolveConversationEmailPreference({
                globalPaused: false,
                projectEnabled: undefined,
                conversationEnabled: undefined,
                scopeKind: "no_project",
            }),
        ).toBe(false);
        expect(
            resolveConversationEmailPreference({
                globalPaused: false,
                projectEnabled: undefined,
                conversationEnabled: true,
                scopeKind: "no_project",
            }),
        ).toBe(true);
    });
});

describe("resolveCompleteOwnerSnapshots", () => {
    const ownerA: RequiredOwnerSnapshot = {
        userId: "owner-a",
        emailCredentialId: 1,
        email: "owner-a@example.com",
        displayLanguage: "en",
    };
    const ownerB: RequiredOwnerSnapshot = {
        userId: "owner-b",
        emailCredentialId: 2,
        email: "owner-b@example.com",
        displayLanguage: "fr",
    };

    it("deduplicates owners shared by multiple owning organizations", () => {
        expect(
            resolveCompleteOwnerSnapshots({
                requiredOwnerUserIds: ["owner-a", "owner-b", "owner-a"],
                candidates: [ownerA, ownerB],
            }),
        ).toEqual([ownerA, ownerB]);
    });

    it("rejects acceptance when any required owner is ineligible", () => {
        expect(
            resolveCompleteOwnerSnapshots({
                requiredOwnerUserIds: ["owner-a", "owner-b"],
                candidates: [ownerA],
            }),
        ).toBeUndefined();
    });

    it("rejects ambiguous duplicate snapshots for one owner", () => {
        expect(
            resolveCompleteOwnerSnapshots({
                requiredOwnerUserIds: ["owner-a"],
                candidates: [ownerA, { ...ownerA, emailCredentialId: 3 }],
            }),
        ).toBeUndefined();
    });
});

describe("buildConversationEmailPreferenceGroups", () => {
    it("emits an undisclosed project group for a child-only exception", () => {
        const groups = buildConversationEmailPreferenceGroups({
            globalPaused: false,
            projectRows: [],
            conversationRows: [
                {
                    project_id: 7,
                    project_slug: "public-plan",
                    project_title: "Public Plan",
                    scope_kind: "project",
                    conversation_id: 11,
                    conversation_slug_id: "child001",
                    conversation_title: "Child statement",
                    enabled: false,
                    available: true,
                },
            ],
        });

        expect(groups).toEqual([
            {
                kind: "project",
                projectSlug: "public-plan",
                projectTitle: "Public Plan",
                state: "undisclosed",
                resolvedEnabled: false,
                availability: "available",
                conversations: [
                    {
                        conversationSlugId: "child001",
                        conversationTitle: "Child statement",
                        state: "disabled",
                        resolvedEnabled: false,
                        availability: "available",
                    },
                ],
            },
        ]);
    });

    it("groups explicit No Project choices separately", () => {
        const groups = buildConversationEmailPreferenceGroups({
            globalPaused: false,
            projectRows: [],
            conversationRows: [
                {
                    project_id: 9,
                    project_slug: "personal",
                    project_title: "Personal",
                    scope_kind: "no_project",
                    conversation_id: 12,
                    conversation_slug_id: "direct01",
                    conversation_title: "Direct conversation",
                    enabled: true,
                    available: false,
                },
            ],
        });

        expect(groups).toEqual([
            {
                kind: "no_project",
                availability: "temporarily_unavailable",
                conversations: [
                    {
                        conversationSlugId: "direct01",
                        conversationTitle: "Direct conversation",
                        state: "enabled",
                        resolvedEnabled: true,
                        availability: "temporarily_unavailable",
                    },
                ],
            },
        ]);
    });
});
