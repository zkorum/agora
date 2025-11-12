import { ref, shallowRef } from "vue";
import { ticketProofRequest } from "@parcnet-js/ticket-spec";
import { pod } from "@parcnet-js/podspec";
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

/**
 * Composable for Zupass event ticket verification using Parcnet
 * Maintains persistent Parcnet connection similar to React's useParcnetClient()
 */
export function useZupassVerification() {
  const isVerifying = ref(false);
  const error = ref<string | null>(null);
  const zupassIframeContainer = ref<HTMLElement | null>(null);

  // Persistent connection state (like React's useParcnetClient)
  const parcnetAPI = shallowRef<ParcnetAPI | null>(null);
  const connectionState = ref<ConnectionState>("disconnected");
  const initContext = shallowRef<Awaited<ReturnType<typeof init>> | null>(null);

  /**
   * Reset connection state (useful when permissions were denied or connection failed)
   */
  function resetConnection(): void {
    console.log("[Zupass] ========================================");
    console.log("[Zupass] Resetting connection state");
    console.log("[Zupass] ========================================");
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
      console.log("[Zupass] Iframe already initialized, skipping");
      return;
    }

    if (!zupassIframeContainer.value) {
      throw new Error("Zupass iframe container not mounted");
    }

    console.log("[Zupass] ========================================");
    console.log("[Zupass] Initializing Parcnet iframe and dialog...");
    console.log("[Zupass] Container element:", zupassIframeContainer.value);

    try {
      // Step 1: Initialize iframe and dialog
      // This creates the <dialog> element that will show permissions UI
      const ctx = await init(zupassIframeContainer.value, "https://zupass.org");

      initContext.value = ctx;
      console.log("[Zupass] ✓ Iframe and dialog initialized successfully");
      console.log("[Zupass] - Has iframe?", !!ctx.iframe);
      console.log("[Zupass] - Has dialog?", !!ctx.dialog);
      console.log("[Zupass] - Has emitter?", !!ctx.emitter);
      console.log("[Zupass] ========================================");
    } catch (err) {
      console.error("[Zupass] ========================================");
      console.error("[Zupass] Failed to initialize iframe:", err);
      console.error("[Zupass] ========================================");
      throw err;
    }
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
      console.log("[Zupass] Already connected or connecting, skipping");
      return;
    }

    connectionState.value = "connecting";
    console.log("[Zupass] ========================================");
    console.log("[Zupass] Starting connection to Parcnet...");
    console.log("[Zupass] App name:", ZAPP_CONFIG.name);
    console.log(
      "[Zupass] Permissions:",
      JSON.stringify(ZAPP_CONFIG.permissions, null, 2)
    );

    try {
      // Step 1 Fix: Call init() and doConnect() in sequence, no caching
      if (!zupassIframeContainer.value) {
        throw new Error("Zupass iframe container not mounted");
      }

      console.log("[Zupass] Initializing iframe and connecting in sequence...");
      console.log("[Zupass] Container element:", zupassIframeContainer.value);

      // Initialize iframe
      const ctx = await init(zupassIframeContainer.value, "https://zupass.org");

      console.log("[Zupass] ✓ Iframe initialized");
      console.log("[Zupass] Immediately calling doConnect...");
      console.log(
        "[Zupass] Waiting for user to approve connection and permissions..."
      );

      // Immediately connect using fresh context (no caching!)
      const z = await doConnect(ZAPP_CONFIG, ctx);

      parcnetAPI.value = z;
      initContext.value = ctx; // Store only after successful connection
      connectionState.value = "connected";
      console.log("[Zupass] ========================================");
      console.log("[Zupass] ✓ Connected successfully! Full flow completed.");
      console.log("[Zupass] ========================================");
    } catch (err) {
      console.error("[Zupass] ========================================");
      console.error("[Zupass] Connection error:", err);

      // Handle specific Parcnet errors
      if (err instanceof UserCancelledConnectionError) {
        error.value = "Connection cancelled by user";
        console.log("[Zupass] User cancelled connection");
      } else if (err instanceof UserClosedDialogError) {
        error.value = "Dialog closed without approving permissions";
        console.log("[Zupass] User closed dialog without approving");
      } else {
        error.value = err instanceof Error ? err.message : "Failed to connect";
      }

      connectionState.value = "error";
      console.error("[Zupass] ========================================");
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
    isVerifying.value = true;
    error.value = null;

    try {
      // Get user's DID to bind proof (prevents proof stealing)
      const { did: didWrite } = await createDidIfDoesNotExist(platform);

      // Get config from shared configuration
      const config = getZupassEventConfig(eventSlug);
      const signerPublicKey = getZupassSignerPublicKey(eventSlug);
      const collectionName = getZupassCollectionName(eventSlug);

      console.log("[Zupass] ========================================");
      console.log("[Zupass] Starting ticket proof request");
      console.log("[Zupass] Event:", eventSlug);
      console.log("[Zupass] Event ID:", config.zupassEventId);
      console.log("[Zupass] Collection:", collectionName);

      // Ensure we're connected before proceeding
      if (connectionState.value !== "connected" || !parcnetAPI.value) {
        console.log("[Zupass] Not connected, initiating connection...");
        await connectToZupass();
      }

      if (!parcnetAPI.value) {
        throw new Error("Failed to establish Parcnet connection");
      }

      // STEP 1: Query PODs to see what tickets user actually has
      console.log(
        `[Zupass] Querying PODs from ${collectionName} collection...`
      );

      const query = pod({
        entries: {
          eventId: {
            type: "string",
            isMemberOf: [{ type: "string", value: config.zupassEventId }],
          },
        },
      });

      const allPods = await parcnetAPI.value.pod
        .collection(collectionName)
        .query(query);

      console.log("[Zupass] ✓ POD query complete");
      console.log("[Zupass] Total PODs found:", allPods.length);

      // Filter out swag tickets (isAddOn)
      const tickets = allPods.filter(
        (pod) =>
          !pod.entries.isAddOn || pod.entries.isAddOn?.value === BigInt(0)
      );

      console.log("[Zupass] Non-swag tickets:", tickets.length);

      if (tickets.length === 0) {
        console.warn(
          `[Zupass] No tickets found! User may not have a ${config.displayName} ticket.`
        );
        throw new Error(
          `No ${config.displayName} tickets found in your Zupass`
        );
      }

      console.log("[Zupass] ✓ Found valid ticket for proof generation");
      console.log("[Zupass] ========================================");

      // STEP 2: Build GPC proof request using ticketProofRequest()
      // Use ONLY signerPublicKey + eventId WITHOUT productId to match ANY ticket for this event
      console.log("[Zupass] Building ticket proof request...");
      console.log(
        "[Zupass] Using classification tuple: [signerPublicKey, eventId]"
      );
      console.log(
        "[Zupass] This matches ANY ticket for the event (not filtering by productId)"
      );

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

      console.log("[Zupass] Calling gpc.prove with collectionIds...");
      console.log(`[Zupass] Collection: ${collectionName}`);

      const proofResult = await parcnetAPI.value.gpc.prove({
        request: proofRequest.schema,
        collectionIds: [collectionName],
      });

      console.log("[Zupass] ✓ Proof generated successfully");
      console.log("[Zupass] ========================================");

      if (!proofResult) {
        throw new Error("Failed to generate proof");
      }

      if ("error" in proofResult) {
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
      console.error("[Zupass] ========================================");
      console.error("[Zupass] Error during proof request:", err);

      // Handle user cancellation gracefully
      if (err instanceof UserCancelledConnectionError) {
        console.log("[Zupass] User cancelled proof request");
        console.error("[Zupass] ========================================");
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
      console.error("[Zupass] ========================================");

      // If we get "Operation not allowed", permissions were likely denied
      // Reset connection so next attempt will show permissions dialog again
      if (errorMessage.includes("Operation not allowed")) {
        console.log(
          "[Zupass] Operation not allowed - resetting connection for retry"
        );
        resetConnection();
      }

      error.value = errorMessage;
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      isVerifying.value = false;
    }
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
  };
}
