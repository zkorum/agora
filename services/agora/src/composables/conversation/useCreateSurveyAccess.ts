import { storeToRefs } from "pinia";
import { useAuthenticationStore } from "src/stores/authentication";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import { usePremiumFeatureApi } from "src/utils/api/premiumFeature";
import { ref } from "vue";

export function useCreateSurveyAccess() {
  const { isLoggedIn } = storeToRefs(useAuthenticationStore());
  const { conversationDraft } = storeToRefs(useNewPostDraftsStore());
  const { checkPremiumFeatureAccess } = usePremiumFeatureApi();
  const isSurveyCreationAllowed = ref<boolean | null>(null);
  let accessRequestId = 0;

  async function refreshSurveyCreationAccess(): Promise<boolean> {
    const requestId = ++accessRequestId;

    if (!isLoggedIn.value) {
      isSurveyCreationAllowed.value = false;
      return false;
    }

    isSurveyCreationAllowed.value = null;

    try {
      const response = await checkPremiumFeatureAccess({
        feature: "survey",
        postAsOrganization: conversationDraft.value.postAs.postAsOrganization
          ? conversationDraft.value.postAs.organizationName
          : undefined,
      });

      if (requestId !== accessRequestId) {
        return isSurveyCreationAllowed.value === true;
      }

      isSurveyCreationAllowed.value = response.hasAccess;
      return response.hasAccess;
    } catch {
      if (requestId === accessRequestId) {
        isSurveyCreationAllowed.value = false;
      }

      return false;
    }
  }

  return {
    isSurveyCreationAllowed,
    refreshSurveyCreationAccess,
  };
}
