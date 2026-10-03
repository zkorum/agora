import type { ConversationDraft } from "src/composables/conversation/draft/conversationDraft.types";
import { resolveDraftPublicationIdentityAtBoundary } from "src/composables/conversation/draft/conversationDraft.utils";
import { htmlToCountedText } from "src/shared/richText";
import { useUserStore } from "src/stores/user";
import {
  type GenerateSeedSuggestionsFailure,
  useBackendSeedSuggestionApi,
} from "src/utils/api/seedSuggestion/seedSuggestion";
import { computed, type Ref, ref } from "vue";

/** Above this many statements on the page, AI suggestions are no longer offered. */
export const MAX_STATEMENTS_FOR_SEED_SUGGESTIONS = 20;
/** The API accepts at most this many seed statements per conversation. */
export const MAX_SEED_STATEMENTS = 50;
const MAX_EXISTING_STATEMENTS_SENT = 100;
const MAX_LENGTH_EXISTING_STATEMENT_SENT = 1000;

/** An AI suggestion shown in the Suggestions box, not yet acted on. */
export interface SeedSuggestionItem {
  generationId: string;
  suggestionId: string;
  text: string;
}

/** Turns a plain-text suggestion into the HTML a statement editor holds. */
export function plainTextToStatementHtml(text: string): string {
  const escaped = text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  return `<p>${escaped}</p>`;
}

/**
 * Plain text of everything already on the page, sent with a request so that new
 * suggestions do not repeat it: the author's statements, then earlier suggestions.
 */
export function buildExistingStatements({
  seedOpinions,
  shownSuggestionTexts,
}: {
  seedOpinions: readonly string[];
  shownSuggestionTexts: readonly string[];
}): string[] {
  const texts = [
    ...seedOpinions.map((html) => htmlToCountedText(html)),
    ...shownSuggestionTexts,
  ]
    .map((text) => text.trim().slice(0, MAX_LENGTH_EXISTING_STATEMENT_SENT))
    .filter((text) => text !== "");
  return [...new Set(texts)].slice(-MAX_EXISTING_STATEMENTS_SENT);
}

/**
 * AI suggestions for the seed statements of a conversation draft.
 *
 * Everything here lives on the page only: suggestions are lost when the author
 * leaves. A suggestion enters the draft only when the author adds it as a statement.
 */
export function useSeedSuggestions({
  conversationDraft,
}: {
  conversationDraft: Ref<ConversationDraft>;
}) {
  const userStore = useUserStore();
  const { generateSeedSuggestions, recordSeedSuggestionUse } =
    useBackendSeedSuggestionApi();

  const pendingSuggestions = ref<SeedSuggestionItem[]>([]);
  const shownSuggestionTexts = ref<string[]>([]);
  // Set when the model was not confident. No new request can be made until the
  // author goes back to edit the conversation, which resets this page.
  const notConfidentTip = ref<string | undefined>(undefined);
  const isGenerating = ref(false);

  const statementCount = computed(
    () => conversationDraft.value.seedOpinions.length
  );
  const canGenerate = computed(
    () =>
      !isGenerating.value &&
      notConfidentTip.value === undefined &&
      statementCount.value <= MAX_STATEMENTS_FOR_SEED_SUGGESTIONS
  );
  const canTakeSuggestion = computed(
    () => statementCount.value < MAX_SEED_STATEMENTS
  );

  async function generate(): Promise<
    | { success: true }
    | { success: false; reason: GenerateSeedSuggestionsFailure }
  > {
    if (!canGenerate.value) {
      return { success: true };
    }
    isGenerating.value = true;
    try {
      const draft = conversationDraft.value;
      const identity = await resolveDraftPublicationIdentityAtBoundary({
        postAs: draft.postAs,
        getProfile: () => userStore.profileData,
        loadProfile: userStore.loadUserProfile,
      });
      if (identity.status !== "resolved") {
        return { success: false, reason: "not_available" };
      }

      const result = await generateSeedSuggestions({
        draftId: draft.aiSuggestionDraftId,
        conversationTitle: draft.title,
        conversationBody: draft.content === "" ? undefined : draft.content,
        conversationType: draft.conversationType,
        postAsOrganization: identity.organizationSlug,
        existingStatements: buildExistingStatements({
          seedOpinions: draft.seedOpinions,
          shownSuggestionTexts: shownSuggestionTexts.value,
        }),
      });
      if (result.status === "error") {
        return { success: false, reason: result.reason };
      }

      const { data } = result;
      if (!data.confident) {
        notConfidentTip.value = data.tip;
        return { success: true };
      }
      const newSuggestions = data.suggestions.map((suggestion) => ({
        generationId: data.generationId,
        suggestionId: suggestion.suggestionId,
        text: suggestion.text,
      }));
      pendingSuggestions.value = [
        ...pendingSuggestions.value,
        ...newSuggestions,
      ];
      shownSuggestionTexts.value = [
        ...shownSuggestionTexts.value,
        ...newSuggestions.map((suggestion) => suggestion.text),
      ];
      return { success: true };
    } finally {
      isGenerating.value = false;
    }
  }

  function removeFromBox(suggestionId: string): SeedSuggestionItem | undefined {
    const suggestion = pendingSuggestions.value.find(
      (item) => item.suggestionId === suggestionId
    );
    pendingSuggestions.value = pendingSuggestions.value.filter(
      (item) => item.suggestionId !== suggestionId
    );
    return suggestion;
  }

  /**
   * Moves a suggestion out of the box and into the draft's statements, where the
   * author can edit it like any other. Returns the position of the new statement,
   * or undefined if nothing was added.
   */
  function add(suggestionId: string): number | undefined {
    if (!canTakeSuggestion.value) {
      return undefined;
    }
    const suggestion = removeFromBox(suggestionId);
    if (suggestion === undefined) {
      return undefined;
    }
    conversationDraft.value.seedOpinions.push(
      plainTextToStatementHtml(suggestion.text)
    );
    void recordSeedSuggestionUse({
      draftId: conversationDraft.value.aiSuggestionDraftId,
      generationId: suggestion.generationId,
      suggestionId: suggestion.suggestionId,
    });
    return conversationDraft.value.seedOpinions.length - 1;
  }

  function discard(suggestionId: string): void {
    removeFromBox(suggestionId);
  }

  return {
    pendingSuggestions,
    notConfidentTip,
    isGenerating,
    canGenerate,
    canTakeSuggestion,
    generate,
    add,
    discard,
  };
}
