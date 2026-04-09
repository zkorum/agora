<template>
  <OnboardingLayout
    :back-callback="handleBackToLastAnsweredQuestion"
    :close-callback="handleBackToConversation"
    :show-close-button="true"
  >
    <template #body>
      <ConversationSurveyHero
        v-if="conversationData !== undefined"
        :conversation-title="conversationData.payload.title"
        :author-username="conversationData.metadata.authorUsername"
        :organization-name="conversationData.metadata.organization?.name ?? ''"
        :organization-image-url="
          conversationData.metadata.organization?.imageUrl ?? ''
        "
        :compact="true"
      />
      <DefaultImageExample v-else />
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
        v-else-if="surveyForm !== undefined && surveyStatus !== undefined"
        :submit-call-back="handlePrimaryAction"
        :current-step="surveyStepTotal"
        :total-steps="surveyStepTotal"
        :enable-next-button="true"
        :show-next-button="true"
        :show-loading-button="false"
        :show-stepper="showSurveyStepper"
      >
        <template #header>
          <InfoHeader
            :title="headerTitle"
            :description="headerDescription"
            icon-name="mdi-clipboard-check-outline"
          />
        </template>

        <template #body>
          <div class="survey-card">
            <q-list bordered separator class="survey-question-list">
              <q-item
                v-for="entry in surveyQuestionEntries"
                :key="entry.question.questionSlugId"
                class="survey-question-item"
              >
                <q-item-section class="survey-question-item__section">
                  <q-item-label class="survey-question-item__question">
                    {{ entry.question.questionText }}
                  </q-item-label>
                  <div class="survey-question-item__review-row">
                    <q-item-label
                      :caption="entry.isStatusFallback"
                      class="survey-question-item__answer"
                      :class="{
                        'survey-question-item__answer--status':
                          entry.isStatusFallback,
                      }"
                    >
                      {{ entry.answerPreview }}
                    </q-item-label>

                    <q-btn
                      flat
                      no-caps
                      color="primary"
                      class="survey-question-item__edit-button"
                      :label="t('editAnswerLabel')"
                      @click="handleEditQuestion({ question: entry.question })"
                    />
                  </div>
                </q-item-section>
              </q-item>
            </q-list>

            <div class="survey-card__actions">
              <q-btn
                v-if="canWithdraw"
                flat
                no-caps
                color="negative"
                :label="t('withdrawResponseLabel')"
                :loading="isWithdrawing"
                @click="handleOpenWithdrawDialog"
              />
            </div>
          </div>
        </template>
      </StepperLayout>

      <ZKConfirmDialog
        v-model="showWithdrawDialog"
        :message="t('confirmWithdrawMessage')"
        :confirm-text="t('confirmWithdrawButtonLabel')"
        :cancel-text="t('withdrawDialogCancelLabel')"
        variant="destructive"
        @confirm="handleWithdraw"
      />
    </template>
  </OnboardingLayout>
</template>

<script setup lang="ts">
import ConversationSurveyHero from "src/components/onboarding/backgrounds/ConversationSurveyHero.vue";
import DefaultImageExample from "src/components/onboarding/backgrounds/DefaultImageExample.vue";
import StepperLayout from "src/components/onboarding/layouts/StepperLayout.vue";
import InfoHeader from "src/components/onboarding/ui/InfoHeader.vue";
import ErrorRetryBlock from "src/components/ui/ErrorRetryBlock.vue";
import PageLoadingSpinner from "src/components/ui/PageLoadingSpinner.vue";
import ZKConfirmDialog from "src/components/ui-library/ZKConfirmDialog.vue";
import { useConversationSurveyState } from "src/composables/conversation/useConversationSurveyState";
import { useSurveyNavigation } from "src/composables/conversation/useSurveyNavigation";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import OnboardingLayout from "src/layouts/OnboardingLayout.vue";
import { htmlToCountedText } from "src/shared/shared";
import type {
  ParticipationBlockedReason,
  SurveyQuestionFormItem,
} from "src/shared/types/zod";
import { useConversationOnboardingStore } from "src/stores/conversationOnboarding";
import { useSurveyWithdrawMutation } from "src/utils/api/survey/useSurveyQueries";
import { useGoBackButtonHandler } from "src/utils/nav/goBackButton";
import { getSingleRouteParam } from "src/utils/router/params";
import {
  getConversationPath,
  getConversationSurveyContinuePath,
  getConversationSurveyOnboardingPath,
  getConversationSurveyQuestionPath,
} from "src/utils/survey/navigation";
import { useNotify } from "src/utils/ui/notify";
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  type ConversationSurveySummaryTranslations,
  conversationSurveySummaryTranslations,
} from "./summary.i18n";

const router = useRouter();
const route = useRoute();
const conversationOnboardingStore = useConversationOnboardingStore();
const { safeNavigateBack } = useGoBackButtonHandler();
const { showNotifyMessage } = useNotify();
const { navigateToNextSurveyStep, navigateToSurveyRoot } =
  useSurveyNavigation();
const { t } = useComponentI18n<ConversationSurveySummaryTranslations>(
  conversationSurveySummaryTranslations
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

const withdrawMutation = useSurveyWithdrawMutation({ conversationSlugId });
const showWithdrawDialog = ref(false);

const headerTitle = computed(() => {
  if (surveyStatus.value?.surveyGate.canParticipate) {
    return t("reviewAnswersTitle");
  }

  return t("continueSurveyTitle");
});

const headerDescription = computed(() => {
  if (surveyStatus.value?.surveyGate.canParticipate) {
    return t("summaryDescriptionComplete");
  }

  return t("summaryDescriptionPending");
});

const canWithdraw = computed(() => {
  return (
    surveyForm.value?.questions.some((question) => {
      return question.currentAnswer !== undefined || question.isPassed;
    }) ?? false
  );
});

const surveyStepTotal = computed(() => {
  const questionCount = surveyForm.value?.questions.length ?? 0;

  return questionCount > 0 ? questionCount + 3 : 2;
});

const showSurveyStepper = computed(() => {
  return (surveyForm.value?.questions.length ?? 0) > 0;
});

const isWithdrawing = computed(() => withdrawMutation.isPending.value);

const surveyQuestionEntries = computed(() => {
  return (surveyForm.value?.questions ?? []).map((question) => {
    const answerPreview = getQuestionAnswerPreview({ question });

    return {
      question,
      answerPreview: answerPreview ?? getQuestionStatusLabel({ question }),
      isStatusFallback: answerPreview === undefined,
    };
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
  [isInitialLoading, surveyForm, surveyStatus],
  ([loading, formData, statusData]) => {
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

    if (statusData.surveyGate.status === "not_started") {
      void router.replace({
        path: getConversationSurveyOnboardingPath({
          conversationSlugId: conversationSlugId.value,
        }),
      });
    }
  },
  { immediate: true }
);

function getQuestionStatusLabel({
  question,
}: {
  question: SurveyQuestionFormItem;
}): string {
  if (question.isPassed) {
    return t("questionStatusPassed");
  }
  if (question.isCurrentAnswerValid) {
    return t("questionStatusSaved");
  }
  if (question.isStale) {
    return t("questionStatusNeedsUpdate");
  }
  if (question.isMissingRequired) {
    return t("questionStatusRequiredMissing");
  }

  return t("questionStatusNotAnswered");
}

function getQuestionAnswerPreview({
  question,
}: {
  question: SurveyQuestionFormItem;
}): string | undefined {
  const currentAnswer = question.currentAnswer;

  if (currentAnswer === undefined) {
    return undefined;
  }

  switch (currentAnswer.questionType) {
    case "free_text": {
      const plainText = htmlToCountedText(currentAnswer.textValueHtml)
        .replace(/\s*\n\s*/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      return plainText.length > 0 ? plainText : undefined;
    }
    case "mono_choice":
    case "select":
    case "multi_choice": {
      const optionTextBySlugId = new Map(
        (question.options ?? []).map((option) => [
          option.optionSlugId,
          option.optionText,
        ])
      );
      const selectedOptionTexts = currentAnswer.optionSlugIds
        .map((optionSlugId) => optionTextBySlugId.get(optionSlugId))
        .filter((optionText): optionText is string => optionText !== undefined);

      return selectedOptionTexts.length > 0
        ? selectedOptionTexts.join(", ")
        : undefined;
    }
  }
}

const lastAnsweredQuestionSlugId = computed(() => {
  const questions = surveyForm.value?.questions;

  if (questions === undefined) {
    return undefined;
  }

  const lastAnsweredQuestion = [...questions].reverse().find((question) => {
    return question.currentAnswer !== undefined;
  });

  return (
    lastAnsweredQuestion?.questionSlugId ?? questions.at(-1)?.questionSlugId
  );
});

function getContinuePath(): string | undefined {
  const statusData = surveyStatus.value;
  const formData = surveyForm.value;

  if (statusData === undefined || formData === undefined) {
    return undefined;
  }

  return getConversationSurveyContinuePath({
    conversationSlugId: conversationSlugId.value,
    routeResolution: statusData.routeResolution,
    firstQuestionSlugId: formData.questions[0]?.questionSlugId,
  });
}

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
      await handleBackToConversation();
      break;
  }
}

async function handleEditQuestion({
  question,
}: {
  question: SurveyQuestionFormItem;
}): Promise<void> {
  if (question.questionSlugId === undefined) {
    return;
  }

  await router.push({
    path: getConversationSurveyQuestionPath({
      conversationSlugId: conversationSlugId.value,
      questionSlugId: question.questionSlugId,
    }),
  });
}

async function handlePrimaryAction(): Promise<void> {
  const gate = surveyStatus.value?.surveyGate;

  if (gate !== undefined && !gate.canParticipate) {
    const nextPath = getContinuePath();
    if (nextPath !== undefined) {
      await router.push({ path: nextPath });
    }
    return;
  }

  await handleBackToConversation();
}

async function handleWithdraw(): Promise<void> {
  try {
    const response = await withdrawMutation.mutateAsync();

    if (!response.success) {
      await handleBlockedReason(response.reason);
      return;
    }

    await refetchAll();
    await router.replace({
      path: getConversationSurveyOnboardingPath({
        conversationSlugId: conversationSlugId.value,
      }),
    });
  } catch {
    showNotifyMessage(t("failedToWithdrawMessage"));
  }
}

function handleOpenWithdrawDialog(): void {
  showWithdrawDialog.value = true;
}

async function handleBackToConversation(): Promise<void> {
  const conversationSlugIdValue = conversationSlugId.value;

  conversationOnboardingStore.clearForConversation({
    conversationSlugId: conversationSlugIdValue,
  });
  await router.push({
    path: getConversationPath({ conversationSlugId: conversationSlugIdValue }),
  });
}

async function handleBackToLastAnsweredQuestion(): Promise<void> {
  const questionSlugId = lastAnsweredQuestionSlugId.value;

  const fallbackPath =
    questionSlugId === undefined
      ? getConversationPath({ conversationSlugId: conversationSlugId.value })
      : getConversationSurveyQuestionPath({
          conversationSlugId: conversationSlugId.value,
          questionSlugId,
        });

  await safeNavigateBack({
    path: fallbackPath,
  });
}
</script>

<style scoped lang="scss">
.survey-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.survey-question-list {
  border-radius: 12px;
}

.survey-question-item {
  align-items: flex-start;
}

.survey-question-item__section {
  gap: 0.5rem;
  width: 100%;
}

.survey-question-item__question {
  white-space: normal;
  line-height: 1.4;
}

.survey-question-item__review-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.75rem;
}

.survey-question-item__answer {
  white-space: normal;
  color: rgba(0, 0, 0, 0.76);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.survey-question-item__answer--status {
  color: rgba(0, 0, 0, 0.56);
}

.survey-question-item__edit-button {
  align-self: center;
}

@media (max-width: 420px) {
  .survey-question-item__review-row {
    grid-template-columns: minmax(0, 1fr);
  }

  .survey-question-item__edit-button {
    justify-self: end;
  }
}

.survey-card__actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
</style>
