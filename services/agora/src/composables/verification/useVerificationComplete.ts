import { useQueryClient } from "@tanstack/vue-query";
import type { ConversationParticipationStatus } from "src/shared/types/dto";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import { emailVerificationStore } from "src/stores/onboarding/email";
import { onboardingFlowStore } from "src/stores/onboarding/flow";
import { phoneVerificationStore } from "src/stores/onboarding/phone";
import { useBackendAuthApi } from "src/utils/api/auth";
import {
  getConversationRouteContextFromRoute,
  isConversationOnboardingRouteName,
} from "src/utils/router/conversationRouteContext";
import { getSingleRouteParam } from "src/utils/router/params";
import { getConversationSurveyVerifyPath } from "src/utils/survey/navigation";
import { computed, nextTick, ref } from "vue";
import {
  isNavigationFailure,
  type RouteLocationRaw,
  useRouter,
} from "vue-router";

export function useVerificationComplete() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { updateAuthState, getDeviceLoginStatus } = useBackendAuthApi();
  const flowStore = onboardingFlowStore();
  const { routeUserAfterLogin } = useLoginIntentionStore();
  const { reset: resetEmailVerification } = emailVerificationStore();
  const { reset: resetPhoneVerification } = phoneVerificationStore();
  const completionState = ref<"idle" | "pending" | "failed">("idle");
  const isCompletingVerification = computed(
    () => completionState.value === "pending"
  );
  const hasCompletionFailed = computed(
    () => completionState.value === "failed"
  );

  async function completeVerification() {
    if (isCompletingVerification.value) return;
    completionState.value = "pending";
    try {
      await finishVerification();
      completionState.value = "idle";
    } catch (error) {
      completionState.value = "failed";
      throw error;
    }
  }

  async function finishVerification() {
    const verificationRoute = router.currentRoute.value;
    const freshStatus = await getDeviceLoginStatus();
    await updateAuthState({
      partialLoginStatus: freshStatus,
      forceRefresh: true,
    });
    if (router.currentRoute.value !== verificationRoute) return;
    resetEmailVerification();
    resetPhoneVerification();
    if (
      verificationRoute.path === "/recover" ||
      verificationRoute.path === "/recover/"
    ) {
      await replaceVerificationRoute({ name: "/" });
      return;
    }

    // The route survives refresh and back/forward navigation; a leftover global
    // onboarding session must not redirect unrelated account verification.
    if (isConversationOnboardingRouteName(verificationRoute.name)) {
      const conversationSlugId = getSingleRouteParam(
        "postSlugId" in verificationRoute.params
          ? verificationRoute.params.postSlugId
          : undefined
      );
      // A provider can confirm an existing credential without changing the
      // cache-key flags. Discard old credential denials, not infer a ready state.
      await nextTick();
      const cached =
        queryClient.getQueriesData<ConversationParticipationStatus>({
          queryKey: ["participation-status", conversationSlugId],
          type: "active",
        });
      await Promise.all(
        cached.map(async ([queryKey, status]) => {
          if (
            status?.status === "onboarding_required" &&
            (status.nextStep.kind === "account" ||
              status.nextStep.kind === "email" ||
              status.nextStep.kind === "identity")
          )
            await queryClient.resetQueries({ queryKey, exact: true });
        })
      );
      if (router.currentRoute.value !== verificationRoute) return;
      await replaceVerificationRoute({
        path: getConversationSurveyVerifyPath({
          conversationSlugId,
          routeContext: getConversationRouteContextFromRoute(verificationRoute),
        }),
      });
      return;
    }

    if (flowStore.onboardingMode === "LOGIN") {
      await routeUserAfterLogin();
    } else {
      await replaceVerificationRoute({ name: "/onboarding/step4-username/" });
    }
  }

  async function replaceVerificationRoute(
    destination: RouteLocationRaw
  ): Promise<void> {
    const failure = await router.replace(destination);
    if (isNavigationFailure(failure)) {
      throw new Error("Verification navigation did not complete", {
        cause: failure,
      });
    }
  }

  return {
    completeVerification,
    isCompletingVerification,
    hasCompletionFailed,
  };
}
