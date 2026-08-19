import type {
  ConversationUpdateHistoryRecord,
  ConversationUpdatePreferenceSummary,
} from "src/components/conversationUpdates/conversationUpdateTypes";
import { describe, expect, it } from "vitest";

import {
  advancePrototypeStatus,
  countRelatedConversationOwners,
  createPrototypeRevisionKey,
  enableOnlyPrototypeConversationInProject,
  estimatePrototypeAudience,
  getEffectivePrototypeConversationPreference,
  getSelectedConversations,
  isPrototypeConversationUpdateEffective,
  prototypeScopes,
} from "./conversationUpdatesPrototype";

describe("conversationUpdatesPrototype", () => {
  it("lets No Project select one conversation from the eligible set", () => {
    const scope = prototypeScopes.find((item) => item.kind === "no-project");
    const selectedIds = ["conversation-library-hours"];

    expect(scope?.conversations).toHaveLength(3);
    expect(
      getSelectedConversations({
        scope,
        selectedConversationIds: selectedIds,
      }).map((conversation) => conversation.title)
    ).toEqual(["When should the central library stay open later?"]);
  });

  it("deduplicates overlap without exceeding the project audience", () => {
    const scope = prototypeScopes.find(
      (item) => item.id === "project-harbor-heat"
    );
    const selectedConversationIds =
      scope?.conversations.map((conversation) => conversation.id) ?? [];

    const estimate = estimatePrototypeAudience({
      scope,
      selectedConversationIds,
    });

    expect(estimate).toBe(1840);
    expect(estimate).toBeLessThanOrEqual(scope?.eligibleParticipantCap ?? 0);
  });

  it("deduplicates owners across selected conversations", () => {
    const scope = prototypeScopes.find(
      (item) => item.id === "project-harbor-heat"
    );

    expect(
      countRelatedConversationOwners({
        scope,
        selectedConversationIds: [
          "conversation-cooling-centers",
          "conversation-shade",
        ],
      })
    ).toBe(3);
  });

  it("binds a successful test to the exact immutable email inputs", () => {
    const revision = {
      scopeId: "project-harbor-heat",
      contactEmail: "climate@civicharbor.example",
      selectedConversationIds: ["conversation-cooling-centers"],
      subject: "Subject",
      bodyHtml: "<p>Body</p>",
    };

    const revisionKey = createPrototypeRevisionKey(revision);
    const changedRevisions = [
      { ...revision, scopeId: "project-night-transit" },
      { ...revision, contactEmail: "changed@example.com" },
      { ...revision, selectedConversationIds: ["conversation-shade"] },
      { ...revision, subject: "Changed subject" },
      { ...revision, bodyHtml: "<p>Changed body</p>" },
    ];

    expect(revisionKey).toBe(createPrototypeRevisionKey(revision));
    for (const changedRevision of changedRevisions) {
      expect(createPrototypeRevisionKey(changedRevision)).not.toBe(revisionKey);
    }
  });

  it("preserves a typed automatic-stop reason while stopping finishes", () => {
    const stoppingRecord: ConversationUpdateHistoryRecord = {
      ...createHistoryRecord(),
      status: "stopping",
      reason: "emergency_global_kill_switch",
    };

    const stopped = advancePrototypeStatus({
      records: [stoppingRecord],
      recordId: stoppingRecord.id,
    });

    expect(stopped.at(0)?.status).toBe("stopped");
    expect(stopped.at(0)?.reason).toBe("emergency_global_kill_switch");
  });

  it("advances active statuses without reopening terminal history", () => {
    const record = createHistoryRecord();
    const queued = advancePrototypeStatus({
      records: [record],
      recordId: record.id,
    });
    const sending = advancePrototypeStatus({
      records: queued,
      recordId: record.id,
    });
    const completed = advancePrototypeStatus({
      records: sending,
      recordId: record.id,
    });
    const stillCompleted = advancePrototypeStatus({
      records: completed,
      recordId: record.id,
    });

    expect(queued.at(0)?.status).toBe("queued");
    expect(sending.at(0)?.status).toBe("sending");
    expect(completed.at(0)?.status).toBe("completed");
    expect(stillCompleted.at(0)?.status).toBe("completed");
  });

  it("applies project preference inheritance and explicit overrides", () => {
    expect(
      getEffectivePrototypeConversationPreference({
        scopeKind: "project",
        projectState: "enabled",
        conversationState: "undisclosed",
      })
    ).toBe(true);
    expect(
      getEffectivePrototypeConversationPreference({
        scopeKind: "project",
        projectState: "enabled",
        conversationState: "disabled",
      })
    ).toBe(false);
    expect(
      getEffectivePrototypeConversationPreference({
        scopeKind: "project",
        projectState: "undisclosed",
        conversationState: "enabled",
      })
    ).toBe(true);
    expect(
      getEffectivePrototypeConversationPreference({
        scopeKind: "project",
        projectState: "disabled",
        conversationState: "enabled",
      })
    ).toBe(false);
  });

  it("requires an enabled conversation preference for No Project", () => {
    expect(
      getEffectivePrototypeConversationPreference({
        scopeKind: "no-project",
        projectState: "enabled",
        conversationState: "enabled",
      })
    ).toBe(true);
    expect(
      getEffectivePrototypeConversationPreference({
        scopeKind: "no-project",
        projectState: "enabled",
        conversationState: "undisclosed",
      })
    ).toBe(false);
  });

  it("applies owner project defaults and conversation overrides", () => {
    expect(
      isPrototypeConversationUpdateEffective({
        hasEntitlement: true,
        projectDefaultEnabled: false,
        conversationOverride: undefined,
      })
    ).toBe(false);
    expect(
      isPrototypeConversationUpdateEffective({
        hasEntitlement: true,
        projectDefaultEnabled: true,
        conversationOverride: undefined,
      })
    ).toBe(true);
    expect(
      isPrototypeConversationUpdateEffective({
        hasEntitlement: true,
        projectDefaultEnabled: true,
        conversationOverride: false,
      })
    ).toBe(false);
    expect(
      isPrototypeConversationUpdateEffective({
        hasEntitlement: true,
        projectDefaultEnabled: false,
        conversationOverride: true,
      })
    ).toBe(true);
    expect(
      isPrototypeConversationUpdateEffective({
        hasEntitlement: false,
        projectDefaultEnabled: true,
        conversationOverride: true,
      })
    ).toBe(false);
  });

  it("atomically enables one project conversation and disables its siblings", () => {
    const unrelatedPreference: ConversationUpdatePreferenceSummary = {
      conversationId: "conversation-unrelated",
      conversationTitle: "Unrelated conversation",
      state: "undisclosed",
    };
    const transition = enableOnlyPrototypeConversationInProject({
      conversationPreferences: [
        {
          conversationId: "conversation-selected",
          conversationTitle: "Selected conversation",
          state: "undisclosed",
        },
        {
          conversationId: "conversation-sibling",
          conversationTitle: "Sibling conversation",
          state: "enabled",
        },
        unrelatedPreference,
      ],
      projectConversationIds: new Set([
        "conversation-selected",
        "conversation-sibling",
      ]),
      selectedConversationId: "conversation-selected",
    });

    expect(transition.projectState).toBe("enabled");
    expect(transition.conversationPreferences).toEqual([
      {
        conversationId: "conversation-selected",
        conversationTitle: "Selected conversation",
        state: "enabled",
      },
      {
        conversationId: "conversation-sibling",
        conversationTitle: "Sibling conversation",
        state: "disabled",
      },
      unrelatedPreference,
    ]);
  });

  it("advances status immutably", () => {
    const original: readonly ConversationUpdateHistoryRecord[] = [
      createHistoryRecord(),
    ];

    const updated = advancePrototypeStatus({
      records: original,
      recordId: "update-1",
    });

    expect(updated).not.toBe(original);
    expect(updated.at(0)?.status).toBe("queued");
    expect(original.at(0)?.status).toBe("preparing");
  });
});

function createHistoryRecord(): ConversationUpdateHistoryRecord {
  return {
    id: "update-1",
    subject: "Subject",
    bodyHtml: "<p>Body</p>",
    scopeKind: "project",
    scopeLabel: "Project",
    scopeHref: "/project/project",
    conversations: [
      {
        title: "Conversation",
        href: "/project/project/conversation/conversation/",
      },
    ],
    audienceEstimate: 100,
    ownerCopyCount: 1,
    createdAtLabel: "Now",
    status: "preparing",
    reason: undefined,
  };
}
