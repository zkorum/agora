import { resetZupassModuleState } from "src/composables/zupass/useZupassVerification";
import { useAuthenticationStore } from "src/stores/authentication";
import { useLanguageStore } from "src/stores/language";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import { useNewOpinionDraftsStore } from "src/stores/newOpinionDrafts";
import { useNotificationStore } from "src/stores/notification";
import { useTopicStore } from "src/stores/topic";
import { useUserStore } from "src/stores/user";
import { deleteDid } from "src/utils/crypto/ucan/operation";
import { queryClient } from "src/utils/query/client";

interface ResetLocalAuthStateParams {
  shouldClearLanguagePreferences?: boolean;
}

export async function resetLocalAuthState({
  shouldClearLanguagePreferences = false,
}: ResetLocalAuthStateParams = {}): Promise<void> {
  const authStore = useAuthenticationStore();
  const { clearProfileData } = useUserStore();
  const { resetDraft } = useNewPostDraftsStore();
  const { clearOpinionDrafts } = useNewOpinionDraftsStore();
  const { clearNotificationData } = useNotificationStore();
  const { clearTopicsData } = useTopicStore();
  const { clearLanguagePreferences } = useLanguageStore();

  queryClient.clear();

  await deleteDid();
  resetDraft();
  clearOpinionDrafts();

  authStore.setLoginStatus({ isKnown: false });

  clearProfileData();
  clearNotificationData();
  clearTopicsData();
  resetZupassModuleState();

  if (shouldClearLanguagePreferences) {
    await clearLanguagePreferences();
  }
}
