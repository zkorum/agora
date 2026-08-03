import type { DeviceLoginStatus } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { runIfCurrentDid } from "src/utils/crypto/ucan/operation";

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
}: {
  loginStatus: DeviceLoginStatus;
  didWrite: string;
}): Promise<BackendAuthStatusApplication> {
  const authStore = useAuthenticationStore();
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
    operation: () => authStore.setLoginStatus(loginStatus),
  });
  return statusUpdate.matched
    ? { type: "updated", transition: statusUpdate.result }
    : { type: "ignored" };
}
