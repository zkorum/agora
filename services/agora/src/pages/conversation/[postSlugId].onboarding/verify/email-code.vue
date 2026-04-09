<template>
  <OnboardingLayout
    :back-callback="changeEmail"
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
      <form class="formStyle" @submit.prevent="onSubmit">
        <StepperLayout
          :submit-call-back="onSubmit"
          :current-step="2.5"
          :total-steps="surveyStepTotal"
          :enable-next-button="emailOtpFormRef?.isCodeComplete?.() ?? false"
          :show-next-button="true"
          :show-loading-button="
            emailOtpFormRef?.isSubmitButtonLoading?.value ?? false
          "
        >
          <template #header>
            <InfoHeader
              :title="t('title')"
              description=""
              icon-name="mdi-email"
            />
          </template>

          <template #body>
            <EmailOtpForm
              ref="emailOtpFormRef"
              @change-identifier="changeEmail"
            />
          </template>
        </StepperLayout>
      </form>
    </template>
  </OnboardingLayout>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import ConversationSurveyHero from "src/components/onboarding/backgrounds/ConversationSurveyHero.vue";
import DefaultImageExample from "src/components/onboarding/backgrounds/DefaultImageExample.vue";
import StepperLayout from "src/components/onboarding/layouts/StepperLayout.vue";
import InfoHeader from "src/components/onboarding/ui/InfoHeader.vue";
import EmailOtpForm from "src/components/verification/EmailOtpForm.vue";
import { useConversationSurveyState } from "src/composables/conversation/useConversationSurveyState";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import OnboardingLayout from "src/layouts/OnboardingLayout.vue";
import {
  type VerifyEmailCodeTranslations,
  verifyEmailCodeTranslations,
} from "src/pages/verify/email-code/index.i18n";
import { useConversationOnboardingStore } from "src/stores/conversationOnboarding";
import { onboardingFlowStore } from "src/stores/onboarding/flow";
import { getSingleRouteParam } from "src/utils/router/params";
import { getConversationPath } from "src/utils/survey/navigation";
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

const { t } = useComponentI18n<VerifyEmailCodeTranslations>(
  verifyEmailCodeTranslations
);

const router = useRouter();
const route = useRoute();
const conversationOnboardingStore = useConversationOnboardingStore();
const { credentialUpgradeTarget } = storeToRefs(onboardingFlowStore());

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

const { conversationSlugId, conversationData, surveyForm } =
  useConversationSurveyState({ conversationSlugId: routeConversationSlugId });

const surveyStepTotal = computed(() => {
  const questionCount = surveyForm.value?.questions.length ?? 0;

  return questionCount > 0 ? questionCount + 3 : 2;
});

const emailOtpFormRef = ref<{
  nextButtonClicked: () => void;
  isSubmitButtonLoading: { value: boolean };
  isCodeComplete: () => boolean;
} | null>(null);

function onSubmit() {
  emailOtpFormRef.value?.nextButtonClicked();
}

async function changeEmail() {
  await router.replace({
    name: "/conversation/[postSlugId].onboarding/verify/email",
    params: { postSlugId: conversationSlugId.value },
  });
}

async function handleBackToConversation(): Promise<void> {
  credentialUpgradeTarget.value = null;
  conversationOnboardingStore.clearForConversation({
    conversationSlugId: conversationSlugId.value,
  });
  await router.push({
    path: getConversationPath({ conversationSlugId: conversationSlugId.value }),
  });
}
</script>

<style scoped lang="scss">
.formStyle {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
