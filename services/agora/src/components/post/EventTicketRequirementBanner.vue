<template>
  <div v-if="props.requiresEventTicket" class="ticket-requirement-banner">
    <!-- Zupass iframe container - NOT inside q-dialog since Parcnet creates its own dialog -->
    <!-- The Parcnet dialog has its own overlay and modal behavior -->
    <div ref="zupassIframeContainer" class="zupass-iframe-container"></div>

    <!-- Compact inline banner -->
    <div :class="['compact-banner', bannerClass]">
      <div class="banner-left">
        <q-icon :name="bannerIcon" size="sm" />
        <span class="banner-text">{{ compactBannerText }}</span>
      </div>

      <!-- Not verified, error, or verifying state - show button (only in interactive mode) -->
      <ZKButton
        v-if="verificationState !== 'verified' && !props.readOnly"
        button-type="compactButton"
        :label="buttonLabel"
        color="primary"
        :disable="verificationState === 'verifying'"
        class="banner-button"
        @click.stop="handleVerify"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import type { EventSlug } from "src/shared/types/zod";
import { useZupassVerification } from "src/composables/zupass/useZupassVerification";
import { useBackendZupassApi } from "src/utils/api/zupass";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useNotify } from "src/utils/ui/notify";
import {
  eventTicketRequirementBannerTranslations,
  type EventTicketRequirementBannerTranslations,
} from "./EventTicketRequirementBanner.i18n";
import { getZupassEventConfig } from "src/shared/zupass/eventConfig";
import { useUserStore } from "src/stores/user";
import { useAuthenticationStore } from "src/stores/authentication";
import { useBackendAuthApi } from "src/utils/api/auth";
import { useQuasar } from "quasar";
import { getPlatform } from "src/utils/common";
import ZKButton from "src/components/ui-library/ZKButton.vue";

const props = defineProps<{
  requiresEventTicket?: EventSlug;
  readOnly: boolean;
}>();

const emit = defineEmits<{
  verified: [payload: { userIdChanged: boolean; needsCacheRefresh: boolean }];
}>();

const { t } = useComponentI18n<EventTicketRequirementBannerTranslations>(
  eventTicketRequirementBannerTranslations
);

const { isVerifying, zupassIframeContainer, requestTicketProof } =
  useZupassVerification();

const { verifyEventTicket } = useBackendZupassApi();
const { showNotifyMessage } = useNotify();
const { updateAuthState } = useBackendAuthApi();
const authStore = useAuthenticationStore();
const userStore = useUserStore();

// Get platform at setup level (can't call useQuasar in async functions)
const $q = useQuasar();
const platform = getPlatform($q.platform);

type VerificationState = "not_verified" | "verifying" | "verified" | "error";
const verificationState = ref<VerificationState>("not_verified");
const errorMessage = ref<string | null>(null);

// Get event display name from shared config
const eventName = computed(() => {
  if (props.requiresEventTicket) {
    try {
      const config = getZupassEventConfig(props.requiresEventTicket);
      return config.displayName;
    } catch {
      return props.requiresEventTicket;
    }
  }
  return "";
});

const bannerClass = computed(() => {
  // In read-only mode, always show the requirement style
  if (props.readOnly) {
    return "banner-requirement";
  }

  // In interactive mode, show status-based style
  switch (verificationState.value) {
    case "verified":
      return "banner-verified";
    case "error":
      return "banner-error";
    case "verifying":
      return "banner-verifying";
    case "not_verified":
      return "banner-requirement";
    default:
      verificationState.value satisfies never;
      throw new Error("Unexpected verification state");
  }
});

const bannerIcon = computed(() => {
  // In read-only mode, always show the requirement icon
  if (props.readOnly) {
    return "verified_user";
  }

  // In interactive mode, show status-based icon
  switch (verificationState.value) {
    case "verified":
      return "check_circle";
    case "error":
      return "error";
    case "verifying":
      return "sync";
    case "not_verified":
      return "verified_user";
    default:
      verificationState.value satisfies never;
      throw new Error("Unexpected verification state");
  }
});

const compactBannerText = computed(() => {
  // In read-only mode, always show simple requirement message
  if (props.readOnly) {
    return t("verifyButtonRequirement").replace("{eventName}", eventName.value);
  }

  // In interactive mode, show verification status
  switch (verificationState.value) {
    case "verified":
      return t("ticketVerified").replace("{eventName}", eventName.value);
    case "error":
      return errorMessage.value || t("errorUnknown");
    case "verifying":
      return t("verifyButtonRequirement").replace(
        "{eventName}",
        eventName.value
      );
    case "not_verified":
      return t("verifyButtonRequirement").replace(
        "{eventName}",
        eventName.value
      );
    default:
      verificationState.value satisfies never;
      throw new Error("Unexpected verification state");
  }
});

const buttonLabel = computed(() => {
  return verificationState.value === "verifying"
    ? t("verifyingButton")
    : t("verifyButton");
});

// Check if ticket is already verified on mount
onMounted(() => {
  if (
    props.requiresEventTicket &&
    userStore.isTicketVerified(props.requiresEventTicket)
  ) {
    verificationState.value = "verified";
  }
});

async function handleVerify() {
  verificationState.value = "verifying";
  errorMessage.value = null;
  isVerifying.value = true;

  try {
    console.log("[EventTicketRequirementBanner] Starting verification flow");

    // Request proof from Zupass (Parcnet creates its own dialog)
    const proofResult = await requestTicketProof({
      eventSlug: props.requiresEventTicket!,
      platform,
    });

    console.log("[EventTicketRequirementBanner] Proof result:", proofResult);

    if (!proofResult.success) {
      // Handle cancellation gracefully - don't show error
      if (proofResult.error === "cancelled") {
        verificationState.value = "not_verified";
        return;
      }

      const message = getErrorMessage(proofResult.error || "unknown");
      verificationState.value = "error";
      errorMessage.value = message;
      showNotifyMessage(message);
      return;
    }

    // Send GPC proof to backend for verification
    console.log("[EventTicketRequirementBanner] Sending proof to backend...");
    const verifyResult = await verifyEventTicket({
      proof: proofResult.proof!,
      eventSlug: props.requiresEventTicket!,
    });

    console.log(
      "[EventTicketRequirementBanner] Backend verification result:",
      verifyResult
    );

    if (verifyResult.success) {
      verificationState.value = "verified";

      // Check if userId changed (account merge) or stayed same (just verified ticket)
      const currentUserId = authStore.userId;
      const newUserId = verifyResult.userId;

      // Update auth state with deferred cache operations to avoid clearing cache immediately
      // This ensures conversation/opinion data remains cached and visible
      const { needsCacheRefresh } = await updateAuthState({
        partialLoginStatus: { isKnown: true, userId: newUserId },
        deferCacheOperations: true,
      });

      // Add verified ticket to user store immediately to unlock gated content
      userStore.addVerifiedTicket(props.requiresEventTicket);

      // Show appropriate message based on account state
      if (verifyResult.accountMerged) {
        showNotifyMessage(t("accountMerged"));
      } else {
        showNotifyMessage(
          t("ticketVerified").replace("{eventName}", eventName.value)
        );
      }

      // Emit verified event with flags for parent to handle cache refresh
      // needsCacheRefresh indicates a new guest was created and cache should be refreshed after data reload
      emit("verified", {
        userIdChanged: currentUserId !== newUserId,
        needsCacheRefresh,
      });
    } else {
      const message = getErrorMessage(verifyResult.reason || "unknown");
      verificationState.value = "error";
      errorMessage.value = message;
      showNotifyMessage(message);
      console.error(
        "[EventTicketRequirementBanner] Verification failed:",
        verifyResult.reason
      );
    }
  } catch (err) {
    console.error("[EventTicketRequirementBanner] Verification error:", err);
    const message =
      err instanceof Error ? err.message : getErrorMessage("unknown");
    verificationState.value = "error";
    errorMessage.value = message;
    showNotifyMessage(message);
    console.error("[EventTicketRequirementBanner] Error details:", err);
  } finally {
    isVerifying.value = false;
  }
}

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
</script>

<style scoped lang="scss">
.ticket-requirement-banner {
  margin-top: 0.3rem;
  position: relative;
}

.zupass-iframe-container {
  // Empty container - Parcnet will inject iframe and dialog
  // Dialog is positioned fixed with its own backdrop, doesn't need special styling here
}

.compact-banner {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.3rem 0.5rem;
  border-radius: 5px;
  font-size: 0.75rem;
  gap: 0.5rem;
  line-height: 1.3;
  border: 1px solid;
  max-width: 100%;

  &.banner-requirement {
    background-color: #f0f7ff;
    border-color: #90caf9;
    color: #1565c0;
  }

  &.banner-verifying {
    background-color: #f0f7ff;
    border-color: #90caf9;
    color: #1565c0;
  }

  &.banner-verified {
    background-color: #f1f8f4;
    border-color: #81c784;
    color: #2e7d32;
  }

  &.banner-error {
    background-color: #ffebee;
    border-color: #ef9a9a;
    color: #c62828;
  }

  @media (max-width: 599px) {
    font-size: 0.7rem;
    padding: 0.25rem 0.4rem;
    gap: 0.3rem;
  }
}

.banner-left {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex: 1;
  min-width: 0;

  @media (max-width: 599px) {
    gap: 0.3rem;
  }
}

.banner-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.banner-button {
  flex-shrink: 0;

  // Override compactButton padding on mobile - always show padding
  :deep(.compactButtonPadding) {
    padding-left: 0.6rem !important;
    padding-right: 0.6rem !important;
  }

  // Match button font size with banner text
  :deep(.q-btn__content) {
    font-size: 0.75rem;

    @media (max-width: 599px) {
      font-size: 0.7rem;
    }
  }
}
</style>
