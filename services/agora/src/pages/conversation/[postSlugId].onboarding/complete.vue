<template>
  <OnboardingLayout
    :back-callback="handleBackToConversation"
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
      <StepperLayout
        :submit-call-back="handleBackToConversation"
        :current-step="1"
        :total-steps="1"
        :enable-next-button="true"
        :show-next-button="true"
        :show-loading-button="false"
        :show-stepper="false"
      >
        <template #header>
          <InfoHeader
            :title="t('title')"
            :description="t('description')"
            icon-name="mdi-check-circle-outline"
          />
        </template>

        <template #body>
          <q-btn
            flat
            no-caps
            color="primary"
            class="complete-card__secondary-action"
            :label="t('reviewAnswersLabel')"
            @click="handleReviewAnswers"
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
import { useConversationOnboardingExit } from "src/composables/conversation/useConversationOnboardingExit";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import OnboardingLayout from "src/layouts/OnboardingLayout.vue";
import { useAuthenticationStore } from "src/stores/authentication";
import { useConversationQuery } from "src/utils/api/post/useConversationQuery";
import { getSingleRouteParam } from "src/utils/router/params";
import { getConversationSurveySummaryPath } from "src/utils/survey/navigation";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  type ConversationSurveyCompleteTranslations,
  conversationSurveyCompleteTranslations,
} from "./complete.i18n";

const { t } = useComponentI18n<ConversationSurveyCompleteTranslations>(
  conversationSurveyCompleteTranslations
);
const router = useRouter();
const route = useRoute();
const { exitToConversation } = useConversationOnboardingExit();
const { isAuthInitialized } = storeToRefs(useAuthenticationStore());

const conversationSlugId = computed(() => {
  return getSingleRouteParam(route.params.postSlugId);
});

const conversationQuery = useConversationQuery({
  conversationSlugId,
  enabled: computed(() => isAuthInitialized.value),
});

const conversationData = computed(() => conversationQuery.data.value);

async function handleBackToConversation(): Promise<void> {
  await exitToConversation({
    conversationSlugId: conversationSlugId.value,
  });
}

async function handleReviewAnswers(): Promise<void> {
  await router.replace({
    path: getConversationSurveySummaryPath({
      conversationSlugId: conversationSlugId.value,
    }),
  });
}
</script>

<style scoped lang="scss">
.complete-card__secondary-action {
  align-self: flex-start;
}
</style>
