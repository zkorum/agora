export type LogoutFlowResult =
  | { status: "completed" }
  | { status: "server-revocation-failed"; error: unknown }
  | { status: "local-cleanup-failed"; error: unknown }
  | { status: "navigation-failed"; error: unknown };

interface RunLogoutFlowParams {
  revokeFromServer?: () => Promise<unknown>;
  clearLocalState: () => Promise<void>;
  clearActiveUserIntention: () => void;
  navigate?: () => Promise<void>;
}

export async function runLogoutFlow({
  revokeFromServer,
  clearLocalState,
  clearActiveUserIntention,
  navigate,
}: RunLogoutFlowParams): Promise<LogoutFlowResult> {
  if (revokeFromServer !== undefined) {
    try {
      await revokeFromServer();
    } catch (error) {
      return { status: "server-revocation-failed", error };
    }
  }

  try {
    await clearLocalState();
    clearActiveUserIntention();
  } catch (error) {
    return { status: "local-cleanup-failed", error };
  }

  if (navigate !== undefined) {
    try {
      await navigate();
    } catch (error) {
      return { status: "navigation-failed", error };
    }
  }

  return { status: "completed" };
}
