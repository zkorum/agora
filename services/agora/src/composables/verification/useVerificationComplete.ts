import { useConversationOnboardingStore } from "src/stores/conversationOnboarding";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import { emailVerificationStore } from "src/stores/onboarding/email";
import { onboardingFlowStore } from "src/stores/onboarding/flow";
import { phoneVerificationStore } from "src/stores/onboarding/phone";
import { useBackendAuthApi } from "src/utils/api/auth";
import { getConversationSurveyVerifyPath } from "src/utils/survey/navigation";
import { useRouter } from "vue-router";

export function useVerificationComplete() {
  const router = useRouter();
  const { updateAuthState, getDeviceLoginStatus } = useBackendAuthApi();
  const { onboardingMode } = onboardingFlowStore();
  const { routeUserAfterLogin } = useLoginIntentionStore();
  const conversationOnboardingStore = useConversationOnboardingStore();
  const { reset: resetEmailVerification } = emailVerificationStore();
  const { reset: resetPhoneVerification } = phoneVerificationStore();

  async function completeVerification() {
    const freshStatus = await getDeviceLoginStatus();
    await updateAuthState({
      partialLoginStatus: freshStatus,
      forceRefresh: true,
    });
    resetEmailVerification();
    resetPhoneVerification();

    if (onboardingMode == "LOGIN") {
      if (conversationOnboardingStore.conversationSlugId !== null) {
        await router.replace({
          path: getConversationSurveyVerifyPath({
            conversationSlugId: conversationOnboardingStore.conversationSlugId,
            routeContext: conversationOnboardingStore.routeContext,
          }),
        });
        return;
      }

      await routeUserAfterLogin();
    } else {
      await router.replace({ name: "/onboarding/step4-username/" });
    }
  }

  return { completeVerification };
}
