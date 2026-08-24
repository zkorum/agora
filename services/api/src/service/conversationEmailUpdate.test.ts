import { describe, expect, it } from "vitest";
import { Dto } from "@/shared/types/dto.js";
import {
    buildConversationEmailPreferenceGroups,
    mapConversationEmailUpdateTestStatus,
    mapInBatches,
    resolveCompleteOwnerSnapshots,
    resolveConversationEmailUpdateAuthoringAction,
    resolveRequiredOwnerCopySet,
    type RequiredOwnerSnapshot,
} from "./conversationEmailUpdate.js";
import { resolveConversationEmailPreference } from "./conversationEmailUpdatePolicy.js";

describe("resolveConversationEmailUpdateAuthoringAction", () => {
    it("keeps the workspace visible when sending is currently blocked", () => {
        expect(
            resolveConversationEmailUpdateAuthoringAction({
                canAccessWorkspace: true,
                hasHistory: false,
            }),
        ).toBe("compose");
    });

    it("falls back to history without current authoring access", () => {
        expect(
            resolveConversationEmailUpdateAuthoringAction({
                canAccessWorkspace: false,
                hasHistory: true,
            }),
        ).toBe("history");
        expect(
            resolveConversationEmailUpdateAuthoringAction({
                canAccessWorkspace: false,
                hasHistory: false,
            }),
        ).toBe("none");
    });
});

describe("conversationEmailUpdateSendTestResponse", () => {
    it("parses expected test-send failures with a shared false discriminator", () => {
        expect(
            Dto.conversationEmailUpdateSendTestResponse.parse({
                success: false,
                error: { reason: "no_verified_test_email" },
            }),
        ).toEqual({
            success: false,
            error: { reason: "no_verified_test_email" },
        });
        expect(
            Dto.conversationEmailUpdateSendTestResponse.parse({
                success: false,
                error: {
                    reason: "test_rate_limited",
                    retryAt: new Date("2026-08-24T12:00:00.000Z"),
                },
            }),
        ).toEqual({
            success: false,
            error: {
                reason: "test_rate_limited",
                retryAt: new Date("2026-08-24T12:00:00.000Z"),
            },
        });
        expect(
            Dto.conversationEmailUpdateSendTestResponse.safeParse({
                success: false,
                error: { reason: "test_rate_limited" },
            }).success,
        ).toBe(false);
    });
});

describe("conversationEmailUpdateTestStatusResponse", () => {
    it("distinguishes local authorization failure from provider rejection", () => {
        expect(
            mapConversationEmailUpdateTestStatus({
                status: "permanent_rejected",
                finishedAt: new Date("2026-08-24T12:00:00.000Z"),
                errorCode: "authorization_failed",
            }),
        ).toEqual({
            state: "failed",
            reason: "authorization_rejected",
        });
        expect(
            mapConversationEmailUpdateTestStatus({
                status: "permanent_rejected",
                finishedAt: new Date("2026-08-24T12:00:00.000Z"),
                errorCode: "provider_message_rejected",
            }),
        ).toEqual({ state: "failed", reason: "permanent_rejected" });
    });

    it("parses the typed authorization rejection response", () => {
        expect(
            Dto.conversationEmailUpdateTestStatusResponse.parse({
                success: true,
                status: {
                    state: "failed",
                    reason: "authorization_rejected",
                },
            }),
        ).toEqual({
            success: true,
            status: {
                state: "failed",
                reason: "authorization_rejected",
            },
        });
    });

    it("requires a completion timestamp for provider acceptance", () => {
        expect(
            mapConversationEmailUpdateTestStatus({
                status: "provider_accepted",
                finishedAt: null,
                errorCode: null,
            }),
        ).toBeUndefined();
    });
});

describe("mapInBatches", () => {
    it("bounds concurrency and preserves input order", async () => {
        let active = 0;
        let maximumActive = 0;
        const outputs = await mapInBatches({
            items: [1, 2, 3, 4, 5, 6, 7],
            batchSize: 3,
            map: async (item) => {
                active += 1;
                maximumActive = Math.max(maximumActive, active);
                await new Promise((resolve) => {
                    setTimeout(resolve, (4 - (item % 4)) * 2);
                });
                active -= 1;
                return `item-${String(item)}`;
            },
        });

        expect(maximumActive).toBe(3);
        expect(outputs).toEqual([
            "item-1",
            "item-2",
            "item-3",
            "item-4",
            "item-5",
            "item-6",
            "item-7",
        ]);
    });

    it("rejects invalid batch sizes", async () => {
        await expect(
            mapInBatches({
                items: [1],
                batchSize: 0,
                map: (item) => Promise.resolve(item),
            }),
        ).rejects.toThrow("batchSize must be a positive integer");
    });
});

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

describe("resolveRequiredOwnerCopySet", () => {
    const owner: RequiredOwnerSnapshot = {
        userId: "owner-a",
        emailCredentialId: 1,
        email: "owner-a@example.com",
        displayLanguage: "en",
    };

    it("retains each required owner ID once for participant exclusion", () => {
        expect(
            resolveRequiredOwnerCopySet({
                requiredOwnerUserIds: ["owner-a", "owner-a"],
                candidates: [owner],
            }),
        ).toEqual({
            requiredOwnerUserIds: ["owner-a"],
            ownerSnapshots: [owner],
        });
    });

    it("retains required owner IDs when the strict copy gate fails", () => {
        expect(
            resolveRequiredOwnerCopySet({
                requiredOwnerUserIds: ["owner-a", "owner-b"],
                candidates: [owner],
            }),
        ).toEqual({
            requiredOwnerUserIds: ["owner-a", "owner-b"],
            ownerSnapshots: undefined,
        });
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
