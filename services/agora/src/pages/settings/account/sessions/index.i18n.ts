export interface SessionSettingsTranslations {
  pageTitle: string;
  description: string;
  currentSession: string;
  otherSession: string;
  started: string;
  expires: string;
  revoke: string;
  revokeTitle: string;
  revokeMessage: string;
  logoutAll: string;
  logoutAllTitle: string;
  logoutAllMessage: string;
  confirm: string;
  cancel: string;
  loadFailed: string;
  revokeFailed: string;
  logoutAllFailed: string;
  localOnlyTitle: string;
  localOnlyMessage: string;
  clearLocalData: string;
  retry: string;
  localCleanupFailed: string;
  retryLocalCleanup: string;
  navigationFailed: string;
  retryNavigation: string;
}

export const sessionSettingsTranslations = {
  en: {
    pageTitle: "Sessions",
    description:
      "Review active sessions without exposing device identifiers or browser details.",
    currentSession: "Current session",
    otherSession: "Other session",
    started: "Started:",
    expires: "Expires:",
    revoke: "Log out",
    revokeTitle: "Log out this session?",
    revokeMessage: "That session will lose access immediately.",
    logoutAll: "Log out all devices",
    logoutAllTitle: "Log out all devices?",
    logoutAllMessage:
      "Every active session, including this one, will be revoked.",
    confirm: "Confirm",
    cancel: "Cancel",
    loadFailed: "Sessions could not be loaded. Try again.",
    revokeFailed: "The session could not be revoked. Try again.",
    logoutAllFailed: "Server logout could not be confirmed.",
    localOnlyTitle: "Clear this device only?",
    localOnlyMessage:
      "Local account data and keys will be erased, but server sessions may remain active until you revoke them after logging in again or they expire.",
    clearLocalData: "Clear this device",
    retry: "Retry",
    localCleanupFailed:
      "Local account data or keys may remain on this device. Stay on this page and retry to finish logging out safely.",
    retryLocalCleanup: "Retry device cleanup",
    navigationFailed:
      "Local logout finished, but the home page could not be opened.",
    retryNavigation: "Open home page",
  },
} satisfies { en: SessionSettingsTranslations };
