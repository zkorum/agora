import { createPinia, setActivePinia } from "pinia";
import type { ConversationTypeConfig } from "src/shared/types/zod";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import { createEmptySurveyQuestion } from "src/utils/survey/config";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, watch } from "vue";

import { zodSerializableConversationDraft } from "./conversationDraft.schema";
import { createEmptyDraft } from "./conversationDraft.utils";
import { useConversationDraft } from "./useConversationDraft";

vi.mock("src/composables/ui/useComponentI18n", () => ({
  useComponentI18n: () => ({ t: (key: string) => key }),
}));

describe("conversation family state", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("preserves a saved draft while discarding its retired ticket requirement", () => {
    localStorage.setItem(
      "conversationDraft",
      JSON.stringify({
        ...createEmptyDraft(),
        title: "Keep my draft",
        content: "<p>Keep my text</p>",
        participationMode: "email_verification",
        requiresEventTicket: "devconnect-2025",
      })
    );
    const store = useNewPostDraftsStore();
    expect(store.conversationDraft).toMatchObject({
      title: "Keep my draft",
      content: "<p>Keep my text</p>",
      participationMode: "email_verification",
    });
    expect(store.conversationDraft).not.toHaveProperty("requiresEventTicket");
  });

  it("uses family defaults, preserves comparison choices, and keeps QV unsupported", () => {
    const draft = useConversationDraft({ syncToStore: false });
    expect(draft.participantStatements.value).toEqual({
      supported: true,
      enabled: true,
    });
    draft.participantStatements.value = { supported: true, enabled: false };
    expect(draft.isDraftModified()).toBe(true);
    draft.conversationTypeConfig.value = {
      conversationType: "prioritizing",
      prioritizationType: "comparisons",
      comparisonMethod: "bws",
    };
    expect(draft.participantStatements.value).toEqual({
      supported: true,
      enabled: false,
    });
    draft.participantStatements.value = { supported: true, enabled: true };
    draft.conversationTypeConfig.value = {
      conversationType: "prioritizing",
      prioritizationType: "comparisons",
      comparisonMethod: "pairwise",
    };
    expect(draft.participantStatements.value).toEqual({
      supported: true,
      enabled: true,
    });
    draft.conversationTypeConfig.value = {
      conversationType: "prioritizing",
      prioritizationType: "qv",
      creditPricing: "quadratic",
      allowOpposition: true,
    };
    expect(draft.participantStatements.value).toEqual({ supported: false });
    draft.conversationTypeConfig.value = {
      conversationType: "polis",
      votingPresentation: "list",
    };
    expect(draft.participantStatements.value).toEqual({
      supported: true,
      enabled: true,
    });
    const snapshot = draft.getDraftSnapshot();
    if (snapshot.participantStatements.supported)
      snapshot.participantStatements.enabled = false;
    expect(draft.participantStatements.value).toEqual({
      supported: true,
      enabled: true,
    });
  });
  it("never publishes an invalid family/policy pair to synchronous persistence watchers", () => {
    const scope = effectScope();
    const invalidSnapshots: unknown[] = [];
    try {
      scope.run(() => {
        const draft = useConversationDraft({ syncToStore: true });
        const store = useNewPostDraftsStore();
        draft.title.value = "Keep this title";
        watch(
          () => store.conversationDraft,
          (value) => {
            if (!zodSerializableConversationDraft.safeParse(value).success)
              invalidSnapshots.push(value);
          },
          { flush: "sync", deep: true }
        );
        draft.conversationTypeConfig.value = {
          conversationType: "prioritizing",
          prioritizationType: "qv",
          creditPricing: "quadratic",
          allowOpposition: true,
        };
        draft.participantStatements.value = { supported: true, enabled: true };
        expect(store.conversationDraft.participantStatements).toEqual({
          supported: false,
        });
        draft.conversationTypeConfig.value = {
          conversationType: "prioritizing",
          prioritizationType: "comparisons",
          comparisonMethod: "pairwise",
        };
        expect(store.conversationDraft.participantStatements).toEqual({
          supported: true,
          enabled: false,
        });
        expect(store.conversationDraft.title).toBe("Keep this title");
        expect(invalidSnapshots).toEqual([]);
      });
    } finally {
      scope.stop();
    }
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
        conversationType: "prioritizing",
        prioritizationType: "comparisons",
        comparisonMethod: "bws",
      };
      expect(store.conversationDraft).toMatchObject({
        conversationType: "prioritizing",
        prioritizationType: "comparisons",
        comparisonMethod: "bws",
      });
      expect(store.conversationDraft).not.toHaveProperty("votingPresentation");
      draft.title.value = "New title";
      expect(store.conversationDraft).toMatchObject({
        title: "New title",
        comparisonMethod: "bws",
      });
      draft.conversationTypeConfig.value = {
        conversationType: "polis",
        votingPresentation: "one_at_a_time",
      };
      expect(store.conversationDraft).toMatchObject({
        conversationType: "polis",
        votingPresentation: "one_at_a_time",
      });
      expect(store.conversationDraft).not.toHaveProperty("comparisonMethod");
      draft.resetDraft();
      expect(draft.conversationTypeConfig.value).toEqual({
        conversationType: "polis",
        votingPresentation: "list",
      });
    } finally {
      scope.stop();
    }
  });

  it("preserves QV statement descriptions across mode switches and resets the structured draft", () => {
    const draft = useConversationDraft({ syncToStore: false });
    draft.seedOpinions.value = ["Existing BWS title"];
    draft.conversationTypeConfig.value = {
      conversationType: "prioritizing",
      prioritizationType: "qv",
      creditPricing: "quadratic",
      allowOpposition: false,
    };
    expect(draft.qvItems.value.at(0)?.title).toBe("Existing BWS title");
    draft.qvItems.value = [
      {
        localKey: "qv-1",
        title: "Structured title",
        description: "<p>Keep these details</p>",
      },
    ];
    draft.conversationTypeConfig.value = {
      conversationType: "prioritizing",
      prioritizationType: "comparisons",
      comparisonMethod: "bws",
    };
    draft.conversationTypeConfig.value = {
      conversationType: "prioritizing",
      prioritizationType: "qv",
      creditPricing: "quadratic",
      allowOpposition: false,
    };
    expect(draft.qvItems.value).toEqual([
      {
        localKey: "qv-1",
        title: "Structured title",
        description: "<p>Keep these details</p>",
      },
    ]);
    expect(draft.isDraftModified()).toBe(true);
    draft.resetDraft();
    expect(draft.qvItems.value).toEqual([]);
    expect(draft.isDraftModified()).toBe(false);
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
