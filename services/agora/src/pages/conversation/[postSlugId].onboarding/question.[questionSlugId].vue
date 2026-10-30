<template>
  <ConversationOnboardingLayout
    :sheet="sheet"
    :back-callback="handleBackAction"
    :close-callback="handleCloseToConversation"
  >
    <PageLoadingSpinner
      v-if="
        isInitialLoading ||
        (question === undefined && isRefreshingSurvey) ||
        surveyStatus?.surveyGate.hasSurvey === false
      "
    />

    <ErrorRetryBlock
      v-else-if="hasLoadError || question === undefined"
      :title="t('failedToLoadSurveyTitle')"
      :retry-label="t('tryAgainLabel')"
      @retry="refetchAll"
    />

    <StepperLayout
      v-else-if="question !== undefined"
      :fixed-navigation="true"
      :submit-call-back="handleNext"
      :current-step="currentSurveyStep"
      :total-steps="surveyStepTotal"
      :enable-next-button="canNavigateForward"
      :show-next-button="true"
      :show-loading-button="isBusy"
      density="compact"
    >
      <template #header>
        <div class="survey-progress">{{ progressLabel }}</div>
      </template>

      <template #body="{ navigationElement }">
        <div class="survey-card">
          <div class="survey-card__prompt-row">
            <h1 class="survey-card__prompt">{{ displayedQuestionText }}</h1>

            <q-chip
              v-if="question.isStale"
              dense
              color="warning"
              text-color="black"
              :label="t('needsUpdateLabel')"
            />
            <q-chip
              v-else-if="isQuestionRequired"
              dense
              color="primary"
              text-color="white"
              :label="t('requiredLabel')"
            />
            <q-chip
              v-else
              dense
              color="grey-3"
              text-color="black"
              :label="t('optionalLabel')"
            />
          </div>

          <ContentTranslationControl
            v-if="displayedSurveyQuestionTranslationPreview !== undefined"
            v-model="surveyQuestionTranslationMode"
            :source-language-label="
              displayedSurveyQuestionTranslationPreview.sourceLanguageLabel
            "
            :translation-status="
              displayedSurveyQuestionTranslationPreview.translationStatus
            "
            class="survey-card__translation-control"
          />

          <div
            v-if="questionDescription || showPublicAggregateSuppressionNotice"
            class="survey-card__copy-stack"
          >
            <div v-if="questionDescription" class="survey-card__description">
              {{ questionDescription }}
            </div>

            <div
              v-if="showPublicAggregateSuppressionNotice"
              class="survey-card__privacy-note"
            >
              {{ t("publicAggregateSuppressionNotice") }}
            </div>
          </div>

          <SurveyChoiceInput
            v-if="question.questionType === 'choice'"
            :choice-display="question.choiceDisplay"
            :is-multiple-selection="!isSingleSelectionQuestion"
            :is-required="isQuestionRequired"
            :options="choiceOptions"
            :option-text-values="optionTextValues"
            :selected-single-option-slug-id="selectedSingleOptionSlugId"
            :selected-multi-option-slug-ids="selectedMultiOptionSlugIds"
            :select-option-label="t('selectOptionLabel')"
            :max-selections="question.constraints.maxSelections"
            :popup-bottom-boundary="navigationElement"
            density="compact"
            @update:selected-single-option-slug-id="
              selectedSingleOptionSlugId = $event
            "
            @update:selected-multi-option-slug-ids="
              selectedMultiOptionSlugIds = $event
            "
            @update:option-text-values="optionTextValues = $event"
          />

          <div v-else class="survey-card__editor">
            <ZKDigitsInput
              v-if="isIntegerQuestion"
              v-model="textValueHtml"
              :label="displayedQuestionText"
              :placeholder="t('writeAnswerPlaceholder')"
              :error="isFreeTextInvalid"
              :hide-bottom-space="true"
            />

            <Editor
              v-else
              v-model="textValueHtml"
              v-model:plain-text="textValuePlain"
              :placeholder="t('writeAnswerPlaceholder')"
              min-height="8rem"
              :show-toolbar="true"
              :single-line="false"
              :disabled="false"
              :max-length="freeTextMaxLength"
              :show-character-count="false"
            />

            <div
              class="survey-card__help-text"
              :class="{
                'survey-card__help-text--invalid': isFreeTextInvalid,
              }"
            >
              {{ freeTextHelpText }}
            </div>
          </div>
        </div>
      </template>
    </StepperLayout>
  </ConversationOnboardingLayout>
</template>

<script setup lang="ts">
import { useQueryClient } from "@tanstack/vue-query";
import { storeToRefs } from "pinia";
import Editor from "src/components/editor/Editor.vue";
import StepperLayout from "src/components/onboarding/layouts/StepperLayout.vue";
import SurveyChoiceInput from "src/components/survey/SurveyChoiceInput.vue";
import ContentTranslationControl from "src/components/translation/ContentTranslationControl.vue";
import ErrorRetryBlock from "src/components/ui/ErrorRetryBlock.vue";
import PageLoadingSpinner from "src/components/ui/PageLoadingSpinner.vue";
import ZKDigitsInput from "src/components/ui-library/ZKDigitsInput.vue";
import { useConversationOnboardingCompletion } from "src/composables/conversation/useConversationOnboardingCompletion";
import { useConversationOnboardingExit } from "src/composables/conversation/useConversationOnboardingExit";
import { useConversationOnboardingRoute } from "src/composables/conversation/useConversationOnboardingRoute";
import { useConversationSurveyState } from "src/composables/conversation/useConversationSurveyState";
import { useSurveyAnswerDraft } from "src/composables/conversation/useSurveyAnswerDraft";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import ConversationOnboardingLayout from "src/layouts/ConversationOnboardingLayout.vue";
import type {
  ConversationParticipationRejection,
  SurveyAnswerSaveResponse,
} from "src/shared/types/dto";
import { useLanguageStore } from "src/stores/language";
import {
  type SurveyFormData,
  useSurveyAnswerSaveMutation,
} from "src/utils/api/survey/useSurveyQueries";
import { useGoBackButtonHandler } from "src/utils/nav/goBackButton";
import { useViewerQueryScope } from "src/utils/query/viewerScope";
import { getSingleRouteParam } from "src/utils/router/params";
import {
  getSurveyFreeTextCharacterCount,
  isSurveyAnswerSubmittable,
} from "src/utils/survey/answer";
import {
  isIntegerFreeTextQuestion,
  isSingleSelectionChoiceQuestion,
} from "src/utils/survey/config";
import {
  getConversationOnboardingStepPath,
  getConversationPath,
  getConversationSurveyCompletePath,
  getConversationSurveyContinuePath,
  getConversationSurveyOnboardingPath,
  getConversationSurveyQuestionPath,
  getConversationSurveySummaryPath,
} from "src/utils/survey/navigation";
import { surveyTemplateTextTranslations } from "src/utils/survey/templates.i18n";
import { getConversationLanguageSettingSourceLanguageCode } from "src/utils/translation/contentTranslation";
import { useSurveyQuestionDisplayContent } from "src/utils/translation/useSurveyQuestionDisplayContent";
import type { DismissalController } from "src/utils/ui/dismissalController";
import { useNotify } from "src/utils/ui/notify";
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";

import {
  type ConversationSurveyQuestionTranslations,
  conversationSurveyQuestionTranslations,
} from "./question.[questionSlugId].i18n";

type SurveyFormQuestion = SurveyFormData["questions"][number];
type SurveyDraftSaveResult =
  | { kind: "unchanged" }
  | { kind: "cancelled" }
  | {
      kind: "saved";
      response: Extract<SurveyAnswerSaveResponse, { success: true }>;
    }
  | {
      kind: "blocked";
      response: ConversationParticipationRejection;
    }
  | {
      kind: "changed";
      response: Extract<SurveyAnswerSaveResponse, { reason: "survey_changed" }>;
    }
  | { kind: "failed" };

defineProps<{ sheet: DismissalController }>();
const router = useRouter();
const queryClient = useQueryClient();
const { route, routeConversationSlugId, routeContext } =
  useConversationOnboardingRoute();
const { safeNavigateBack } = useGoBackButtonHandler();
const { showNotifyMessage } = useNotify();
const { exitToConversation } = useConversationOnboardingExit();
const { completeOnboarding } = useConversationOnboardingCompletion();
const { displayLanguage } = storeToRefs(useLanguageStore());
const { t } = useComponentI18n<ConversationSurveyQuestionTranslations>(
  conversationSurveyQuestionTranslations
);

const {
  conversationData,
  conversationSlugId,
  surveyStatus,
  surveyForm,
  surveyStepTotal,
  isInitialLoading,
  isRefreshingSurvey,
  hasLoadError,
  refetchAll,
} = useConversationSurveyState({
  conversationSlugId: routeConversationSlugId,
});

const saveMutation = useSurveyAnswerSaveMutation({ conversationSlugId });

const routeQuestionSlugId = computed(() => {
  return getSingleRouteParam(
    "questionSlugId" in route.params ? route.params.questionSlugId : undefined
  );
});

const questionIndex = computed(() => {
  return (
    surveyForm.value?.questions.findIndex((questionItem) => {
      return questionItem.questionSlugId === routeQuestionSlugId.value;
    }) ?? -1
  );
});

const question = computed<SurveyFormQuestion | undefined>(() => {
  if (questionIndex.value < 0) {
    return undefined;
  }

  return surveyForm.value?.questions[questionIndex.value];
});

const conversationSourceLanguageCode = computed(() => {
  const metadata = conversationData.value?.metadata;
  if (metadata === undefined) {
    return undefined;
  }

  return getConversationLanguageSettingSourceLanguageCode({
    contentLanguageMetadata: metadata.contentLanguageMetadata,
    languageSetting: metadata.languageSetting,
  });
});
const originalQuestionContent = computed(() => {
  const currentQuestion = question.value;
  return {
    questionText: currentQuestion?.questionText ?? "",
    options:
      currentQuestion?.questionType === "choice"
        ? currentQuestion.options.map((option) => ({
            optionSlugId: option.optionSlugId,
            optionText: option.optionText,
          }))
        : [],
  };
});
const {
  displayedContent: displayedQuestionContent,
  translationPreview: displayedSurveyQuestionTranslationPreview,
  translationMode: surveyQuestionTranslationMode,
} = useSurveyQuestionDisplayContent({
  conversationSlugId,
  questionSlugId: routeQuestionSlugId,
  originalContent: originalQuestionContent,
  sourceLanguageCode: conversationSourceLanguageCode,
  displayContent: computed(() => question.value?.displayContent),
});

const isSurveyOptional = computed(() => {
  return surveyForm.value?.surveyGate.isOptional === true;
});

const isQuestionRequired = computed(() => {
  return question.value?.isRequired === true && !isSurveyOptional.value;
});

const previousQuestionSlugId = computed(() => {
  if (questionIndex.value <= 0) {
    return undefined;
  }

  return surveyForm.value?.questions[questionIndex.value - 1]?.questionSlugId;
});

const nextQuestionSlugId = computed(() => {
  if (questionIndex.value < 0) {
    return undefined;
  }

  return surveyForm.value?.questions[questionIndex.value + 1]?.questionSlugId;
});

const viewerScope = useViewerQueryScope();
const {
  selectedSingleOptionSlugId,
  selectedMultiOptionSlugIds,
  optionTextValues,
  textValueHtml,
  textValuePlain,
  draftAnswer,
  hasDraftChanged,
  isDraftReady,
} = useSurveyAnswerDraft({
  question,
  viewerUserId: () => viewerScope.value.userId,
});

const choiceOptions = computed(() => {
  const currentQuestion = question.value;
  if (
    currentQuestion === undefined ||
    currentQuestion.questionType !== "choice"
  ) {
    return [];
  }

  const displayedTextBySlugId = new Map(
    displayedQuestionContent.value.options.map((option) => [
      option.optionSlugId,
      option.optionText,
    ])
  );
  return currentQuestion.options.map((option) => ({
    label: displayedTextBySlugId.get(option.optionSlugId) ?? option.optionText,
    value: option.optionSlugId,
    allowsText: option.allowsText === true,
  }));
});

const displayedQuestionText = computed(
  () => displayedQuestionContent.value.questionText
);

const isIntegerQuestion = computed(() => {
  const currentQuestion = question.value;
  if (currentQuestion === undefined) {
    return false;
  }

  return isIntegerFreeTextQuestion({ question: currentQuestion });
});

const templateTexts = computed(() => {
  const currentLocale = displayLanguage.value;
  return (
    surveyTemplateTextTranslations[currentLocale] ??
    surveyTemplateTextTranslations.en
  );
});

const shouldPersistPassOnLeave = computed(() => {
  const currentQuestion = question.value;

  if (
    !isDraftReady.value ||
    currentQuestion === undefined ||
    isQuestionRequired.value
  ) {
    return false;
  }

  return (
    currentQuestion.currentAnswer === undefined &&
    !currentQuestion.isPassed &&
    draftAnswer.value === undefined
  );
});

const canNavigateForward = computed(() => {
  const currentQuestion = question.value;

  if (!isDraftReady.value || currentQuestion === undefined) {
    return false;
  }
  if (draftAnswer.value === undefined) {
    return !isQuestionRequired.value || currentQuestion.isCurrentAnswerValid;
  }

  return isSurveyAnswerSubmittable({
    question: currentQuestion,
    answer: draftAnswer.value,
  });
});

const isBusy = ref(false);

const currentSurveyStep = computed(() => {
  return questionIndex.value + 3;
});

const progressLabel = computed(() => {
  const totalQuestions = surveyForm.value?.questions.length ?? 0;

  return t("questionProgress", {
    current: questionIndex.value + 1,
    total: totalQuestions,
  });
});

const questionDescription = computed(() => {
  const currentQuestion = question.value;

  if (currentQuestion === undefined) {
    return "";
  }
  if (currentQuestion.questionType === "choice") {
    if (isSingleSelectionChoiceQuestion({ question: currentQuestion })) {
      return isQuestionRequired.value
        ? t("chooseOneOptionDescription")
        : t("chooseZeroOrOneOptionDescription");
    }

    if (!isQuestionRequired.value) {
      if (currentQuestion.constraints.maxSelections !== undefined) {
        return t("optionalMultiChoiceBetweenDescription", {
          min: currentQuestion.constraints.minSelections,
          max: currentQuestion.constraints.maxSelections,
        });
      }

      return t("optionalMultiChoiceAtLeastDescription", {
        min: currentQuestion.constraints.minSelections,
      });
    }

    if (currentQuestion.constraints.maxSelections !== undefined) {
      return t("multiChoiceBetweenDescription", {
        min: currentQuestion.constraints.minSelections,
        max: currentQuestion.constraints.maxSelections,
      });
    }

    return t("multiChoiceAtLeastDescription", {
      min: currentQuestion.constraints.minSelections,
    });
  }
  if (currentQuestion.questionType === "free_text") {
    return "";
  }

  return "";
});

const showPublicAggregateSuppressionNotice = computed(() => {
  const currentQuestion = question.value;
  if (
    currentQuestion === undefined ||
    currentQuestion.questionType !== "choice"
  ) {
    return false;
  }

  return currentQuestion.isPublicAggregateSuppressionEnabled;
});

const isSingleSelectionQuestion = computed(() => {
  const currentQuestion = question.value;
  if (currentQuestion === undefined) {
    return false;
  }

  return isSingleSelectionChoiceQuestion({ question: currentQuestion });
});

const freeTextMaxLength = computed(() => {
  if (
    question.value?.questionType === "free_text" &&
    question.value.constraints.type === "free_text" &&
    question.value.constraints.inputMode !== "integer"
  ) {
    return question.value.constraints.maxPlainTextLength;
  }

  return undefined;
});

const freeTextCharacterCount = computed(() => {
  if (question.value?.questionType !== "free_text" || isIntegerQuestion.value) {
    return 0;
  }

  return getSurveyFreeTextCharacterCount({
    textValuePlainText: textValuePlain.value,
  });
});

const freeTextMinimumLength = computed(() => {
  if (
    question.value?.questionType === "free_text" &&
    question.value.constraints.type === "free_text" &&
    question.value.constraints.inputMode !== "integer"
  ) {
    return Math.max(question.value.constraints.minPlainTextLength ?? 0, 1);
  }

  return 0;
});

const isFreeTextInvalid = computed(() => {
  if (question.value?.questionType !== "free_text") {
    return false;
  }

  if (
    question.value.constraints.type === "free_text" &&
    question.value.constraints.inputMode === "integer"
  ) {
    if (textValueHtml.value.length === 0) {
      return false;
    }

    if (!/^\d+$/.test(textValueHtml.value)) {
      return true;
    }

    const parsedValue = Number(textValueHtml.value);
    if (!Number.isSafeInteger(parsedValue)) {
      return true;
    }

    return (
      parsedValue < question.value.constraints.minValue ||
      (question.value.constraints.maxValue !== undefined &&
        parsedValue > question.value.constraints.maxValue)
    );
  }

  if (freeTextCharacterCount.value > (freeTextMaxLength.value ?? Infinity)) {
    return true;
  }

  return (
    freeTextCharacterCount.value > 0 &&
    freeTextCharacterCount.value < freeTextMinimumLength.value
  );
});

const freeTextHelpText = computed(() => {
  const currentQuestion = question.value;

  if (
    currentQuestion === undefined ||
    currentQuestion.questionType !== "free_text" ||
    currentQuestion.constraints.type !== "free_text"
  ) {
    return "";
  }

  if (currentQuestion.constraints.inputMode === "integer") {
    if (currentQuestion.constraints.maxValue !== undefined) {
      return templateTexts.value.integerHelpBetween
        .replace("{min}", String(currentQuestion.constraints.minValue))
        .replace("{max}", String(currentQuestion.constraints.maxValue));
    }

    return templateTexts.value.integerHelpAtLeast.replace(
      "{min}",
      String(currentQuestion.constraints.minValue)
    );
  }

  return t("freeTextHelp", {
    count: freeTextCharacterCount.value,
    max: currentQuestion.constraints.maxPlainTextLength,
    min: freeTextMinimumLength.value,
  });
});

watch(
  [isInitialLoading, surveyForm, surveyStatus, question, isRefreshingSurvey],
  ([loading, formData, statusData, currentQuestion, refreshing]) => {
    if (loading || refreshing || statusData === undefined) {
      return;
    }
    if (!statusData.surveyGate.hasSurvey) {
      // Dismiss the obsolete screen, not claim eligibility from an absent form.
      void queryClient.invalidateQueries(
        { queryKey: ["participation-status", conversationSlugId.value] },
        { cancelRefetch: false }
      );
      void handleBackToConversation();
      return;
    }
    if (formData === undefined) return;
    if (!formData.surveyGate.hasSurvey) {
      void router.replace({
        path: getConversationPath({
          conversationSlugId: conversationSlugId.value,
          routeContext: routeContext.value,
        }),
      });
      return;
    }
    if (currentQuestion === undefined) {
      void router.replace({
        path: getConversationSurveyContinuePath({
          conversationSlugId: conversationSlugId.value,
          routeResolution: statusData.routeResolution,
          firstQuestionSlugId: formData.questions[0]?.questionSlugId,
          routeContext: routeContext.value,
        }),
      });
    }
  },
  { immediate: true }
);

async function handleBlockedReason(
  response: ConversationParticipationRejection
): Promise<void> {
  const status = response.participationStatus;
  if (status.status === "onboarding_required") {
    await router.replace({
      path: getConversationOnboardingStepPath({
        conversationSlugId: conversationSlugId.value,
        routeContext: routeContext.value,
        nextStep: status.nextStep,
      }),
    });
  } else {
    showNotifyMessage(t("conversationClosedMessage"));
    await handleBackToConversation();
  }
}

function getPreviousPath(): string {
  if (previousQuestionSlugId.value !== undefined) {
    return getConversationSurveyQuestionPath({
      conversationSlugId: conversationSlugId.value,
      questionSlugId: previousQuestionSlugId.value,
      routeContext: routeContext.value,
    });
  }

  return getConversationSurveyOnboardingPath({
    conversationSlugId: conversationSlugId.value,
    routeContext: routeContext.value,
  });
}

function getNextPath(): string {
  if (nextQuestionSlugId.value !== undefined) {
    return getConversationSurveyQuestionPath({
      conversationSlugId: conversationSlugId.value,
      questionSlugId: nextQuestionSlugId.value,
      routeContext: routeContext.value,
    });
  }

  return getConversationSurveySummaryPath({
    conversationSlugId: conversationSlugId.value,
    routeContext: routeContext.value,
  });
}

async function handleBackToConversation(): Promise<void> {
  await exitToConversation({
    conversationSlugId: conversationSlugId.value,
    routeContext: routeContext.value,
  });
}

async function handleCloseToConversation(): Promise<void> {
  await handleNavigation("close");
}

async function saveCurrentDraftIfNeeded(
  isCurrentView: () => boolean
): Promise<SurveyDraftSaveResult> {
  const currentQuestion = question.value;
  const form = surveyForm.value;
  if (currentQuestion === undefined || form === undefined) {
    return { kind: "failed" };
  }

  if (!hasDraftChanged.value && !shouldPersistPassOnLeave.value) {
    return { kind: "unchanged" };
  }

  const answer = draftAnswer.value;
  if (
    answer !== undefined &&
    !isSurveyAnswerSubmittable({
      question: currentQuestion,
      answer,
    })
  ) {
    return { kind: "failed" };
  }

  try {
    const response = await saveMutation.mutateAsync({
      questionSlugId: currentQuestion.questionSlugId,
      expectedQuestionSemanticVersion: currentQuestion.currentSemanticVersion,
      knownSurveyRevision: form.currentRevision,
      answer: answer ?? null,
    });
    if (response === undefined) return { kind: "cancelled" };
    if (!isCurrentView()) return { kind: "cancelled" };
    if (!response.success && response.reason === "survey_changed") {
      return { kind: "changed", response };
    }
    return response.success
      ? { kind: "saved", response }
      : { kind: "blocked", response };
  } catch {
    if (!isCurrentView()) return { kind: "cancelled" };
    showNotifyMessage(t("failedToSaveAnswerMessage"));
    return { kind: "failed" };
  }
}

async function handleNavigation(
  action: "previous" | "next" | "close"
): Promise<void> {
  if (isBusy.value) return;
  const originatingPath = route.fullPath;
  const isCurrentView = () => route.fullPath === originatingPath;
  isBusy.value = true;
  try {
    const result = await saveCurrentDraftIfNeeded(isCurrentView);
    if (!isCurrentView()) return;
    if (result.kind === "failed" || result.kind === "cancelled") return;
    if (result.kind === "changed") {
      const response = result.response;
      showNotifyMessage(t("surveyChangedMessage"));
      if (response.recovery.kind === "no_survey") {
        await handleBackToConversation();
      } else {
        await router.replace({
          path: getConversationSurveyContinuePath({
            conversationSlugId: conversationSlugId.value,
            routeContext: routeContext.value,
            routeResolution: response.recovery.routeResolution,
            firstQuestionSlugId:
              response.recovery.form.questions[0]?.questionSlugId,
          }),
        });
      }
      return;
    }
    if (result.kind === "blocked") {
      await handleBlockedReason(result.response);
      return;
    }

    const gate =
      result.kind === "saved"
        ? result.response.surveyGate
        : surveyStatus.value?.surveyGate;
    const justCompleted =
      result.kind === "saved" && result.response.justCompleted;
    const isLastQuestion = nextQuestionSlugId.value === undefined;
    if (
      justCompleted ||
      (action === "next" && isLastQuestion && gate?.status === "complete_valid")
    ) {
      if (
        result.kind === "saved" &&
        result.response.participationStatus.status === "onboarding_required" &&
        result.response.participationStatus.nextStep.kind === "email_updates"
      ) {
        await router.push({
          path: getConversationSurveyCompletePath({
            conversationSlugId: conversationSlugId.value,
            routeContext: routeContext.value,
          }),
        });
        return;
      }
      await completeOnboarding({
        conversationSlugId: conversationSlugId.value,
        routeContext: routeContext.value,
      });
      return;
    }

    switch (action) {
      case "previous":
        await safeNavigateBack({ path: getPreviousPath() });
        break;
      case "next":
        await router.push({ path: getNextPath() });
        break;
      case "close":
        await handleBackToConversation();
        break;
    }
  } finally {
    isBusy.value = false;
  }
}

async function handleBackAction(): Promise<void> {
  await handleNavigation("previous");
}

async function handleNext(): Promise<void> {
  await handleNavigation("next");
}
</script>

<style scoped lang="scss">
.survey-progress {
  color: $color-text-weak;
  font-size: 0.85rem;
}

.survey-card {
  display: flex;
  flex-direction: column;
  gap: clamp(0.7rem, 1.6dvh, 1rem);
}

.survey-card__prompt-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.survey-card__prompt {
  margin: 0;
  letter-spacing: normal;
  font-size: 1.1rem;
  font-weight: 600;
  line-height: 1.4;
  color: black;
}

.survey-card__description {
  color: #4b5563;
  font-size: 0.95rem;
}

.survey-card__copy-stack {
  align-items: baseline;
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.5rem;
}

.survey-card__privacy-note {
  color: #6b7280;
  font-size: 0.8rem;
  line-height: 1.35;
}

.survey-card__editor {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.survey-card__help-text {
  color: #6b7280;
  font-size: 0.875rem;
}

.survey-card__help-text--invalid {
  color: $negative;
}
</style>
