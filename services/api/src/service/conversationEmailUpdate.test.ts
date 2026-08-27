import { describe, expect, it } from "vitest";
import { resolveConversationEmailPreference } from "@/shared-backend/conversationEmailUpdatePreference.js";
import { Dto } from "@/shared/types/dto.js";
import {
    buildConversationEmailPreferenceGroups,
    isConversationEmailUpdateWorkspaceContextRepresented,
    mapConversationEmailUpdateTestStatus,
    resolveDeliverableOwnerSnapshots,
    resolveConversationEmailUpdateAuthoringAction,
    resolveConversationEmailUpdateWorkspaceContext,
    resolvePreferenceAvatar,
    resolveRequiredOwnerCopySet,
    shouldExposeConversationEmailUpdateParticipantPreference,
    type RequiredOwnerSnapshot,
} from "./conversationEmailUpdate.js";

const workspaceRows = [
    {
        scope_kind: "project" as const,
        project_slug: "listed-project",
        conversation_slug_id: "listconv01",
    },
    {
        scope_kind: "no_project" as const,
        project_slug: "internal-container",
        conversation_slug_id: "standconv1",
    },
];

describe("resolveConversationEmailUpdateWorkspaceContext", () => {
    it("keeps all authorized scopes available from a project composer", () => {
        expect(
            resolveConversationEmailUpdateWorkspaceContext({
                rows: workspaceRows,
                context: { kind: "project", projectSlug: "listed-project" },
            }),
        ).toEqual({ initialSelection: undefined });
    });

    it("keeps all authorized scopes while preselecting a conversation", () => {
        expect(
            resolveConversationEmailUpdateWorkspaceContext({
                rows: workspaceRows,
                context: {
                    kind: "conversation",
                    conversationSlugId: "standconv1",
                },
            }),
        ).toEqual({
            initialSelection: {
                kind: "no_project",
                conversationSlugId: "standconv1",
            },
        });
    });

    it("keeps No Project available from a listed-conversation composer", () => {
        expect(
            resolveConversationEmailUpdateWorkspaceContext({
                rows: workspaceRows,
                context: {
                    kind: "conversation",
                    conversationSlugId: "listconv01",
                },
            }),
        ).toEqual({
            initialSelection: {
                kind: "project",
                projectSlug: "listed-project",
                conversationSlugIds: ["listconv01"],
            },
        });
    });

    it("rejects an unavailable route context", () => {
        expect(
            resolveConversationEmailUpdateWorkspaceContext({
                rows: workspaceRows,
                context: { kind: "project", projectSlug: "unavailable" },
            }),
        ).toBeUndefined();
    });
});

describe("isConversationEmailUpdateWorkspaceContextRepresented", () => {
    const workspace = Dto.conversationEmailUpdateWorkspaceResponse.parse({
        success: true,
        resolvedContext: { kind: "global" },
        scopes: [
            {
                kind: "project",
                projectSlug: "listed-project",
                title: "Listed project",
                participantContactEmail: "project@example.com",
                conversations: [
                    {
                        conversationSlugId: "listconv01",
                        title: "Listed conversation",
                        participationMode: "account_required",
                        estimatedEligibleRecipientCount: 1,
                        sendingEnabled: true,
                    },
                ],
            },
        ],
    });
    if (!workspace.success) {
        throw new Error("Expected a parsed workspace response");
    }
    const { scopes } = workspace;

    it("requires the requested project in the final parsed scopes", () => {
        expect(
            isConversationEmailUpdateWorkspaceContextRepresented({
                scopes,
                context: { kind: "project", projectSlug: "listed-project" },
            }),
        ).toBe(true);
        expect(
            isConversationEmailUpdateWorkspaceContextRepresented({
                scopes,
                context: { kind: "project", projectSlug: "filtered-project" },
            }),
        ).toBe(false);
    });

    it("requires the requested conversation in the final parsed scopes", () => {
        expect(
            isConversationEmailUpdateWorkspaceContextRepresented({
                scopes,
                context: {
                    kind: "conversation",
                    conversationSlugId: "filtered-conversation",
                },
            }),
        ).toBe(false);
    });
});

describe("conversationEmailUpdateWorkspaceResponse", () => {
    it("does not represent a scope without conversations", () => {
        expect(
            Dto.conversationEmailUpdateWorkspaceResponse.safeParse({
                success: true,
                resolvedContext: { kind: "global" },
                scopes: [
                    {
                        kind: "no_project",
                        title: "No Project",
                        conversations: [],
                    },
                ],
            }).success,
        ).toBe(false);
    });
});

describe("resolveConversationEmailUpdateAuthoringAction", () => {
    it("offers composition when an accessible conversation is configured", () => {
        expect(
            resolveConversationEmailUpdateAuthoringAction({
                canAccessWorkspace: true,
                hasConfiguredConversation: true,
                hasHistory: false,
            }),
        ).toBe("compose");
    });

    it("falls back to history when configuration or access prevents authoring", () => {
        expect(
            resolveConversationEmailUpdateAuthoringAction({
                canAccessWorkspace: false,
                hasConfiguredConversation: true,
                hasHistory: true,
            }),
        ).toBe("history");
        expect(
            resolveConversationEmailUpdateAuthoringAction({
                canAccessWorkspace: true,
                hasConfiguredConversation: false,
                hasHistory: true,
            }),
        ).toBe("history");
    });

    it("hides the action without authoring access or history", () => {
        expect(
            resolveConversationEmailUpdateAuthoringAction({
                canAccessWorkspace: true,
                hasConfiguredConversation: false,
                hasHistory: false,
            }),
        ).toBe("none");
    });
});

describe("shouldExposeConversationEmailUpdateParticipantPreference", () => {
    it("requires an available preference scope", () => {
        expect(
            shouldExposeConversationEmailUpdateParticipantPreference({
                featureAvailable: true,
                hasPrimaryEmail: true,
                preferenceScope: undefined,
                safetyBlocked: false,
            }),
        ).toBe(false);
        expect(
            shouldExposeConversationEmailUpdateParticipantPreference({
                featureAvailable: true,
                hasPrimaryEmail: true,
                preferenceScope: "conversation",
                safetyBlocked: false,
            }),
        ).toBe(true);
    });

    it("hides preferences without email or when safety blocked", () => {
        expect(
            shouldExposeConversationEmailUpdateParticipantPreference({
                featureAvailable: true,
                hasPrimaryEmail: false,
                preferenceScope: "conversation",
                safetyBlocked: false,
            }),
        ).toBe(false);
        expect(
            shouldExposeConversationEmailUpdateParticipantPreference({
                featureAvailable: true,
                hasPrimaryEmail: true,
                preferenceScope: "conversation",
                safetyBlocked: true,
            }),
        ).toBe(false);
        expect(
            shouldExposeConversationEmailUpdateParticipantPreference({
                featureAvailable: false,
                hasPrimaryEmail: true,
                preferenceScope: "conversation",
                safetyBlocked: false,
            }),
        ).toBe(false);
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

    it("uses conversation overrides before listed project choices", () => {
        expect(
            resolveConversationEmailPreference({
                globalPaused: false,
                projectEnabled: undefined,
                conversationEnabled: true,
                scopeKind: "project",
            }),
        ).toBe(true);
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
        expect(
            resolveConversationEmailPreference({
                globalPaused: false,
                projectEnabled: false,
                conversationEnabled: true,
                scopeKind: "project",
            }),
        ).toBe(true);
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

describe("resolveDeliverableOwnerSnapshots", () => {
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
            resolveDeliverableOwnerSnapshots({
                requiredOwnerUserIds: ["owner-a", "owner-b", "owner-a"],
                facilitatorUserId: "owner-a",
                candidates: [ownerA, ownerB],
            }),
        ).toEqual([ownerA, ownerB]);
    });

    it("omits an ineligible manager when the facilitator is deliverable", () => {
        expect(
            resolveDeliverableOwnerSnapshots({
                requiredOwnerUserIds: ["owner-a", "owner-b"],
                facilitatorUserId: "owner-a",
                candidates: [ownerA],
            }),
        ).toEqual([ownerA]);
    });

    it("rejects acceptance when the facilitator is not deliverable", () => {
        expect(
            resolveDeliverableOwnerSnapshots({
                requiredOwnerUserIds: ["owner-a", "owner-b"],
                facilitatorUserId: "owner-a",
                candidates: [ownerB],
            }),
        ).toBeUndefined();
    });

    it("rejects a deliverable facilitator without manager authorization", () => {
        expect(
            resolveDeliverableOwnerSnapshots({
                requiredOwnerUserIds: ["owner-b"],
                facilitatorUserId: "owner-a",
                candidates: [ownerA, ownerB],
            }),
        ).toBeUndefined();
    });

    it("rejects ambiguous duplicate snapshots for one owner", () => {
        expect(
            resolveDeliverableOwnerSnapshots({
                requiredOwnerUserIds: ["owner-a"],
                facilitatorUserId: "owner-a",
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
                facilitatorUserId: "owner-a",
                candidates: [owner],
            }),
        ).toEqual({
            requiredOwnerUserIds: ["owner-a"],
            ownerSnapshots: [owner],
        });
    });

    it("retains unavailable manager IDs for participant exclusion", () => {
        expect(
            resolveRequiredOwnerCopySet({
                requiredOwnerUserIds: ["owner-a", "owner-b"],
                facilitatorUserId: "owner-a",
                candidates: [owner],
            }),
        ).toEqual({
            requiredOwnerUserIds: ["owner-a", "owner-b"],
            ownerSnapshots: [owner],
        });
    });
});

describe("resolvePreferenceAvatar", () => {
    it("uses the personal username and resolves its relative image path", () => {
        expect(
            resolvePreferenceAvatar({
                source: {
                    organizationId: 3,
                    organizationDisplayName: "Personal Workspace",
                    organizationImagePath: "/owners/alex.png",
                    organizationIsFullImagePath: false,
                    organizationDeletedAt: null,
                    username: "alex",
                    externalOrganizationId: null,
                    externalDisplayName: null,
                    externalImagePath: null,
                    externalIsFullImagePath: null,
                    externalDeletedAt: null,
                },
                baseImageServiceUrl: "https://images.example",
            }),
        ).toEqual({
            kind: "user",
            displayName: "alex",
            imageUrl: "https://images.example/owners/alex.png",
        });
    });

    it("uses an external project-owner organization", () => {
        expect(
            resolvePreferenceAvatar({
                source: {
                    organizationId: null,
                    organizationDisplayName: null,
                    organizationImagePath: null,
                    organizationIsFullImagePath: null,
                    organizationDeletedAt: null,
                    username: null,
                    externalOrganizationId: 4,
                    externalDisplayName: "External Owner",
                    externalImagePath: "https://cdn.example/owner.png",
                    externalIsFullImagePath: true,
                    externalDeletedAt: null,
                },
                baseImageServiceUrl: "https://images.example",
            }),
        ).toEqual({
            kind: "organization",
            displayName: "External Owner",
            imageUrl: "https://cdn.example/owner.png",
        });
    });
});

describe("buildConversationEmailPreferenceGroups", () => {
    it("includes conversations inheriting a project preference", () => {
        const groups = buildConversationEmailPreferenceGroups({
            globalPaused: false,
            conversationNextCursorByGroup: new Map(),
            ownerByProjectId: new Map([
                [
                    7,
                    {
                        kind: "organization",
                        displayName: "Plan Owners",
                        imageUrl: "https://images.example/owner.png",
                    },
                ],
            ]),
            projectRows: [
                {
                    project_id: 7,
                    project_slug: "public-plan",
                    project_title: "Public Plan",
                    enabled: true,
                    available: true,
                },
            ],
            conversationRows: [
                {
                    project_id: 7,
                    project_slug: "public-plan",
                    project_title: "Public Plan",
                    scope_kind: "project",
                    conversation_id: 11,
                    conversation_slug_id: "child001",
                    conversation_title: "Inherited conversation",
                    conversation_enabled: undefined,
                    project_enabled: true,
                    available: true,
                },
            ],
        });

        expect(groups[0]).toMatchObject({
            kind: "project",
            state: "enabled",
            owner: {
                kind: "organization",
                displayName: "Plan Owners",
                imageUrl: "https://images.example/owner.png",
            },
            conversations: [
                {
                    conversationSlugId: "child001",
                    preferenceKind: "project_inherited",
                    state: "undisclosed",
                    resolvedEnabled: true,
                },
            ],
        });
    });

    it("keeps an explicit conversation enabled when its project is disabled", () => {
        const groups = buildConversationEmailPreferenceGroups({
            globalPaused: false,
            conversationNextCursorByGroup: new Map(),
            ownerByProjectId: new Map(),
            projectRows: [
                {
                    project_id: 7,
                    project_slug: "public-plan",
                    project_title: "Public Plan",
                    enabled: false,
                    available: true,
                },
            ],
            conversationRows: [
                {
                    project_id: 7,
                    project_slug: "public-plan",
                    project_title: "Public Plan",
                    scope_kind: "project",
                    conversation_id: 11,
                    conversation_slug_id: "child001",
                    conversation_title: "Explicit conversation",
                    conversation_enabled: true,
                    project_enabled: false,
                    available: true,
                },
            ],
        });

        expect(groups[0]).toMatchObject({
            kind: "project",
            state: "disabled",
            resolvedEnabled: false,
            conversations: [
                {
                    conversationSlugId: "child001",
                    preferenceKind: "explicit",
                    state: "enabled",
                    resolvedEnabled: true,
                },
            ],
        });
    });

    it("emits an undisclosed project group for a child-only exception", () => {
        const groups = buildConversationEmailPreferenceGroups({
            globalPaused: false,
            conversationNextCursorByGroup: new Map(),
            ownerByProjectId: new Map(),
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
                    conversation_enabled: false,
                    project_enabled: undefined,
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
                        preferenceKind: "explicit",
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
            conversationNextCursorByGroup: new Map(),
            ownerByProjectId: new Map([
                [
                    9,
                    {
                        kind: "user",
                        displayName: "direct-owner",
                    },
                ],
            ]),
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
                    conversation_enabled: true,
                    project_enabled: undefined,
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
                        owner: {
                            kind: "user",
                            displayName: "direct-owner",
                        },
                        preferenceKind: "explicit",
                        state: "enabled",
                        resolvedEnabled: true,
                        availability: "temporarily_unavailable",
                    },
                ],
            },
        ]);
    });
});
