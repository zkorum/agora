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

async function clearLanguagePreferencesIfRequested({
  shouldClearLanguagePreferences,
  clearLanguagePreferences,
}: {
  shouldClearLanguagePreferences: boolean;
  clearLanguagePreferences: () => Promise<boolean>;
}): Promise<void> {
  if (!shouldClearLanguagePreferences) {
    return;
  }

  const didClearLanguagePreferences = await clearLanguagePreferences();
  if (!didClearLanguagePreferences) {
    throw new Error("Failed to clear language preferences");
  }
}

export function clearAccountScopedState(): void {
  const { clearProfileData } = useUserStore();
  const { resetDraft } = useNewPostDraftsStore();
  const { clearOpinionDrafts } = useNewOpinionDraftsStore();
  const { clearNotificationData } = useNotificationStore();
  const { clearTopicsData } = useTopicStore();

  queryClient.clear();
  resetDraft();
  clearOpinionDrafts();
  clearProfileData();
  clearNotificationData();
  clearTopicsData();
  resetZupassModuleState();
}

export async function resetLocalAuthState({
  shouldClearLanguagePreferences = false,
}: ResetLocalAuthStateParams = {}): Promise<void> {
  const authStore = useAuthenticationStore();
  const { clearLanguagePreferences } = useLanguageStore();

  clearAccountScopedState();
  authStore.setLoginStatus({ isKnown: false });

  const cleanupResults = await Promise.allSettled([
    deleteDid(),
    clearLanguagePreferencesIfRequested({
      shouldClearLanguagePreferences,
      clearLanguagePreferences,
    }),
  ]);
  const cleanupErrors: unknown[] = [];
  for (const result of cleanupResults) {
    if (result.status === "rejected") {
      cleanupErrors.push(result.reason);
    }
  }

  if (cleanupErrors.length === 1) {
    throw cleanupErrors[0];
  }
  if (cleanupErrors.length > 1) {
    throw new AggregateError(cleanupErrors, "Failed to clear local auth state");
  }
}
