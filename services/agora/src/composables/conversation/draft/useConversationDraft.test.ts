import { createPinia, setActivePinia } from "pinia";
import type { ConversationTypeConfig } from "src/shared/types/zod";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import { createEmptySurveyQuestion } from "src/utils/survey/config";
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

  it("owns configs assigned by form controls instead of retaining their mutable input", () => {
    const draft = useConversationDraft({ syncToStore: false });
    const config: Extract<
      ConversationTypeConfig,
      { conversationType: "polis" }
    > = {
      conversationType: "polis",
      votingPresentation: "one_at_a_time",
    };
    draft.conversationTypeConfig.value = config;
    config.votingPresentation = "list";
    expect(draft.votingPresentation.value).toBe("one_at_a_time");
  });

  it("isolates nested survey and language values in snapshots and restoration inputs", () => {
    const draft = useConversationDraft({ syncToStore: false });
    draft.multilingualSetting.value = {
      dynamicTranslationEnabled: false,
      additionalLanguageCodes: ["fr"],
    };
    draft.surveyConfig.value = {
      isOptional: false,
      questions: [createEmptySurveyQuestion({ displayOrder: 0 })],
    };
    const snapshot = draft.getDraftSnapshot();
    snapshot.multilingualSetting.additionalLanguageCodes.push("en");
    const question = snapshot.surveyConfig?.questions[0];
    if (question === undefined) throw new Error("Missing snapshot question");
    question.questionText = "Snapshot prompt";
    expect(draft.multilingualSetting.value.additionalLanguageCodes).toEqual([
      "fr",
    ]);
    expect(draft.surveyConfig.value.questions[0]?.questionText).toBe("");

    draft.initializeFromData(snapshot);
    snapshot.multilingualSetting.additionalLanguageCodes.push("ja");
    question.questionText = "Changed after initialization";
    expect(draft.multilingualSetting.value.additionalLanguageCodes).toEqual([
      "fr",
      "en",
    ]);
    expect(draft.surveyConfig.value.questions[0]?.questionText).toBe(
      "Snapshot prompt"
    );
  });
});
