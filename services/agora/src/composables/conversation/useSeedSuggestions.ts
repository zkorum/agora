import type { ConversationDraft } from "src/composables/conversation/draft/conversationDraft.types";
import { resolveDraftPublicationIdentityAtBoundary } from "src/composables/conversation/draft/conversationDraft.utils";
import { htmlToCountedText } from "src/shared/richText";
import {
  getSeedOpinionComparisonKey,
  MAX_SEED_OPINIONS_PER_SUBMISSION,
} from "src/shared/seedOpinions";
import {
  type GenerateSeedSuggestionsResponse,
  MAX_LENGTH_SEED_SUGGESTION_EXISTING_STATEMENT,
  MAX_SEED_SUGGESTION_EXISTING_STATEMENTS,
  SEED_SUGGESTION_TARGET_COUNT,
} from "src/shared/types/dto";
import { useUserStore } from "src/stores/user";
import { getErrorLogContext } from "src/utils/api/errorLog";
import {
  type GenerateSeedSuggestionsFailure,
  useBackendSeedSuggestionApi,
} from "src/utils/api/seedSuggestion/seedSuggestion";
import {
  computed,
  getCurrentScope,
  onScopeDispose,
  type Ref,
  ref,
  shallowRef,
  watch,
} from "vue";

/** Above this many statements on the page, AI suggestions are no longer offered. */
export const MAX_STATEMENTS_FOR_SEED_SUGGESTIONS = 20;

export type SeedSuggestionContext = Readonly<
  Pick<
    ConversationDraft,
    | "aiSuggestionDraftId"
    | "title"
    | "content"
    | "postAs"
    | "conversationType"
    | "externalSourceConfig"
  >
>;

type GenerationState =
  | { status: "idle" }
  | { status: "generating"; controller: AbortController };

/** An AI suggestion shown in the Suggestions box, not yet acted on. */
type ConfidentSeedSuggestionsResponse = Extract<
  GenerateSeedSuggestionsResponse,
  { confident: true }
>;
export type SeedSuggestionItem = Readonly<
  ConfidentSeedSuggestionsResponse["suggestions"][number] &
    Pick<ConfidentSeedSuggestionsResponse, "generationId">
>;

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
  suggestionHistory,
}: {
  seedOpinions: readonly string[];
  suggestionHistory: readonly string[];
}): string[] {
  const seeds = seedOpinions.map(htmlToCountedText);
  const historyCapacity = Math.max(
    0,
    MAX_SEED_SUGGESTION_EXISTING_STATEMENTS - seeds.length
  );
  const history =
    historyCapacity === 0 ? [] : suggestionHistory.slice(-historyCapacity);
  const seen = new Set<string>();
  return [...seeds, ...history]
    .map((text) =>
      text.trim().slice(0, MAX_LENGTH_SEED_SUGGESTION_EXISTING_STATEMENT)
    )
    .filter((text) => {
      const key = getSeedOpinionComparisonKey(text);
      if (key === "" || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_SEED_SUGGESTION_EXISTING_STATEMENTS);
}

/**
 * AI suggestions for the seed statements of a conversation draft.
 *
 * Everything here lives on the page only: suggestions are lost when the author
 * leaves. A suggestion enters the draft only when the author adds it as a statement.
 */
export function useSeedSuggestions({
  context,
  opinions,
  disabled,
  existingOpinions,
}: {
  context: Readonly<Ref<SeedSuggestionContext>>;
  opinions: Ref<string[]>;
  disabled: Readonly<Ref<boolean>>;
  existingOpinions: Readonly<Ref<readonly string[]>>;
}) {
  const userStore = useUserStore();
  const { generateSeedSuggestions, recordSeedSuggestionUse } =
    useBackendSeedSuggestionApi();

  const pendingSuggestions = ref<SeedSuggestionItem[]>([]);
  const suggestionHistory = ref<string[]>([]);
  const clarificationGuidance = ref<string>();
  const generation = shallowRef<GenerationState>({ status: "idle" });
  const isGenerating = computed(() => generation.value.status === "generating");

  function cancelGeneration(): void {
    if (generation.value.status === "generating") {
      generation.value.controller.abort();
      generation.value = { status: "idle" };
    }
  }

  function reset(): void {
    cancelGeneration();
    pendingSuggestions.value = [];
    suggestionHistory.value = [];
    clarificationGuidance.value = undefined;
  }

  watch(
    [
      () => context.value.aiSuggestionDraftId,
      () => context.value.title,
      () => context.value.content,
      () => context.value.postAs.postAsOrganization,
      () => context.value.postAs.organizationName,
      () => context.value.conversationType,
      () => context.value.externalSourceConfig,
    ],
    reset,
    { flush: "sync" }
  );
  watch(
    disabled,
    (isDisabled) => {
      if (isDisabled) cancelGeneration();
    },
    { flush: "sync" }
  );
  if (getCurrentScope() !== undefined) onScopeDispose(cancelGeneration);

  const allSeedOpinions = computed(() => [
    ...existingOpinions.value,
    ...opinions.value,
  ]);
  const statementCount = computed(
    () => existingOpinions.value.length + opinions.value.length
  );
  const existingStatementKeys = computed(
    () =>
      new Set(
        allSeedOpinions.value.map((html) =>
          getSeedOpinionComparisonKey(htmlToCountedText(html))
        )
      )
  );
  const canGenerate = computed(
    () =>
      !isGenerating.value &&
      !disabled.value &&
      clarificationGuidance.value === undefined &&
      context.value.externalSourceConfig === null &&
      pendingSuggestions.value.length <=
        MAX_SEED_SUGGESTION_EXISTING_STATEMENTS -
          SEED_SUGGESTION_TARGET_COUNT &&
      statementCount.value <= MAX_STATEMENTS_FOR_SEED_SUGGESTIONS
  );
  const canAddSuggestion = computed(
    () =>
      !disabled.value &&
      opinions.value.length < MAX_SEED_OPINIONS_PER_SUBMISSION
  );

  async function generate(
    turnstileToken?: string
  ): Promise<
    | { status: "success" | "skipped" }
    | { status: "error"; reason: GenerateSeedSuggestionsFailure }
  > {
    if (!canGenerate.value) {
      return { status: "skipped" };
    }
    const controller = new AbortController();
    generation.value = { status: "generating", controller };
    try {
      const draft = context.value;
      if (draft.conversationType === "gathering") return { status: "skipped" };
      const identity = await resolveDraftPublicationIdentityAtBoundary({
        postAs: draft.postAs,
        getProfile: () => userStore.profileData,
        loadProfile: userStore.loadUserProfile,
      });
      if (controller.signal.aborted) return { status: "skipped" };
      if (identity.status !== "resolved") {
        return { status: "error", reason: "not_available" };
      }
      const result = await generateSeedSuggestions({
        turnstileToken,
        signal: controller.signal,
        request: {
          draftId: draft.aiSuggestionDraftId,
          conversationTitle: draft.title,
          conversationBody: draft.content === "" ? undefined : draft.content,
          conversationType: draft.conversationType,
          postAsOrganization: identity.organizationSlug,
          existingStatements: buildExistingStatements({
            seedOpinions: allSeedOpinions.value,
            suggestionHistory: suggestionHistory.value,
          }),
        },
      });
      if (controller.signal.aborted) return { status: "skipped" };
      if (result.status === "error") {
        return { status: "error", reason: result.reason };
      }

      const { data } = result;
      if (!data.confident) {
        clarificationGuidance.value = data.tip;
        return { status: "success" };
      }
      const existing = new Set([
        ...existingStatementKeys.value,
        ...suggestionHistory.value.map(getSeedOpinionComparisonKey),
      ]);
      const newSuggestions = data.suggestions
        .filter((suggestion) => {
          const key = getSeedOpinionComparisonKey(suggestion.text);
          if (existing.has(key)) return false;
          existing.add(key);
          return true;
        })
        .map((suggestion) => ({
          generationId: data.generationId,
          suggestionId: suggestion.suggestionId,
          text: suggestion.text,
        }));
      pendingSuggestions.value = [
        ...pendingSuggestions.value,
        ...newSuggestions,
      ];
      suggestionHistory.value = [
        ...suggestionHistory.value,
        ...newSuggestions.map((suggestion) => suggestion.text),
      ].slice(-MAX_SEED_SUGGESTION_EXISTING_STATEMENTS);
      return { status: "success" };
    } catch (error) {
      if (controller.signal.aborted) return { status: "skipped" };
      console.warn(
        "Seed suggestion state update failed",
        getErrorLogContext(error)
      );
      return { status: "error", reason: "failed" };
    } finally {
      if (
        generation.value.status === "generating" &&
        generation.value.controller === controller
      ) {
        generation.value = { status: "idle" };
      }
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
   * author can edit it like any other.
   */
  function add(suggestionId: string): void {
    if (!canAddSuggestion.value) return;
    const suggestion = removeFromBox(suggestionId);
    if (suggestion === undefined) return;
    const key = getSeedOpinionComparisonKey(suggestion.text);
    if (existingStatementKeys.value.has(key)) return;
    opinions.value = [
      ...opinions.value,
      plainTextToStatementHtml(suggestion.text),
    ];
    void recordSeedSuggestionUse({
      draftId: context.value.aiSuggestionDraftId,
      generationId: suggestion.generationId,
      suggestionId: suggestion.suggestionId,
    });
  }

  function discard(suggestionId: string): void {
    if (!disabled.value) removeFromBox(suggestionId);
  }

  return {
    pendingSuggestions,
    clarificationGuidance,
    isGenerating,
    canGenerate,
    canAddSuggestion,
    generate,
    add,
    discard,
    reset,
  };
}
