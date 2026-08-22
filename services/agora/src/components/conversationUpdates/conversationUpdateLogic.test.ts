import { describe, expect, it } from "vitest";

import {
  createConversationEmailUpdateSelection,
  getConversationUpdateUnsubscribeScopeName,
  mapConversationEmailUpdateScopes,
} from "./conversationUpdateLogic";
import type {
  ConversationUpdateConversationSummary,
  ConversationUpdateScopeSummary,
} from "./conversationUpdateTypes";

const firstConversation: ConversationUpdateConversationSummary = {
  id: "conversation-1",
  title: "First conversation",
  href: "/conversation/first",
  eligibleParticipantCount: 10,
  participationMode: "account_required",
  ownerIds: ["owner-1"],
};

const conversations: readonly ConversationUpdateConversationSummary[] = [
  firstConversation,
  {
    id: "conversation-2",
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
        selectedConversationIds: ["conversation-1", "conversation-2"],
      })
    ).toEqual({
      kind: "project",
      projectSlug: "public-consultation",
      conversationSlugIds: ["conversation-1", "conversation-2"],
    });
  });

  it("creates a single No Project selection", () => {
    expect(
      createConversationEmailUpdateSelection({
        scope: { ...projectScope, id: "no-project", kind: "no-project" },
        selectedConversationIds: ["conversation-1"],
      })
    ).toEqual({
      kind: "no_project",
      conversationSlugId: "conversation-1",
    });
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
});
