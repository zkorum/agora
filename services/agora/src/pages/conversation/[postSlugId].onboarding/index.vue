<template>
  <OnboardingLayout
    :back-callback="handleBackToPrevious"
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
        v-else
        :submit-call-back="handlePrimaryAction"
        :current-step="1"
        :total-steps="surveyStepTotal"
        :enable-next-button="true"
        :show-next-button="true"
        :show-loading-button="isActing"
      >
        <template #header>
          <InfoHeader
            :title="headerTitle"
            :description="headerDescription"
            icon-name="mdi-clipboard-text-outline"
          />
        </template>
      </StepperLayout>
    </template>
  </OnboardingLayout>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import ConversationSurveyHero from "src/components/onboarding/backgrounds/ConversationSurveyHero.vue";
import DefaultImageExample from "src/components/onboarding/backgrounds/DefaultImageExample.vue";
import StepperLayout from "src/components/onboarding/layouts/StepperLayout.vue";
import InfoHeader from "src/components/onboarding/ui/InfoHeader.vue";
import ErrorRetryBlock from "src/components/ui/ErrorRetryBlock.vue";
import PageLoadingSpinner from "src/components/ui/PageLoadingSpinner.vue";
import { useConversationSurveyState } from "src/composables/conversation/useConversationSurveyState";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import OnboardingLayout from "src/layouts/OnboardingLayout.vue";
import { useConversationOnboardingStore } from "src/stores/conversationOnboarding";
import { onboardingFlowStore } from "src/stores/onboarding/flow";
import { useGoBackButtonHandler } from "src/utils/nav/goBackButton";
import { getSingleRouteParam } from "src/utils/router/params";
import { getConversationPath } from "src/utils/survey/navigation";
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  type ConversationSurveyOnboardingTranslations,
  conversationSurveyOnboardingTranslations,
} from "./index.i18n";

const router = useRouter();
const route = useRoute();
const conversationOnboardingStore = useConversationOnboardingStore();
const { credentialUpgradeTarget } = storeToRefs(onboardingFlowStore());
const { safeNavigateBack } = useGoBackButtonHandler();
const { t } = useComponentI18n<ConversationSurveyOnboardingTranslations>(
  conversationSurveyOnboardingTranslations
);

const routeConversationSlugId = computed(() => {
  return getSingleRouteParam(route.params.postSlugId);
});

if (
  conversationOnboardingStore.conversationSlugId !==
  routeConversationSlugId.value
) {
  conversationOnboardingStore.startManualEntry({
    conversationSlugId: routeConversationSlugId.value,
  });
}

const {
  conversationSlugId,
  conversationData,
  surveyForm,
  isInitialLoading,
  hasLoadError,
  refetchAll,
} = useConversationSurveyState({ conversationSlugId: routeConversationSlugId });

const isActing = ref(false);

const surveyStepTotal = computed(() => {
  const questionCount = surveyForm.value?.questions.length ?? 0;

  return questionCount > 0 ? questionCount + 3 : 2;
});

const headerTitle = computed(() => {
  return t("welcomeTitle");
});

const headerDescription = computed(() => {
  return t("welcomeDescription");
});

watch(
  isInitialLoading,
  (loading) => {
    if (!loading && conversationOnboardingStore.justCompletedSurvey) {
      void router.replace({
        path: `/conversation/${conversationSlugId.value}/onboarding/complete`,
      });
    }
  },
  { immediate: true }
);

async function handleBackToConversation(): Promise<void> {
  credentialUpgradeTarget.value = null;
  conversationOnboardingStore.clearForConversation({
    conversationSlugId: conversationSlugId.value,
  });
  await router.push({
    path: getConversationPath({ conversationSlugId: conversationSlugId.value }),
  });
}

async function handleBackToPrevious(): Promise<void> {
  credentialUpgradeTarget.value = null;
  conversationOnboardingStore.clearForConversation({
    conversationSlugId: conversationSlugId.value,
  });
  await safeNavigateBack({
    path: getConversationPath({ conversationSlugId: conversationSlugId.value }),
  });
}

async function handlePrimaryAction(): Promise<void> {
  if (conversationData.value === undefined) {
    await handleBackToConversation();
    return;
  }

  isActing.value = true;

  try {
    await router.push({
      name: "/conversation/[postSlugId].onboarding/verify",
      params: { postSlugId: conversationSlugId.value },
    });
  } finally {
    isActing.value = false;
  }
}
</script>
