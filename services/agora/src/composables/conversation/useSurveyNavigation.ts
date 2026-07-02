import { useBackendSurveyApi } from "src/utils/api/survey/survey";
import {
  type ConversationRouteContext,
  getConversationRouteContextFromRoute,
} from "src/utils/router/conversationRouteContext";
import {
  getConversationSurveyOnboardingPath,
  getConversationSurveyRoutePath,
  getConversationSurveySummaryPath,
} from "src/utils/survey/navigation";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

export function useSurveyNavigation() {
  const router = useRouter();
  const route = useRoute();
  const { checkSurveyStatus } = useBackendSurveyApi();
  const currentRouteContext = computed(() =>
    getConversationRouteContextFromRoute({
      name: route.name,
      params: route.params,
    })
  );

  async function navigateToSurveyRoot({
    conversationSlugId,
    routeContext = currentRouteContext.value,
  }: {
    conversationSlugId: string;
    routeContext?: ConversationRouteContext;
  }): Promise<void> {
    await router.push({
      path: getConversationSurveyOnboardingPath({ conversationSlugId, routeContext }),
    });
  }

  async function navigateToNextSurveyStep({
    conversationSlugId,
    routeContext = currentRouteContext.value,
  }: {
    conversationSlugId: string;
    routeContext?: ConversationRouteContext;
  }): Promise<void> {
    const response = await checkSurveyStatus({ conversationSlugId });

    if (response.status !== "success") {
      await navigateToSurveyRoot({ conversationSlugId, routeContext });
      return;
    }

    await router.push({
      path: getConversationSurveyRoutePath({
        conversationSlugId,
        routeResolution: response.data.routeResolution,
        routeContext,
      }),
    });
  }

  async function navigateToSurveySummary({
    conversationSlugId,
    routeContext = currentRouteContext.value,
  }: {
    conversationSlugId: string;
    routeContext?: ConversationRouteContext;
  }): Promise<void> {
    await router.push({
      path: getConversationSurveySummaryPath({ conversationSlugId, routeContext }),
    });
  }

  return {
    navigateToSurveyRoot,
    navigateToNextSurveyStep,
    navigateToSurveySummary,
  };
}
