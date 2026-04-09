import { useBackendSurveyApi } from "src/utils/api/survey/survey";
import {
  getConversationSurveyOnboardingPath,
  getConversationSurveyRoutePath,
  getConversationSurveySummaryPath,
} from "src/utils/survey/navigation";
import { useRouter } from "vue-router";

export function useSurveyNavigation() {
  const router = useRouter();
  const { checkSurveyStatus } = useBackendSurveyApi();

  async function navigateToSurveyRoot({
    conversationSlugId,
  }: {
    conversationSlugId: string;
  }): Promise<void> {
    await router.push({
      path: getConversationSurveyOnboardingPath({ conversationSlugId }),
    });
  }

  async function navigateToNextSurveyStep({
    conversationSlugId,
  }: {
    conversationSlugId: string;
  }): Promise<void> {
    const response = await checkSurveyStatus({ conversationSlugId });

    if (response.status !== "success") {
      await navigateToSurveyRoot({ conversationSlugId });
      return;
    }

    await router.push({
      path: getConversationSurveyRoutePath({
        conversationSlugId,
        routeResolution: response.data.routeResolution,
      }),
    });
  }

  async function navigateToSurveySummary({
    conversationSlugId,
  }: {
    conversationSlugId: string;
  }): Promise<void> {
    await router.push({
      path: getConversationSurveySummaryPath({ conversationSlugId }),
    });
  }

  return {
    navigateToSurveyRoot,
    navigateToNextSurveyStep,
    navigateToSurveySummary,
  };
}
