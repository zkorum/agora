import { ref, shallowRef } from "vue";
import { ticketProofRequest } from "@parcnet-js/ticket-spec";
import {
  init,
  doConnect,
  type Zapp,
  UserCancelledConnectionError,
  UserClosedDialogError,
} from "@parcnet-js/app-connector";
import type { ParcnetAPI } from "@parcnet-js/app-connector";
import type { EventSlug } from "src/shared/types/zod";
import {
  getZupassEventConfig,
  getZupassSignerPublicKey,
  getZupassCollectionName,
} from "src/shared/zupass/eventConfig";
import { createDidIfDoesNotExist } from "src/utils/crypto/ucan/operation";
import type { SupportedPlatform } from "src/utils/common";

// Parcnet app configuration
const ZAPP_CONFIG: Zapp = {
  name: "Agora Citizen Network",
  permissions: {
    REQUEST_PROOF: { collections: ["Devconnect ARG"] },
    READ_POD: { collections: ["Devconnect ARG"] },
    READ_PUBLIC_IDENTIFIERS: {},
  },
};

export interface ZupassVerificationResult {
  success: boolean;
  proof?: unknown;
  error?: string;
}

type ConnectionState = "disconnected" | "connecting" | "connected" | "error";

// Global shared state (module-level singletons)
// This ensures all components share the same Parcnet connection and iframe container
const isVerifying = ref(false);
const error = ref<string | null>(null);
const zupassIframeContainer = ref<HTMLElement | null>(null);
const parcnetAPI = shallowRef<ParcnetAPI | null>(null);
const connectionState = ref<ConnectionState>("disconnected");
const initContext = shallowRef<Awaited<ReturnType<typeof init>> | null>(null);

// Callback fired when Zupass iframe/dialog becomes visible
let onIframeReadyCallback: (() => void) | null = null;

/**
 * Composable for Zupass event ticket verification using Parcnet
 * Maintains persistent Parcnet connection similar to React's useParcnetClient()
 * All state is shared at module level - all components use the same Parcnet instance
 */
export function useZupassVerification() {

  /**
   * Reset connection state (useful when permissions were denied or connection failed)
   */
  function resetConnection(): void {
    parcnetAPI.value = null;
    connectionState.value = "disconnected";
    error.value = null;
    // Keep initContext - iframe and dialog can be reused
  }

  /**
   * Initialize Parcnet iframe and dialog
   * This creates the iframe and dialog element but doesn't connect yet
   */
  async function initParcnetIframe(): Promise<void> {
    if (initContext.value) {
      return;
    }

    if (!zupassIframeContainer.value) {
      throw new Error("Zupass iframe container not mounted");
    }

    // Step 1: Initialize iframe and dialog
    // This creates the <dialog> element that will show permissions UI
    const ctx = await init(zupassIframeContainer.value, "https://zupass.org");
    initContext.value = ctx;
  }

  /**
   * Connect to Zupass and request permissions
   * Calls init() and doConnect() in sequence without caching (Step 1 fix)
   */
  async function connectToZupass(): Promise<void> {
    if (
      connectionState.value === "connected" ||
      connectionState.value === "connecting"
    ) {
      return;
    }

    connectionState.value = "connecting";

    try {
      // Step 1 Fix: Call init() and doConnect() in sequence, no caching
      if (!zupassIframeContainer.value) {
        throw new Error("Zupass iframe container not mounted");
      }

      // Initialize iframe
      const ctx = await init(zupassIframeContainer.value, "https://zupass.org");

      // Immediately connect using fresh context (no caching!)
      const z = await doConnect(ZAPP_CONFIG, ctx);

      parcnetAPI.value = z;
      initContext.value = ctx; // Store only after successful connection
      connectionState.value = "connected";

      // Fire callback to signal that Zupass iframe is ready and visible
      if (onIframeReadyCallback) {
        onIframeReadyCallback();
        onIframeReadyCallback = null; // Clear after firing
      }
    } catch (err) {
      // Log error with container context for debugging
      const containerInfo = zupassIframeContainer.value
        ? `${zupassIframeContainer.value.tagName}`
        : 'null';
      console.error(`[Zupass] Connection failed (container: ${containerInfo}):`, err);

      // Handle specific Parcnet errors
      if (err instanceof UserCancelledConnectionError) {
        error.value = "Connection cancelled by user";
      } else if (err instanceof UserClosedDialogError) {
        error.value = "Dialog closed without approving permissions";
      } else {
        error.value = err instanceof Error ? err.message : "Failed to connect";
      }

      connectionState.value = "error";
      throw err;
    }
  }

  /**
   * Request ticket proof from Zupass using established Parcnet connection
   * @param eventSlug - The event to verify ticket for
   * @param platform - Platform type (mobile or web) to get the correct DID
   */
  async function requestTicketProof({
    eventSlug,
    platform,
  }: {
    eventSlug: EventSlug;
    platform: SupportedPlatform;
  }): Promise<ZupassVerificationResult> {
    // Don't set isVerifying here - it should be managed by caller (useTicketVerificationFlow)
    // to cover the entire verification flow including backend verification
    error.value = null;

    try {
      // Get user's DID to bind proof (prevents proof stealing)
      const { did: didWrite } = await createDidIfDoesNotExist(platform);

      // Get config from shared configuration
      const config = getZupassEventConfig(eventSlug);
      const signerPublicKey = getZupassSignerPublicKey(eventSlug);
      const collectionName = getZupassCollectionName(eventSlug);

      // Ensure we're connected before proceeding
      if (connectionState.value !== "connected" || !parcnetAPI.value) {
        await connectToZupass();
      } else {
        // Already connected - fire callback immediately since iframe is already ready
        if (onIframeReadyCallback) {
          onIframeReadyCallback();
          onIframeReadyCallback = null;
        }
      }

      if (!parcnetAPI.value) {
        throw new Error("Failed to establish Parcnet connection");
      }

      // Build GPC proof request using ticketProofRequest()
      // Use ONLY signerPublicKey + eventId WITHOUT productId to match ANY ticket for this event
      const proofRequest = ticketProofRequest({
        classificationTuples: [
          {
            signerPublicKey,
            eventId: config.zupassEventId,
            // NO productId - this allows ANY ticket type for this event
          },
        ],
        fieldsToReveal: {
          // No fields need to be revealed for our use case
          // The proof already contains: nullifier, event/product validation via tuples
          // Revealing ticket details would compromise privacy unnecessarily
        },
        externalNullifier: {
          type: "string",
          // Event-specific nullifier to prevent cross-event tracking
          // This allows backend to verify uniqueness per event while maintaining privacy
          value: `agora-${eventSlug}-v1`,
        },
        watermark: {
          type: "string",
          // Bind proof to user's DID to prevent proof stealing
          // The watermark is cryptographically bound to the proof and verified by backend
          value: didWrite,
        },
      });

      const proofResult = await parcnetAPI.value.gpc.prove({
        request: proofRequest.schema,
        collectionIds: [collectionName],
      });

      if (!proofResult) {
        throw new Error("Failed to generate proof");
      }

      if ("error" in proofResult) {
        // Gather POD statistics for debugging (privacy-safe - counts only)
        let podStats = null;
        try {
          const podspec = await import("@parcnet-js/podspec");
          const allPods = await parcnetAPI.value.pod
            .collection(collectionName)
            .query(podspec.pod({ entries: {} }));

          podStats = {
            totalPods: allPods.length,
            podsWithOwner: allPods.filter((p) => p.entries.owner).length,
            podsWithEventId: allPods.filter((p) => p.entries.eventId).length,
            addOnTickets: allPods.filter(
              (p) => p.entries.isAddOn?.value === BigInt(1)
            ).length,
            podsMatchingEventId: allPods.filter(
              (p) => p.entries.eventId?.value === config.zupassEventId
            ).length,
          };
        } catch (e) {
          podStats = { error: e instanceof Error ? e.message : String(e) };
        }

        // Log for Sentry with diagnostic context
        console.error("[Zupass] Proof generation failed:", {
          error: proofResult.error,
          podStats,
          eventSlug,
          collectionName,
        });

        throw new Error(proofResult.error);
      }

      const gpcLib = await import("@pcd/gpc");
      const serializedProof = {
        proof: proofResult.proof,
        boundConfig: gpcLib.boundConfigToJSON(proofResult.boundConfig),
        revealedClaims: gpcLib.revealedClaimsToJSON(proofResult.revealedClaims),
      };

      return {
        success: true,
        proof: serializedProof,
      };
    } catch (err) {
      console.error("[Zupass] Error during proof request:", err);

      // Handle user cancellation gracefully
      if (err instanceof UserCancelledConnectionError) {
        error.value = "Proof request cancelled by user";
        return {
          success: false,
          error: "cancelled",
        };
      }

      const errorMessage =
        err instanceof Error
          ? err.message
          : "Unknown error during verification";
      console.error("[Zupass] Error message:", errorMessage);

      // If we get "Operation not allowed", permissions were likely denied
      // Reset connection so next attempt will show permissions dialog again
      if (errorMessage.includes("Operation not allowed")) {
        resetConnection();
      }

      error.value = errorMessage;
      return {
        success: false,
        error: errorMessage,
      };
    }
    // Note: isVerifying is NOT reset here - it's managed by caller (useTicketVerificationFlow)
  }

  /**
   * Set callback to be fired when Zupass iframe becomes visible
   * Used to close loading dialogs at the right moment
   */
  function setOnIframeReady(callback: () => void): void {
    onIframeReadyCallback = callback;
  }

  return {
    isVerifying,
    error,
    zupassIframeContainer,
    connectionState,
    initParcnetIframe,
    connectToZupass,
    requestTicketProof,
    resetConnection,
    setOnIframeReady,
  };
}
