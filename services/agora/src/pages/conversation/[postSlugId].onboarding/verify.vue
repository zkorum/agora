<template>
  <router-view />
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useConversationSurveyState } from "src/composables/conversation/useConversationSurveyState";
import { useConversationOnboardingStore } from "src/stores/conversationOnboarding";
import { onboardingFlowStore } from "src/stores/onboarding/flow";
import { getSingleRouteParam } from "src/utils/router/params";
import { computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { resolveVerifyRouteDecision } from "./verifyRouteLogic";

const router = useRouter();
const route = useRoute();
const { onboardingMode, credentialUpgradeTarget } = storeToRefs(
  onboardingFlowStore()
);
const conversationOnboardingStore = useConversationOnboardingStore();

const routeConversationSlugId = computed(() => {
  return getSingleRouteParam(route.params.postSlugId);
});

if (conversationOnboardingStore.conversationSlugId !== routeConversationSlugId.value) {
  conversationOnboardingStore.startManualEntry({
    conversationSlugId: routeConversationSlugId.value,
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
  return route.name === "/conversation/[postSlugId].onboarding/verify";
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
    });

    if (decision.onboardingMode !== null) {
      onboardingMode.value = decision.onboardingMode;
    }

    credentialUpgradeTarget.value = decision.credentialUpgradeTarget;

    if (decision.redirectPath === null) {
      return;
    }
    void router.replace({
      path: decision.redirectPath,
    });
  },
  { immediate: true }
);
</script>
