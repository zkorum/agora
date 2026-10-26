import type { OpinionEditRequest } from "src/composables/opinion/types";
import { zodDisplayedOpinionItem } from "src/shared/types/zod";
import { afterEach, expect, it, vi } from "vitest";
import { type App, createApp } from "vue";

vi.mock("src/components/post/comments/OpinionIdentityCard.vue", () => ({
  default: { render: () => undefined },
}));
vi.mock("./CommentActionBar.vue", () => ({
  default: { render: () => undefined },
}));
vi.mock("../../../../ui-library/ZKHtmlContent.vue", async () => {
  const { defineComponent, h } = await import("vue");
  return { default: defineComponent(() => () => h("p", "Statement text")) };
});
vi.mock("./CommentActionOptions.vue", async () => {
  const { defineComponent, h } = await import("vue");
  return {
    default: defineComponent({
      props: { editableOpinion: { type: Object, required: true } },
      emits: ["editOpinion"],
      setup:
        (props, { emit }) =>
        () =>
          h(
            "button",
            {
              onClick: () =>
                emit(
                  "editOpinion",
                  zodDisplayedOpinionItem.parse(props.editableOpinion)
                ),
            },
            "Edit"
          ),
    }),
  };
});

import CommentItem from "./CommentItem.vue";

const apps: App[] = [];
afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();
  document.body.replaceChildren();
});

it("attaches the exact native card and content refs to an edit request", () => {
  const card = document.createElement("article");
  const host = document.createElement("div");
  card.append(host);
  document.body.append(card);
  const requests: OpinionEditRequest[] = [];
  const opinion = zodDisplayedOpinionItem.parse({
    opinionSlugId: "editstat",
    opinion: "<p>Statement text</p>",
    sourceLanguageCode: "en",
    username: "author",
    isSeed: false,
    isEdited: false,
    createdAt: "2026-10-10T10:00:00Z",
    updatedAt: "2026-10-10T10:00:00Z",
    numParticipants: 0,
    numAgrees: 0,
    numDisagrees: 0,
    numPasses: 0,
    moderation: { status: "unmoderated" },
    management: { editing: { allowed: true }, canDelete: true },
    displayContent: {
      sourceVersion: "00000000-0000-4000-8000-000000000001",
      status: "available",
      mode: "original",
      content: { content: "<p>Statement text</p>" },
      translationControl: null,
    },
  });
  const app = createApp(CommentItem, {
    cardElement: card,
    commentItem: opinion,
    editingOpinionSlugId: undefined,
    postSlugId: "testpost",
    conversationAuthorUsername: "author",
    conversationOrganizationName: "",
    votingUtilities: {
      userVotes: [],
      castVote: () => Promise.resolve(undefined),
    },
    onViewAnalysis: () => {},
    isVotingDisabled: false,
    showVoteResults: true,
    contentTranslation: undefined,
    conversationRouteContext: { kind: "normal" },
    onEditOpinion: (request: OpinionEditRequest) => requests.push(request),
  });
  apps.push(app);
  app.mount(host);
  host.querySelector("button")?.click();

  expect(requests).toHaveLength(1);
  expect(requests[0]?.opinion).toEqual(opinion);
  expect(requests[0]?.sourceElements.card).toBe(card);
  expect(requests[0]?.sourceElements.content.textContent).toBe(
    "Statement text"
  );
  expect(requests[0]?.sourceElements.content.isConnected).toBe(true);
});
