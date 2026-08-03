import type { DeviceLoginStatus } from "src/shared/types/zod";

export type BackendAuthStatusAction = "apply-status" | "reset-did";

export function getBackendAuthStatusAction(
  loginStatus: DeviceLoginStatus
): BackendAuthStatusAction {
  return !loginStatus.isKnown ||
    (loginStatus.isRegistered && !loginStatus.isLoggedIn)
    ? "reset-did"
    : "apply-status";
}
