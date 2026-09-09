import type { ConversationEmailUpdateScope } from "src/shared/types/dto";
import { describe, expect, it } from "vitest";

import {
  createConversationEmailUpdateSelection,
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
};

const conversations: readonly ConversationUpdateConversationSummary[] = [
  firstConversation,
  {
    id: "conv000002",
    title: "Second conversation",
    href: "/conversation/second",
    eligibleParticipantCount: 20,
    participationMode: "account_required",
  },
];

describe("createConversationEmailUpdateSelection", () => {
  const projectScope: ConversationUpdateScopeSummary = {
    id: "public-consultation",
    kind: "project",
    unsubscribeScope: "project",
    label: "Public consultation",
    contactEmail: "updates@example.com",
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
  it("keeps multiple No Project identities, contacts and selections separate", () => {
    const source = ["org", "person"].map<ConversationEmailUpdateScope>(
      (identity) => ({
        kind: "no_project" as const,
        unsubscribeScope: "conversation",
        title: identity,
        conversations: [
          {
            conversationSlugId:
              identity === "org" ? "orgconv001" : "userconv01",
            title: `${identity} conversation`,
            participationMode: "account_required" as const,
            estimatedEligibleRecipientCount: 10,
            sendingEnabled: true,
            participantContactEmail: `${identity}@example.com`,
          },
        ],
      })
    );
    const mapped = mapConversationEmailUpdateScopes(source);
    expect(new Set(mapped.map((scope) => scope.id)).size).toBe(2);
    expect(mapped.map((scope) => scope.id)).toEqual([
      "__no-project:orgconv001",
      "__no-project:userconv01",
    ]);
    expect(mapped.map((scope) => scope.label)).toEqual(["org", "person"]);
    expect(mapped.map((scope) => scope.contactEmail)).toEqual([
      "org@example.com",
      "person@example.com",
    ]);
    expect(
      mapConversationEmailUpdateScopes([...source].reverse()).map(
        (scope) => scope.id
      )
    ).toEqual([...mapped].reverse().map((scope) => scope.id));
    for (const scope of mapped) {
      const conversationId = scope.conversations[0]?.id;
      expect(
        createConversationEmailUpdateSelection({
          scope,
          selectedConversationIds:
            conversationId === undefined ? [] : [conversationId],
        })
      ).toEqual({ kind: "no_project", conversationSlugId: conversationId });
    }
  });
  it("maps authoritative API scope fields into the existing composer view", () => {
    expect(
      mapConversationEmailUpdateScopes([
        {
          kind: "project",
          unsubscribeScope: "conversation",
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
        unsubscribeScope: "conversation",
        label: "Public consultation",
        contactEmail: "updates@example.com",
        conversations: [
          {
            id: "conversation-1",
            title: "First conversation",
            href: "/conversation/conversation-1",
            eligibleParticipantCount: 10,
            participationMode: "account_required",
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
        unsubscribeScope: "project",
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
        unsubscribeScope: "conversation",
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
      `${CONVERSATION_UPDATE_NO_PROJECT_SCOPE_ID}:stand001`,
    ]);
  });
});
