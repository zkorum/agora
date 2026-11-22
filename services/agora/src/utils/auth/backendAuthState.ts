import type { DeviceLoginStatus } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { runIfCurrentDid } from "src/utils/crypto/ucan/operation";
import { queryClient } from "src/utils/query/client";
import { seedNewGuestQueries } from "src/utils/query/guestQueryCache";

import { getBackendAuthStatusAction } from "./backendAuthStateDecision";
import { resetLocalAuthStateIfDidMatches } from "./localAuthState";

type AuthenticationStore = ReturnType<typeof useAuthenticationStore>;
export type AuthStatusTransition = ReturnType<
  AuthenticationStore["setLoginStatus"]
>;

export type BackendAuthStatusApplication =
  | { type: "ignored" }
  | { type: "reset" }
  | { type: "updated"; transition: AuthStatusTransition };

export async function applyBackendAuthStatus({
  loginStatus,
  didWrite,
  isCurrent = () => true,
}: {
  loginStatus: DeviceLoginStatus;
  didWrite: string;
  isCurrent?: () => boolean;
}): Promise<BackendAuthStatusApplication> {
  const authStore = useAuthenticationStore();
  if (!isCurrent()) return { type: "ignored" };
  if (getBackendAuthStatusAction(loginStatus) === "reset-did") {
    const wasReset = await resetLocalAuthStateIfDidMatches({
      didWrite,
      shouldClearLanguagePreferences: authStore.isGuestOrLoggedIn,
      loginStatusOnDeletionFailure: loginStatus,
    });
    return wasReset ? { type: "reset" } : { type: "ignored" };
  }

  const statusUpdate = await runIfCurrentDid({
    didWrite,
    operation: () => {
      if (!isCurrent()) return undefined;
      if (
        !authStore.isKnown &&
        loginStatus.isKnown &&
        !loginStatus.isRegistered
      ) {
        seedNewGuestQueries({ queryClient, userId: loginStatus.userId });
      }
      return authStore.setLoginStatus(loginStatus);
    },
  });
  return statusUpdate.matched && statusUpdate.result !== undefined
    ? { type: "updated", transition: statusUpdate.result }
    : { type: "ignored" };
}
