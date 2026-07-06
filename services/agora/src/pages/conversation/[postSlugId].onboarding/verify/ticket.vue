<template>
  <OnboardingLayout
    :back-callback="handleBackToWelcome"
    :close-callback="handleBackToConversation"
    :show-close-button="true"
  >
    <template #body>
      <ConversationSurveyOnboardingHero
        :conversation-data="conversationData"
        :initial-display-content="conversationDisplayContent"
      />
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
        v-else
        :submit-call-back="handlePrimaryAction"
        :current-step="2"
        :total-steps="surveyStepTotal"
        :enable-next-button="true"
        :show-next-button="true"
        :show-loading-button="isActing"
      >
        <template #header>
          <InfoHeader
            :title="t('verifyTicketTitle')"
            :description="t('verifyTicketDescription')"
            icon-name="mdi-ticket-confirmation-outline"
          />
        </template>

        <template #body>
          <q-btn
            flat
            no-caps
            color="primary"
            class="ticket-card__secondary-action"
            :label="t('backToConversationLabel')"
            @click="handleBackToConversation"
          />
        </template>
      </StepperLayout>
    </template>
  </OnboardingLayout>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import ConversationSurveyOnboardingHero from "src/components/onboarding/backgrounds/ConversationSurveyOnboardingHero.vue";
import StepperLayout from "src/components/onboarding/layouts/StepperLayout.vue";
import InfoHeader from "src/components/onboarding/ui/InfoHeader.vue";
import ErrorRetryBlock from "src/components/ui/ErrorRetryBlock.vue";
import PageLoadingSpinner from "src/components/ui/PageLoadingSpinner.vue";
import { useConversationOnboardingExit } from "src/composables/conversation/useConversationOnboardingExit";
import { useConversationOnboardingRoute } from "src/composables/conversation/useConversationOnboardingRoute";
import { useConversationSurveyState } from "src/composables/conversation/useConversationSurveyState";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useTicketVerificationFlow } from "src/composables/zupass/useTicketVerificationFlow";
import OnboardingLayout from "src/layouts/OnboardingLayout.vue";
import { useConversationOnboardingStore } from "src/stores/conversationOnboarding";
import { onboardingFlowStore } from "src/stores/onboarding/flow";
import { useGoBackButtonHandler } from "src/utils/nav/goBackButton";
import {
  getConversationSurveyOnboardingPath,
  getConversationSurveyVerifyPath,
} from "src/utils/survey/navigation";
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";

import {
  type ConversationSurveyOnboardingTranslations,
  conversationSurveyOnboardingTranslations,
} from "../index.i18n";

const router = useRouter();
const { routeConversationSlugId, routeContext } = useConversationOnboardingRoute();
const conversationOnboardingStore = useConversationOnboardingStore();
const { credentialUpgradeTarget } = storeToRefs(onboardingFlowStore());
const { safeNavigateBack } = useGoBackButtonHandler();
const { verifyTicket } = useTicketVerificationFlow();
const { exitToConversation } = useConversationOnboardingExit();
const { t } = useComponentI18n<ConversationSurveyOnboardingTranslations>(
  conversationSurveyOnboardingTranslations
);

if (
  conversationOnboardingStore.conversationSlugId !==
  routeConversationSlugId.value
) {
  conversationOnboardingStore.startManualEntry({
    conversationSlugId: routeConversationSlugId.value,
    routeContext: routeContext.value,
  });
}

const {
  conversationSlugId,
  conversationData,
  conversationDisplayContent,
  surveyForm,
  requirementState,
  isInitialLoading,
  hasLoadError,
  refetchAll,
} = useConversationSurveyState({ conversationSlugId: routeConversationSlugId });

const isActing = ref(false);

const surveyStepTotal = computed(() => {
  const questionCount = surveyForm.value?.questions.length ?? 0;

  return questionCount > 0 ? questionCount + 3 : 2;
});

watch(
  [isInitialLoading, requirementState],
  ([loading, requirements]) => {
    if (!loading && (requirements.needsAuth || !requirements.needsTicket)) {
      credentialUpgradeTarget.value = null;
      void router.replace({
        path: getConversationSurveyVerifyPath({
          conversationSlugId: conversationSlugId.value,
          routeContext: routeContext.value,
        }),
      });
    }
  },
  { immediate: true, deep: true }
);

async function handleBackToWelcome(): Promise<void> {
  await safeNavigateBack({
    path: getConversationSurveyOnboardingPath({
      conversationSlugId: conversationSlugId.value,
      routeContext: routeContext.value,
    }),
  });
}

async function handleBackToConversation(): Promise<void> {
  credentialUpgradeTarget.value = null;
  await exitToConversation({
    conversationSlugId: conversationSlugId.value,
    routeContext: routeContext.value,
  });
}

async function handlePrimaryAction(): Promise<void> {
  const conversation = conversationData.value;
  const eventSlug = conversation?.metadata.requiresEventTicket;

  if (conversation === undefined || eventSlug === undefined) {
    await router.replace({
      path: getConversationSurveyVerifyPath({
        conversationSlugId: conversationSlugId.value,
        routeContext: routeContext.value,
      }),
    });
    return;
  }

  isActing.value = true;

  try {
    const verificationResult = await verifyTicket({ eventSlug });
    if (!verificationResult.success) {
      return;
    }

    credentialUpgradeTarget.value = null;
    await refetchAll();
    await router.replace({
      path: getConversationSurveyVerifyPath({
        conversationSlugId: conversationSlugId.value,
        routeContext: routeContext.value,
      }),
    });
  } finally {
    isActing.value = false;
  }
}
</script>

<style scoped lang="scss">
.ticket-card__secondary-action {
  align-self: flex-start;
}
</style>
