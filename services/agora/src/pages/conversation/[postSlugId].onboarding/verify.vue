<template>
  <router-view />
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useConversationOnboardingExit } from "src/composables/conversation/useConversationOnboardingExit";
import { useConversationOnboardingRoute } from "src/composables/conversation/useConversationOnboardingRoute";
import { useConversationSurveyState } from "src/composables/conversation/useConversationSurveyState";
import { useConversationOnboardingStore } from "src/stores/conversationOnboarding";
import { onboardingFlowStore } from "src/stores/onboarding/flow";
import { computed, watch } from "vue";
import { useRouter } from "vue-router";

import { resolveVerifyRouteDecision } from "./verifyRouteLogic";

const router = useRouter();
const { route, routeConversationSlugId, routeContext } =
  useConversationOnboardingRoute();
const { onboardingMode, credentialUpgradeTarget } = storeToRefs(
  onboardingFlowStore()
);
const conversationOnboardingStore = useConversationOnboardingStore();
const { exitToConversation } = useConversationOnboardingExit();

if (conversationOnboardingStore.conversationSlugId !== routeConversationSlugId.value) {
  conversationOnboardingStore.startManualEntry({
    conversationSlugId: routeConversationSlugId.value,
    routeContext: routeContext.value,
  });
}

const {
  conversationSlugId,
  conversationData,
  surveyStatus,
  surveyForm,
  requirementState,
  isInitialLoading,
  hasLoadError,
} = useConversationSurveyState({ conversationSlugId: routeConversationSlugId });

const isExactVerifyRoute = computed(() => {
  const routeName = String(route.name ?? "");
  return routeName === "/conversation/[postSlugId].onboarding/verify";
});

watch(
  [
    isExactVerifyRoute,
    isInitialLoading,
    hasLoadError,
    conversationData,
    surveyStatus,
    surveyForm,
    requirementState,
  ],
  ([
    exactVerifyRoute,
    loading,
    loadError,
    conversation,
    statusData,
    formData,
    requirements,
  ]) => {
    const decision = resolveVerifyRouteDecision({
      exactVerifyRoute: exactVerifyRoute,
      isInitialLoading: loading,
      hasLoadError: loadError,
      justCompletedSurvey: conversationOnboardingStore.justCompletedSurvey,
      conversationSlugId: conversationSlugId.value,
      conversation:
        conversation === undefined
          ? undefined
          : {
              participationMode: conversation.metadata.participationMode,
            },
      surveyStatus: statusData,
      surveyForm: formData,
      requirementState: requirements,
      routeContext: routeContext.value,
    });

    if (decision.onboardingMode !== null) {
      onboardingMode.value = decision.onboardingMode;
    }

    credentialUpgradeTarget.value = decision.credentialUpgradeTarget;

    if (decision.navigation.kind === "none") {
      return;
    }

    if (decision.navigation.kind === "exitToConversation") {
      void exitToConversation({
        conversationSlugId: conversationSlugId.value,
        routeContext: routeContext.value,
      });
      return;
    }

    void router.replace({
      path: decision.navigation.path,
    });
  },
  { immediate: true }
);
</script>
