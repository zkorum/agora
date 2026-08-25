import { describe, expect, it } from "vitest";

import {
  createConversationEmailUpdateSelection,
  getConversationUpdateUnsubscribeScopeName,
  mapConversationEmailUpdateScopes,
} from "./conversationUpdateLogic";
import {
  CONVERSATION_UPDATE_NO_PROJECT_SCOPE_ID,
  type ConversationUpdateConversationSummary,
  type ConversationUpdateScopeSummary,
} from "./conversationUpdateTypes";

const firstConversation: ConversationUpdateConversationSummary = {
  id: "conv000001",
  title: "First conversation",
  href: "/conversation/first",
  eligibleParticipantCount: 10,
  participationMode: "account_required",
  ownerIds: ["owner-1"],
};

const conversations: readonly ConversationUpdateConversationSummary[] = [
  firstConversation,
  {
    id: "conv000002",
    title: "Second conversation",
    href: "/conversation/second",
    eligibleParticipantCount: 20,
    participationMode: "account_required",
    ownerIds: ["owner-2"],
  },
];

describe("getConversationUpdateUnsubscribeScopeName", () => {
  it("uses the project name instead of listing included conversations", () => {
    expect(
      getConversationUpdateUnsubscribeScopeName({
        scopeKind: "project",
        scopeLabel: "Public consultation",
        conversations,
      })
    ).toBe("Public consultation");
  });

  it("uses the single included conversation for No Project", () => {
    expect(
      getConversationUpdateUnsubscribeScopeName({
        scopeKind: "no-project",
        scopeLabel: "No Project",
        conversations: [firstConversation],
      })
    ).toBe("First conversation");
  });

  it("does not invent a No Project unsubscribe target before selection", () => {
    expect(
      getConversationUpdateUnsubscribeScopeName({
        scopeKind: "no-project",
        scopeLabel: "No Project",
        conversations: [],
      })
    ).toBeUndefined();
  });
});

describe("createConversationEmailUpdateSelection", () => {
  const projectScope: ConversationUpdateScopeSummary = {
    id: "public-consultation",
    kind: "project",
    label: "Public consultation",
    href: "/project/public-consultation",
    contactEmail: "updates@example.com",
    eligibleParticipantCap: 30,
    conversations,
  };

  it("creates a project selection with all selected conversations", () => {
    expect(
      createConversationEmailUpdateSelection({
        scope: projectScope,
        selectedConversationIds: ["conv000001", "conv000002"],
      })
    ).toEqual({
      kind: "project",
      projectSlug: "public-consultation",
      conversationSlugIds: ["conv000001", "conv000002"],
    });
  });

  it("creates a single No Project selection", () => {
    expect(
      createConversationEmailUpdateSelection({
        scope: { ...projectScope, id: "no-project", kind: "no-project" },
        selectedConversationIds: ["conv000001"],
      })
    ).toEqual({
      kind: "no_project",
      conversationSlugId: "conv000001",
    });
  });

  it("requires exactly one No Project conversation", () => {
    const noProjectScope: ConversationUpdateScopeSummary = {
      ...projectScope,
      id: "no-project",
      kind: "no-project",
    };

    expect(
      createConversationEmailUpdateSelection({
        scope: noProjectScope,
        selectedConversationIds: [],
      })
    ).toBeUndefined();
    expect(
      createConversationEmailUpdateSelection({
        scope: noProjectScope,
        selectedConversationIds: ["conv000001", "conv000002"],
      })
    ).toBeUndefined();
  });

  it("rejects an oversized project selection without throwing", () => {
    const conversationSlugIds = Array.from({ length: 1_001 }, (_, index) =>
      String(index).padStart(10, "0")
    );

    expect(
      createConversationEmailUpdateSelection({
        scope: projectScope,
        selectedConversationIds: conversationSlugIds,
      })
    ).toBeUndefined();
  });
});

describe("mapConversationEmailUpdateScopes", () => {
  it("maps authoritative API scope fields into the existing composer view", () => {
    expect(
      mapConversationEmailUpdateScopes([
        {
          kind: "project",
          projectSlug: "public-consultation",
          title: "Public consultation",
          participantContactEmail: "updates@example.com",
          conversations: [
            {
              conversationSlugId: "conversation-1",
              title: "First conversation",
              participationMode: "account_required",
              estimatedEligibleRecipientCount: 10,
              sendingEnabled: true,
            },
          ],
        },
      ])
    ).toEqual([
      {
        id: "public-consultation",
        kind: "project",
        label: "Public consultation",
        href: "/project/public-consultation",
        contactEmail: "updates@example.com",
        eligibleParticipantCap: 10,
        conversations: [
          {
            id: "conversation-1",
            title: "First conversation",
            href: "/conversation/conversation-1",
            eligibleParticipantCount: 10,
            participationMode: "account_required",
            ownerIds: [],
          },
        ],
      },
    ]);
  });

  it("keeps No Project distinct from a project with the no-project slug", () => {
    const mappedScopes = mapConversationEmailUpdateScopes([
      {
        kind: "project",
        projectSlug: "no-project",
        title: "No Project initiative",
        participantContactEmail: "project@example.com",
        conversations: [
          {
            conversationSlugId: "project001",
            title: "Project conversation",
            participationMode: "account_required",
            estimatedEligibleRecipientCount: 1,
            sendingEnabled: true,
          },
        ],
      },
      {
        kind: "no_project",
        title: "No Project",
        conversations: [
          {
            conversationSlugId: "stand001",
            title: "Standalone conversation",
            participationMode: "account_required",
            estimatedEligibleRecipientCount: 1,
            sendingEnabled: true,
            participantContactEmail: "standalone@example.com",
          },
        ],
      },
    ]);

    expect(mappedScopes.map((scope) => scope.id)).toEqual([
      "no-project",
      CONVERSATION_UPDATE_NO_PROJECT_SCOPE_ID,
    ]);
  });
});
