import { resetZupassModuleState } from "src/composables/zupass/useZupassVerification";
import type { DeviceLoginStatus } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { useLanguageStore } from "src/stores/language";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import { useNewOpinionDraftsStore } from "src/stores/newOpinionDrafts";
import { useNotificationStore } from "src/stores/notification";
import { emailVerificationStore } from "src/stores/onboarding/email";
import { phoneVerificationStore } from "src/stores/onboarding/phone";
import { useTopicStore } from "src/stores/topic";
import { useUserStore } from "src/stores/user";
import {
  deleteDid,
  deleteDidIfCurrent,
} from "src/utils/crypto/ucan/operation";
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
  const { reset: resetEmailVerification } = emailVerificationStore();
  const { reset: resetPhoneVerification } = phoneVerificationStore();

  queryClient.clear();
  resetDraft();
  clearOpinionDrafts();
  clearProfileData();
  clearNotificationData();
  clearTopicsData();
  resetEmailVerification();
  resetPhoneVerification();
  resetZupassModuleState();
}

export async function resetLocalAuthState({
  shouldClearLanguagePreferences = false,
}: ResetLocalAuthStateParams = {}): Promise<void> {
  const authStore = useAuthenticationStore();
  const { clearLanguagePreferences } = useLanguageStore();

  clearAccountScopedState();

  const cleanupResults = await Promise.allSettled([
    deleteDid(),
    clearLanguagePreferencesIfRequested({
      shouldClearLanguagePreferences,
      clearLanguagePreferences,
    }),
  ]);
  if (cleanupResults[0].status === "fulfilled") {
    authStore.setLoginStatus({ isKnown: false });
  }
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

export async function resetLocalAuthStateIfDidMatches({
  didWrite,
  loginStatusOnDeletionFailure,
  shouldClearLanguagePreferences = false,
}: ResetLocalAuthStateParams & {
  didWrite: string;
  loginStatusOnDeletionFailure: DeviceLoginStatus;
}): Promise<boolean> {
  const authStore = useAuthenticationStore();
  const { clearLanguagePreferences } = useLanguageStore();
  const didWasDeleted = await deleteDidIfCurrent({
    didWrite,
    onDeleted: () => {
      clearAccountScopedState();
      authStore.setLoginStatus({ isKnown: false });
    },
    onDeleteFailed: () => {
      authStore.setLoginStatus(loginStatusOnDeletionFailure);
    },
  });
  if (!didWasDeleted) {
    return false;
  }
  await clearLanguagePreferencesIfRequested({
    shouldClearLanguagePreferences,
    clearLanguagePreferences,
  });
  return true;
}
