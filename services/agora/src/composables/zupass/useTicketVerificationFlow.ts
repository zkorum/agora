import { useZupassVerification } from "./useZupassVerification";
import { useBackendZupassApi } from "src/utils/api/zupass";
import { useBackendAuthApi } from "src/utils/api/auth";
import { useAuthenticationStore } from "src/stores/authentication";
import { useUserStore } from "src/stores/user";
import { useNotify } from "src/utils/ui/notify";
import { useQuasar } from "quasar";
import { getPlatform } from "src/utils/common";
import type { EventSlug } from "src/shared/types/zod";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  eventTicketRequirementBannerTranslations,
  type EventTicketRequirementBannerTranslations,
} from "src/components/post/EventTicketRequirementBanner.i18n";

export type TicketVerificationResult =
  | {
      success: true;
      userIdChanged: boolean;
      needsCacheRefresh: boolean;
    }
  | {
      success: false;
      error: string;
    };

export interface TicketVerificationOptions {
  eventSlug: EventSlug;
  successMessage?: string;
  onSuccess?: (result: TicketVerificationResult) => void | Promise<void>;
  onIframeReady?: () => void;
}

/**
 * Composable that provides a reusable ticket verification flow
 * Handles the full flow: request proof -> verify backend -> update state
 */
export function useTicketVerificationFlow() {
  const { requestTicketProof, setOnIframeReady, isVerifying } = useZupassVerification();
  const { verifyEventTicket } = useBackendZupassApi();
  const { updateAuthState } = useBackendAuthApi();
  const { showNotifyMessage } = useNotify();
  const authStore = useAuthenticationStore();
  const userStore = useUserStore();

  // Get platform at setup level (can't call useQuasar in async functions)
  const $q = useQuasar();
  const platform = getPlatform($q.platform);

  // Translations for error messages
  const { t } = useComponentI18n<EventTicketRequirementBannerTranslations>(
    eventTicketRequirementBannerTranslations
  );

  // Map error codes to user-friendly messages
  function getErrorMessage(errorCode: string): string {
    const errorMessages: Record<string, string> = {
      deserialization_error: t("errorDeserialization"),
      invalid_proof: t("errorInvalidProof"),
      invalid_signer: t("errorInvalidSigner"),
      wrong_event: t("errorWrongEvent"),
      ticket_already_used: t("errorTicketAlreadyUsed"),
      unknown: t("errorUnknown"),
    };
    return errorMessages[errorCode] || errorMessages.unknown;
  }

  async function verifyTicket({
    eventSlug,
    successMessage,
    onSuccess,
    onIframeReady,
  }: TicketVerificationOptions): Promise<TicketVerificationResult> {
    // Set verifying state in store immediately
    userStore.setTicketVerifying(eventSlug);
    isVerifying.value = true;

    try {

      // Set callback to close dialog when iframe is ready
      if (onIframeReady) {
        setOnIframeReady(onIframeReady);
      }

      // Request proof from Zupass (Parcnet creates its own dialog)
      const proofResult = await requestTicketProof({
        eventSlug,
        platform,
      });

      if (!proofResult.success) {
        // Handle cancellation gracefully - don't show error
        if (proofResult.error === "cancelled") {
          userStore.clearTicketState(eventSlug);
          return { success: false, error: "cancelled" };
        }

        const errorReason = proofResult.error || "unknown";
        const errorMessage = getErrorMessage(errorReason);
        userStore.setTicketError(eventSlug, errorMessage);
        showNotifyMessage(errorMessage);
        return { success: false, error: errorReason };
      }

      // Send GPC proof to backend for verification
      console.log("[TicketVerificationFlow] Sending proof to backend...");
      let verifyResult;
      try {
        verifyResult = await verifyEventTicket({
          proof: proofResult.proof!,
          eventSlug,
        });
        console.log("[TicketVerificationFlow] Backend response:", verifyResult);
      } catch (backendError) {
        console.error("[TicketVerificationFlow] Backend call threw exception:", backendError);
        throw backendError;
      }

      if (!verifyResult.success) {
        const errorReason = verifyResult.reason || "unknown";
        console.log("[TicketVerificationFlow] Verification failed with reason:", errorReason);
        const errorMessage = getErrorMessage(errorReason);
        userStore.setTicketError(eventSlug, errorMessage);
        showNotifyMessage(errorMessage);
        return { success: false, error: errorReason };
      }

      // Check if userId changed (account merge)
      const currentUserId = authStore.userId;
      const newUserId = verifyResult.userId;
      const userIdChanged = currentUserId !== newUserId;

      // Update auth state with deferred cache operations
      const { needsCacheRefresh } = await updateAuthState({
        partialLoginStatus: { isKnown: true, userId: newUserId },
        deferCacheOperations: true,
      });

      // Add verified ticket to user store immediately to unlock gated content
      // This also clears the transient "verifying" state since getTicketVerificationState
      // will now return "verified"
      userStore.addVerifiedTicket(eventSlug);
      userStore.clearTicketState(eventSlug);
      console.log("[TicketVerificationFlow] Ticket verified and state cleared for", eventSlug);

      // Show success message
      if (successMessage !== undefined) {
        showNotifyMessage(successMessage);
      } else if (verifyResult.accountMerged) {
        showNotifyMessage("Account merged successfully");
      } else {
        showNotifyMessage("Event ticket verified successfully");
      }

      const result: TicketVerificationResult = {
        success: true,
        userIdChanged,
        needsCacheRefresh,
      };

      // Call success callback if provided
      if (onSuccess !== undefined) {
        await onSuccess(result);
      }

      return result;
    } catch (err) {
      console.error("[TicketVerificationFlow] Error:", err);
      const errorMessage = getErrorMessage("unknown");
      userStore.setTicketError(eventSlug, errorMessage);
      showNotifyMessage(errorMessage);
      return { success: false, error: "unknown" };
    } finally {
      // Reset loading state after entire verification flow completes
      isVerifying.value = false;
    }
  }

  return {
    verifyTicket,
  };
}
