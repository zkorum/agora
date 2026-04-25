<template>
  <OnboardingLayout
    :back-callback="handleBackAction"
    :close-callback="handleCloseToConversation"
    :show-close-button="true"
  >
    <template #body>
      <ConversationSurveyOnboardingHero :conversation-data="conversationData" />
    </template>

    <template #footer>
      <PageLoadingSpinner v-if="isInitialLoading" />

      <ErrorRetryBlock
        v-else-if="hasLoadError"
        :title="t('failedToLoadSurveyTitle')"
        :retry-label="t('tryAgainLabel')"
        @retry="refetchAll"
      />

      <StepperLayout
        v-else-if="question !== undefined"
        :submit-call-back="handleNext"
        :current-step="currentSurveyStep"
        :total-steps="surveyStepTotal"
        :enable-next-button="canNavigateForward"
        :show-next-button="true"
        :show-loading-button="isSaving"
      >
        <template #header>
          <InfoHeader
            :title="t('conversationSurveyTitle')"
            :description="progressLabel"
            icon-name="mdi-clipboard-edit-outline"
          />
        </template>

        <template #body>
          <div class="survey-card">
            <div class="survey-card__prompt-row">
              <div class="survey-card__prompt">{{ question.questionText }}</div>

              <q-chip
                v-if="question.isStale"
                dense
                color="warning"
                text-color="black"
                :label="t('needsUpdateLabel')"
              />
              <q-chip
                v-else-if="question.isRequired"
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

            <div v-if="questionDescription" class="survey-card__description">
              {{ questionDescription }}
            </div>

            <SurveyChoiceInput
              v-if="question.questionType === 'choice'"
              :choice-display="question.choiceDisplay"
              :is-multiple-selection="!isSingleSelectionQuestion"
              :is-required="question.isRequired"
              :options="choiceOptions"
              :selected-single-option-slug-id="selectedSingleOptionSlugId"
              :selected-multi-option-slug-ids="selectedMultiOptionSlugIds"
              :select-option-label="t('selectOptionLabel')"
              :max-selections="question.constraints.maxSelections"
              @update:selected-single-option-slug-id="
                selectedSingleOptionSlugId = $event
              "
              @update:selected-multi-option-slug-ids="
                selectedMultiOptionSlugIds = $event
              "
            />

            <div v-else class="survey-card__editor">
              <ZKDigitsInput
                v-if="isIntegerQuestion"
                v-model="textValueHtml"
                :placeholder="t('writeAnswerPlaceholder')"
                :error="isFreeTextInvalid"
                :hide-bottom-space="true"
              />

              <Editor
                v-else
                v-model="textValueHtml"
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
    </template>
  </OnboardingLayout>
</template>

<script setup lang="ts">
import Editor from "src/components/editor/Editor.vue";
import ConversationSurveyOnboardingHero from "src/components/onboarding/backgrounds/ConversationSurveyOnboardingHero.vue";
import StepperLayout from "src/components/onboarding/layouts/StepperLayout.vue";
import InfoHeader from "src/components/onboarding/ui/InfoHeader.vue";
import SurveyChoiceInput from "src/components/survey/SurveyChoiceInput.vue";
import ErrorRetryBlock from "src/components/ui/ErrorRetryBlock.vue";
import PageLoadingSpinner from "src/components/ui/PageLoadingSpinner.vue";
import ZKDigitsInput from "src/components/ui-library/ZKDigitsInput.vue";
import { useConversationOnboardingExit } from "src/composables/conversation/useConversationOnboardingExit";
import { useConversationSurveyState } from "src/composables/conversation/useConversationSurveyState";
import { useSurveyNavigation } from "src/composables/conversation/useSurveyNavigation";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import OnboardingLayout from "src/layouts/OnboardingLayout.vue";
import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import type {
  ParticipationBlockedReason,
  SurveyQuestionFormItem,
} from "src/shared/types/zod";
import { useConversationOnboardingStore } from "src/stores/conversationOnboarding";
import { useSurveyAnswerSaveMutation } from "src/utils/api/survey/useSurveyQueries";
import { useGoBackButtonHandler } from "src/utils/nav/goBackButton";
import { getSingleRouteParam } from "src/utils/router/params";
import {
  areSurveyAnswersEqual,
  getSurveyFreeTextCharacterCount,
  isSurveyAnswerSubmittable,
  normalizeSurveyAnswer,
} from "src/utils/survey/answer";
import {
  isIntegerFreeTextQuestion,
  isSingleSelectionChoiceQuestion,
} from "src/utils/survey/config";
import {
  getConversationPath,
  getConversationSurveyCompletePath,
  getConversationSurveyContinuePath,
  getConversationSurveyOnboardingPath,
  getConversationSurveyQuestionPath,
  getConversationSurveySummaryPath,
} from "src/utils/survey/navigation";
import { surveyTemplateTextTranslations } from "src/utils/survey/templates.i18n";
import { useNotify } from "src/utils/ui/notify";
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  type ConversationSurveyQuestionTranslations,
  conversationSurveyQuestionTranslations,
} from "./question.[questionSlugId].i18n";

const router = useRouter();
const route = useRoute();
const { safeNavigateBack } = useGoBackButtonHandler();
const { showNotifyMessage } = useNotify();
const { exitToConversation } = useConversationOnboardingExit();
const { navigateToNextSurveyStep, navigateToSurveyRoot } =
  useSurveyNavigation();
const conversationOnboardingStore = useConversationOnboardingStore();
const { t, locale } = useComponentI18n<ConversationSurveyQuestionTranslations>(
  conversationSurveyQuestionTranslations
);

const routeConversationSlugId = computed(() => {
  return getSingleRouteParam(route.params.postSlugId);
});

const {
  conversationData,
  conversationSlugId,
  surveyStatus,
  surveyForm,
  requirementState,
  isInitialLoading,
  hasLoadError,
  refetchAll,
} = useConversationSurveyState({ conversationSlugId: routeConversationSlugId });

const saveMutation = useSurveyAnswerSaveMutation({ conversationSlugId });

const routeQuestionSlugId = computed(() => {
  return getSingleRouteParam(route.params.questionSlugId);
});

const questionIndex = computed(() => {
  return (
    surveyForm.value?.questions.findIndex((questionItem) => {
      return questionItem.questionSlugId === routeQuestionSlugId.value;
    }) ?? -1
  );
});

const question = computed<SurveyQuestionFormItem | undefined>(() => {
  if (questionIndex.value < 0) {
    return undefined;
  }

  return surveyForm.value?.questions[questionIndex.value];
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

const selectedSingleOptionSlugId = ref<string | null>(null);
const selectedMultiOptionSlugIds = ref<string[]>([]);
const textValueHtml = ref("");

watch(
  question,
  (currentQuestion) => {
    if (currentQuestion === undefined) {
      selectedSingleOptionSlugId.value = null;
      selectedMultiOptionSlugIds.value = [];
      textValueHtml.value = "";
      return;
    }

    switch (currentQuestion.questionType) {
      case "choice": {
        const currentChoiceAnswer =
          currentQuestion.currentAnswer?.questionType === "choice"
            ? currentQuestion.currentAnswer
            : undefined;
        selectedSingleOptionSlugId.value = isSingleSelectionChoiceQuestion({
          question: currentQuestion,
        })
          ? (currentChoiceAnswer?.optionSlugIds[0] ?? null)
          : null;
        selectedMultiOptionSlugIds.value =
          currentChoiceAnswer !== undefined
            ? [...currentChoiceAnswer.optionSlugIds]
            : [];
        textValueHtml.value = "";
        break;
      }
      case "free_text":
        selectedSingleOptionSlugId.value = null;
        selectedMultiOptionSlugIds.value = [];
        textValueHtml.value =
          currentQuestion.currentAnswer?.questionType === "free_text"
            ? currentQuestion.currentAnswer.textValueHtml
            : "";
        break;
    }
  },
  { immediate: true }
);

const choiceOptions = computed<Array<{ label: string; value: string }>>(() => {
  const currentQuestion = question.value;
  if (currentQuestion === undefined || currentQuestion.questionType !== "choice") {
    return [];
  }

  return currentQuestion.options.flatMap((option) => {
    if (option.optionSlugId === undefined) {
      return [];
    }

    return [
      {
        label: option.optionText,
        value: option.optionSlugId,
      },
    ];
  });
});

const isIntegerQuestion = computed(() => {
  const currentQuestion = question.value;
  if (currentQuestion === undefined) {
    return false;
  }

  return isIntegerFreeTextQuestion({ question: currentQuestion });
});

const templateTexts = computed(() => {
  const currentLocale = locale.value as SupportedDisplayLanguageCodes;
  return (
    surveyTemplateTextTranslations[currentLocale] ??
    surveyTemplateTextTranslations.en
  );
});

const draftAnswer = computed(() => {
  const currentQuestion = question.value;

  if (currentQuestion === undefined) {
    return undefined;
  }

  return normalizeSurveyAnswer({
    question: currentQuestion,
    selectedSingleOptionSlugId: selectedSingleOptionSlugId.value,
    selectedMultiOptionSlugIds: selectedMultiOptionSlugIds.value,
    textValueHtml: textValueHtml.value,
  });
});

const hasDraftChanged = computed(() => {
  const currentQuestion = question.value;

  if (currentQuestion === undefined) {
    return false;
  }

  return !areSurveyAnswersEqual({
    left: currentQuestion.currentAnswer,
    right: draftAnswer.value,
  });
});

const shouldPersistPassOnLeave = computed(() => {
  const currentQuestion = question.value;

  if (currentQuestion === undefined || currentQuestion.isRequired) {
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

  if (currentQuestion === undefined) {
    return false;
  }
  if (draftAnswer.value === undefined) {
    return !currentQuestion.isRequired || currentQuestion.isCurrentAnswerValid;
  }

  return isSurveyAnswerSubmittable({
    question: currentQuestion,
    answer: draftAnswer.value,
  });
});

const isSaving = computed(() => saveMutation.isPending.value);

const surveyStepTotal = computed(() => {
  return (surveyForm.value?.questions.length ?? 0) + 3;
});

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
      return currentQuestion.isRequired
        ? t("chooseOneOptionDescription")
        : t("chooseZeroOrOneOptionDescription");
    }

    if (!currentQuestion.isRequired) {
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
    textValueHtml: textValueHtml.value,
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
  [isInitialLoading, requirementState],
  ([loading, requirements]) => {
    if (!loading && (requirements.needsAuth || requirements.needsTicket)) {
      void router.replace({
        path: getConversationSurveyOnboardingPath({
          conversationSlugId: conversationSlugId.value,
        }),
      });
    }
  },
  { immediate: true, deep: true }
);

watch(
  [isInitialLoading, surveyForm, surveyStatus, question],
  ([loading, formData, statusData, currentQuestion]) => {
    if (loading || formData === undefined || statusData === undefined) {
      return;
    }
    if (!formData.surveyGate.hasSurvey) {
      void router.replace({
        path: getConversationPath({
          conversationSlugId: conversationSlugId.value,
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
        }),
      });
    }
  },
  { immediate: true }
);

async function handleBlockedReason(
  reason: ParticipationBlockedReason
): Promise<void> {
  switch (reason) {
    case "survey_required":
    case "survey_outdated":
      await navigateToNextSurveyStep({
        conversationSlugId: conversationSlugId.value,
      });
      break;
    case "account_required":
    case "strong_verification_required":
    case "email_verification_required":
    case "event_ticket_required":
      await navigateToSurveyRoot({
        conversationSlugId: conversationSlugId.value,
      });
      break;
    case "conversation_closed":
    case "conversation_locked":
      showNotifyMessage(t("conversationClosedMessage"));
      await handleBackToConversation();
      break;
  }
}

function getPreviousPath(): string {
  if (previousQuestionSlugId.value !== undefined) {
    return getConversationSurveyQuestionPath({
      conversationSlugId: conversationSlugId.value,
      questionSlugId: previousQuestionSlugId.value,
    });
  }

  return getConversationSurveyOnboardingPath({
    conversationSlugId: conversationSlugId.value,
  });
}

function getNextPath(): string {
  if (nextQuestionSlugId.value !== undefined) {
    return getConversationSurveyQuestionPath({
      conversationSlugId: conversationSlugId.value,
      questionSlugId: nextQuestionSlugId.value,
    });
  }

  return getConversationSurveySummaryPath({
    conversationSlugId: conversationSlugId.value,
  });
}

async function handleBackToConversation(): Promise<void> {
  await exitToConversation({
    conversationSlugId: conversationSlugId.value,
  });
}

async function handleCloseToConversation(): Promise<void> {
  if (await saveCurrentDraftIfNeeded()) {
    await handleBackToConversation();
  }
}

async function saveCurrentDraftIfNeeded(): Promise<boolean> {
  const currentQuestion = question.value;

  if (currentQuestion === undefined) {
    return false;
  }

  if (!hasDraftChanged.value && !shouldPersistPassOnLeave.value) {
    return true;
  }

  try {
    if (draftAnswer.value === undefined) {
      if (currentQuestion.questionSlugId === undefined) {
        return false;
      }

      const response = await saveMutation.mutateAsync({
        questionSlugId: currentQuestion.questionSlugId,
        answer: null,
      });

      if (!response.success) {
        await handleBlockedReason(response.reason);
        return false;
      }

      if (response.justCompleted) {
        conversationOnboardingStore.markJustCompletedSurvey({
          conversationSlugId: conversationSlugId.value,
        });
        await router.push({
          path: getConversationSurveyCompletePath({
            conversationSlugId: conversationSlugId.value,
          }),
        });
        return false;
      }

      return true;
    }

    if (
      !isSurveyAnswerSubmittable({
        question: currentQuestion,
        answer: draftAnswer.value,
      })
    ) {
      return false;
    }

    if (currentQuestion.questionSlugId === undefined) {
      return false;
    }

    const response = await saveMutation.mutateAsync({
      questionSlugId: currentQuestion.questionSlugId,
      answer: draftAnswer.value,
    });

    if (!response.success) {
      await handleBlockedReason(response.reason);
      return false;
    }

    if (response.justCompleted) {
      conversationOnboardingStore.markJustCompletedSurvey({
        conversationSlugId: conversationSlugId.value,
      });
      await router.push({
        path: getConversationSurveyCompletePath({
          conversationSlugId: conversationSlugId.value,
        }),
      });
      return false;
    }

    return true;
  } catch {
    showNotifyMessage(t("failedToSaveAnswerMessage"));
    return false;
  }
}

async function handlePrevious(): Promise<void> {
  const previousPath = getPreviousPath();
  if (await saveCurrentDraftIfNeeded()) {
    await safeNavigateBack({ path: previousPath });
  }
}

async function handleBackAction(): Promise<void> {
  await handlePrevious();
}

async function handleNext(): Promise<void> {
  if (await saveCurrentDraftIfNeeded()) {
    await router.push({ path: getNextPath() });
  }
}
</script>

<style scoped lang="scss">
.survey-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.survey-card__prompt-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.survey-card__prompt {
  font-size: 1.1rem;
  font-weight: 600;
  line-height: 1.4;
  color: black;
}

.survey-card__description {
  color: #4b5563;
  font-size: 0.95rem;
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
