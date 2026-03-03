import { useLoginIntentionStore } from "src/stores/loginIntention";
import { onboardingFlowStore } from "src/stores/onboarding/flow";
import { useBackendAuthApi } from "src/utils/api/auth";
import { useRouter } from "vue-router";

export function useVerificationComplete() {
  const router = useRouter();
  const { updateAuthState, getDeviceLoginStatus } = useBackendAuthApi();
  const { onboardingMode } = onboardingFlowStore();
  const { routeUserAfterLogin } = useLoginIntentionStore();

  async function completeVerification() {
    const freshStatus = await getDeviceLoginStatus();
    await updateAuthState({
      partialLoginStatus: freshStatus,
      forceRefresh: true,
    });
    if (onboardingMode == "LOGIN") {
      await routeUserAfterLogin();
    } else {
      await router.push({ name: "/onboarding/step4-username/" });
    }
  }

  return { completeVerification };
}
