<template>
  <OnboardingLayout
    :back-callback="handleBackToConversation"
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
      <ConversationOnboardingCompleteStep
        v-model:conversation-updates-checked="conversationUpdatesChecked"
        :title="t('title')"
        :description="t('description')"
        :review-answers-label="t('reviewAnswersLabel')"
        :show-conversation-updates-preference="false"
        scope-kind="no-project"
        :is-saving="false"
        @continue="handleBackToConversation"
        @review-answers="handleReviewAnswers"
      />
    </template>
  </OnboardingLayout>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import ConversationSurveyOnboardingHero from "src/components/onboarding/backgrounds/ConversationSurveyOnboardingHero.vue";
import ConversationOnboardingCompleteStep from "src/components/onboarding/ConversationOnboardingCompleteStep.vue";
import { useConversationOnboardingExit } from "src/composables/conversation/useConversationOnboardingExit";
import { useConversationOnboardingRoute } from "src/composables/conversation/useConversationOnboardingRoute";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import OnboardingLayout from "src/layouts/OnboardingLayout.vue";
import { useAuthenticationStore } from "src/stores/authentication";
import { useConversationQuery } from "src/utils/api/post/useConversationQuery";
import { getConversationSurveySummaryPath } from "src/utils/survey/navigation";
import { computed, ref } from "vue";
import { useRouter } from "vue-router";

import {
  type ConversationSurveyCompleteTranslations,
  conversationSurveyCompleteTranslations,
} from "./complete.i18n";

const { t } = useComponentI18n<ConversationSurveyCompleteTranslations>(
  conversationSurveyCompleteTranslations
);
const router = useRouter();
const { exitToConversation } = useConversationOnboardingExit();
const { isAuthInitialized } = storeToRefs(useAuthenticationStore());
const { routeConversationSlugId: conversationSlugId, routeContext } =
  useConversationOnboardingRoute();

const conversationQuery = useConversationQuery({
  conversationSlugId,
  enabled: computed(() => isAuthInitialized.value),
});

const conversationData = computed(
  () => conversationQuery.data.value?.conversationData
);
const conversationDisplayContent = computed(
  () => conversationQuery.data.value?.displayContent
);
const conversationUpdatesChecked = ref(true);

async function handleBackToConversation(): Promise<void> {
  await exitToConversation({
    conversationSlugId: conversationSlugId.value,
    routeContext: routeContext.value,
  });
}

async function handleReviewAnswers(): Promise<void> {
  await router.replace({
    path: getConversationSurveySummaryPath({
      conversationSlugId: conversationSlugId.value,
      routeContext: routeContext.value,
    }),
  });
}
</script>
