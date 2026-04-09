<template>
  <OnboardingLayout
    :back-callback="handleBackToAuthChoice"
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
      <WidthWrapper :enable="true">
        <StepperLayout
          :submit-call-back="() => {}"
          :current-step="2"
          :total-steps="surveyStepTotal"
          :enable-next-button="true"
          :show-next-button="false"
          :show-loading-button="false"
        >
          <template #header>
            <InfoHeader
              :title="t('title')"
              :description="t('description')"
              icon-name="mdi-wallet"
            />
          </template>

          <template #body>
            <RarimoVerificationForm />

            <div class="alternativeLogins">
              <ZKButton
                button-type="largeButton"
                :label="t('preferPhoneVerification')"
                text-color="primary"
                @click="goToPhoneVerification()"
              />
            </div>
          </template>
        </StepperLayout>
      </WidthWrapper>
    </template>
  </OnboardingLayout>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import WidthWrapper from "src/components/navigation/WidthWrapper.vue";
import ConversationSurveyHero from "src/components/onboarding/backgrounds/ConversationSurveyHero.vue";
import DefaultImageExample from "src/components/onboarding/backgrounds/DefaultImageExample.vue";
import StepperLayout from "src/components/onboarding/layouts/StepperLayout.vue";
import InfoHeader from "src/components/onboarding/ui/InfoHeader.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import RarimoVerificationForm from "src/components/verification/RarimoVerificationForm.vue";
import { useConversationSurveyState } from "src/composables/conversation/useConversationSurveyState";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useVerificationComplete } from "src/composables/verification/useVerificationComplete";
import OnboardingLayout from "src/layouts/OnboardingLayout.vue";
import {
  type VerifyPassportTranslations,
  verifyPassportTranslations,
} from "src/pages/verify/passport/index.i18n";
import { useAuthenticationStore } from "src/stores/authentication";
import { useConversationOnboardingStore } from "src/stores/conversationOnboarding";
import { onboardingFlowStore } from "src/stores/onboarding/flow";
import { useGoBackButtonHandler } from "src/utils/nav/goBackButton";
import { getSingleRouteParam } from "src/utils/router/params";
import {
  getConversationPath,
  getConversationSurveyOnboardingPath,
  getConversationSurveyVerifyHardPath,
  getConversationSurveyVerifyIdentityPath,
  getConversationSurveyVerifyPath,
} from "src/utils/survey/navigation";
import { useNotify } from "src/utils/ui/notify";
import { computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

const { t } = useComponentI18n<VerifyPassportTranslations>(
  verifyPassportTranslations
);

const router = useRouter();
const route = useRoute();
const conversationOnboardingStore = useConversationOnboardingStore();
const { isAuthInitialized, credentials } = storeToRefs(
  useAuthenticationStore()
);
const { safeNavigateBack } = useGoBackButtonHandler();
const { credentialUpgradeTarget } = storeToRefs(onboardingFlowStore());
const { completeVerification } = useVerificationComplete();
const { showNotifyMessage } = useNotify();

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
  requirementState,
  isInitialLoading,
} = useConversationSurveyState({ conversationSlugId: routeConversationSlugId });

const surveyStepTotal = computed(() => {
  const questionCount = surveyForm.value?.questions.length ?? 0;

  return questionCount > 0 ? questionCount + 3 : 2;
});

const backPath = computed(() => {
  if (
    credentialUpgradeTarget.value === "strong" ||
    conversationData.value?.metadata.participationMode === "strong_verification"
  ) {
    return getConversationSurveyVerifyIdentityPath({
      conversationSlugId: conversationSlugId.value,
    });
  }

  if (
    credentialUpgradeTarget.value === "hard" ||
    conversationData.value?.metadata.participationMode === "account_required"
  ) {
    return getConversationSurveyVerifyHardPath({
      conversationSlugId: conversationSlugId.value,
    });
  }

  return getConversationSurveyOnboardingPath({
    conversationSlugId: conversationSlugId.value,
  });
});

watch(
  [isInitialLoading, requirementState],
  ([loading, requirements]) => {
    if (!loading && !requirements.needsAuth) {
      void router.replace({
        path: getConversationSurveyVerifyPath({
          conversationSlugId: conversationSlugId.value,
        }),
      });
    }
  },
  { immediate: true, deep: true }
);

onMounted(() => {
  checkExistingCredential();
});

watch(isAuthInitialized, () => {
  checkExistingCredential();
});

function checkExistingCredential() {
  if (!isAuthInitialized.value) {
    return;
  }

  if (credentials.value.rarimo !== null) {
    showNotifyMessage(t("alreadyHasPassport"));
    void completeVerification();
  }
}

async function handleBackToAuthChoice(): Promise<void> {
  await safeNavigateBack({ path: backPath.value });
}

async function goToPhoneVerification() {
  await router.replace({
    name: "/conversation/[postSlugId].onboarding/verify/phone",
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
.alternativeLogins {
  display: flex;
  flex-direction: column;
}
</style>
