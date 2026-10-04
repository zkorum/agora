import { createPinia, setActivePinia } from "pinia";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "vue";

import { useConversationDraft } from "./useConversationDraft";

vi.mock("src/composables/ui/useComponentI18n", () => ({
  useComponentI18n: () => ({ t: (key: string) => key }),
}));

describe("conversation family state", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("keeps snapshots and initialization inputs from mutating the owned variant", () => {
    const draft = useConversationDraft({ syncToStore: false });
    const snapshot = draft.getDraftSnapshot();
    if (snapshot.conversationTypeConfig.conversationType !== "polis") {
      throw new Error("Expected the initial Polis draft");
    }
    snapshot.conversationTypeConfig.votingPresentation = "one_at_a_time";
    expect(draft.votingPresentation.value).toBe("list");
    draft.initializeFromData(snapshot);
    snapshot.conversationTypeConfig.votingPresentation = "list";
    expect(draft.votingPresentation.value).toBe("one_at_a_time");
  });

  it("synchronizes complete variants without retaining fields from the previous family", () => {
    const scope = effectScope();
    try {
      const draft = scope.run(() =>
        useConversationDraft({ syncToStore: true })
      );
      if (draft === undefined) throw new Error("Draft scope did not run");
      const store = useNewPostDraftsStore();
      draft.conversationTypeConfig.value = {
        conversationType: "ranking",
        rankingMode: "bws",
      };
      expect(store.conversationDraft).toMatchObject({
        conversationType: "ranking",
        rankingMode: "bws",
      });
      expect(store.conversationDraft).not.toHaveProperty("votingPresentation");
      draft.title.value = "New title";
      expect(store.conversationDraft).toMatchObject({
        title: "New title",
        rankingMode: "bws",
      });
      draft.conversationTypeConfig.value = {
        conversationType: "polis",
        votingPresentation: "one_at_a_time",
      };
      expect(store.conversationDraft).toMatchObject({
        conversationType: "polis",
        votingPresentation: "one_at_a_time",
      });
      expect(store.conversationDraft).not.toHaveProperty("rankingMode");
      draft.resetDraft();
      expect(draft.conversationTypeConfig.value).toEqual({
        conversationType: "polis",
        votingPresentation: "list",
      });
    } finally {
      scope.stop();
    }
  });
});
