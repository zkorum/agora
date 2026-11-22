<template>
  <ConversationOnboardingLayout
    :sheet="sheet"
    :back-callback="handleBackToLastAnsweredQuestion"
    :close-callback="handleBackToConversation"
  >
    <PageLoadingSpinner
      v-if="
        isInitialLoading ||
        (surveyForm === undefined && isRefreshingSurvey) ||
        surveyStatus?.surveyGate.hasSurvey === false
      "
    />

    <ErrorRetryBlock
      v-else-if="hasLoadError"
      :title="t('failedToLoadSurveyTitle')"
      :retry-label="t('tryAgainLabel')"
      @retry="refetchAll"
    />

    <StepperLayout
      v-else-if="surveyForm !== undefined && surveyStatus !== undefined"
      :fixed-navigation="true"
      :submit-call-back="handlePrimaryAction"
      :current-step="1"
      :total-steps="1"
      :enable-next-button="true"
      :show-next-button="true"
      :show-loading-button="false"
      :show-stepper="false"
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
            <SurveyAnswerReviewItem
              v-for="question in surveyForm.questions"
              :key="question.questionSlugId"
              :conversation-slug-id="conversationSlugId"
              :question="question"
              :source-language-code="conversationSourceLanguageCode"
              :status-label="getQuestionStatusLabel({ question })"
              :edit-label="t('editAnswerLabel')"
              @edit="handleEditQuestion({ question })"
            />
          </q-list>

          <div class="survey-card__actions">
            <q-btn
              v-if="withdrawalMessageKey"
              flat
              no-caps
              color="negative"
              :label="t('withdrawResponseLabel')"
              :loading="isWithdrawing"
              @click="showWithdrawDialog = true"
            />
          </div>
        </div>
      </template>
    </StepperLayout>

    <ZKConfirmDialog
      v-if="withdrawalMessageKey"
      v-model="showWithdrawDialog"
      :message="t(withdrawalMessageKey)"
      :actions="{
        cancel: {
          label: t('withdrawDialogCancelLabel'),
          appearance: 'secondary-outlined',
        },
        confirm: {
          label: t('withdrawResponseLabel'),
          appearance: 'danger',
        },
      }"
      @confirm="handleWithdraw"
    />
  </ConversationOnboardingLayout>
</template>

<script setup lang="ts">
import { useQueryClient } from "@tanstack/vue-query";
import StepperLayout from "src/components/onboarding/layouts/StepperLayout.vue";
import InfoHeader from "src/components/onboarding/ui/InfoHeader.vue";
import SurveyAnswerReviewItem from "src/components/survey/SurveyAnswerReviewItem.vue";
import ErrorRetryBlock from "src/components/ui/ErrorRetryBlock.vue";
import PageLoadingSpinner from "src/components/ui/PageLoadingSpinner.vue";
import ZKConfirmDialog from "src/components/ui-library/ZKConfirmDialog.vue";
import { useConversationOnboardingExit } from "src/composables/conversation/useConversationOnboardingExit";
import { useConversationOnboardingRoute } from "src/composables/conversation/useConversationOnboardingRoute";
import { useConversationSurveyState } from "src/composables/conversation/useConversationSurveyState";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import ConversationOnboardingLayout from "src/layouts/ConversationOnboardingLayout.vue";
import type { ConversationParticipationRejection } from "src/shared/types/dto";
import type { SurveyQuestionFormItem } from "src/shared/types/zod";
import { useSurveyWithdrawMutation } from "src/utils/api/survey/useSurveyQueries";
import { useGoBackButtonHandler } from "src/utils/nav/goBackButton";
import { useViewerQueryScope } from "src/utils/query/viewerScope";
import {
  getConversationOnboardingStepPath,
  getConversationPath,
  getConversationSurveyContinuePath,
  getConversationSurveyOnboardingPath,
  getConversationSurveyQuestionPath,
} from "src/utils/survey/navigation";
import { getConversationLanguageSettingSourceLanguageCode } from "src/utils/translation/contentTranslation";
import type { DismissalController } from "src/utils/ui/dismissalController";
import { useNotify } from "src/utils/ui/notify";
import { computed, onDeactivated, ref, watch } from "vue";
import { useRouter } from "vue-router";

import {
  type ConversationSurveySummaryTranslations,
  conversationSurveySummaryTranslations,
} from "./summary.i18n";

defineProps<{ sheet: DismissalController }>();
const router = useRouter();
const queryClient = useQueryClient();
const { routeConversationSlugId, routeContext } =
  useConversationOnboardingRoute();
const { safeNavigateBack } = useGoBackButtonHandler();
const { showNotifyMessage } = useNotify();
const { exitToConversation } = useConversationOnboardingExit();
const { t } = useComponentI18n<ConversationSurveySummaryTranslations>(
  conversationSurveySummaryTranslations
);

const {
  conversationData,
  conversationSlugId,
  surveyStatus,
  surveyForm,
  isInitialLoading,
  isRefreshingSurvey,
  hasLoadError,
  refetchAll,
} = useConversationSurveyState({
  conversationSlugId: routeConversationSlugId,
});

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

const isWithdrawing = computed(() => withdrawMutation.isPending.value);
const withdrawalMessageKey = computed(() => {
  const form = surveyForm.value;
  if (!form?.questions.some((q) => q.currentAnswer !== undefined || q.isPassed))
    return undefined;
  return !form.surveyGate.isOptional && form.questions.some((q) => q.isRequired)
    ? "confirmRequiredWithdrawMessage"
    : "confirmWithdrawMessage";
});

const viewer = useViewerQueryScope();
function dismissWithdrawal() {
  showWithdrawDialog.value = false;
}
watch(
  [
    () => viewer.value.userId,
    conversationSlugId,
    () => surveyForm.value?.surveyConfigId,
    () => surveyForm.value?.currentRevision,
    withdrawalMessageKey,
  ],
  dismissWithdrawal,
  { flush: "sync" }
);
onDeactivated(dismissWithdrawal);

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

watch(
  [isInitialLoading, surveyForm, surveyStatus, isRefreshingSurvey],
  ([loading, formData, statusData, refreshing]) => {
    if (loading || refreshing || statusData === undefined) {
      return;
    }
    if (!statusData.surveyGate.hasSurvey) {
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

    if (statusData.surveyGate.status === "not_started") {
      void router.replace({
        path: getConversationSurveyOnboardingPath({
          conversationSlugId: conversationSlugId.value,
          routeContext: routeContext.value,
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
    routeContext: routeContext.value,
  });
}

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
    await handleBackToConversation();
  }
}

async function handleEditQuestion({
  question,
}: {
  question: SurveyQuestionFormItem;
}): Promise<void> {
  await router.push({
    path: getConversationSurveyQuestionPath({
      conversationSlugId: conversationSlugId.value,
      questionSlugId: question.questionSlugId,
      routeContext: routeContext.value,
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
  const form = surveyForm.value;
  if (
    !showWithdrawDialog.value ||
    form === undefined ||
    !withdrawalMessageKey.value ||
    isWithdrawing.value
  )
    return;
  dismissWithdrawal();
  let response: Awaited<ReturnType<typeof withdrawMutation.mutateAsync>>;
  try {
    response = await withdrawMutation.mutateAsync({
      surveyConfigId: form.surveyConfigId,
      currentRevision: form.currentRevision,
    });
  } catch {
    showNotifyMessage(t("failedToWithdrawMessage"));
    await refetchAll();
    return;
  }
  if (response === undefined) return;
  if (!response.success) {
    await handleBlockedReason(response);
    return;
  }
  await router.replace({
    path: getConversationSurveyOnboardingPath({
      conversationSlugId: conversationSlugId.value,
      routeContext: routeContext.value,
    }),
  });
}

async function handleBackToConversation(): Promise<void> {
  const conversationSlugIdValue = conversationSlugId.value;

  await exitToConversation({
    conversationSlugId: conversationSlugIdValue,
    routeContext: routeContext.value,
  });
}

async function handleBackToLastAnsweredQuestion(): Promise<void> {
  const questionSlugId = lastAnsweredQuestionSlugId.value;

  const fallbackPath =
    questionSlugId === undefined
      ? getConversationPath({
          conversationSlugId: conversationSlugId.value,
          routeContext: routeContext.value,
        })
      : getConversationSurveyQuestionPath({
          conversationSlugId: conversationSlugId.value,
          questionSlugId,
          routeContext: routeContext.value,
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

.survey-card__actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
</style>
