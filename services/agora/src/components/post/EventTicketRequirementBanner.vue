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
        v-if="verificationState.state !== 'verified' && !props.readOnly"
        button-type="compactButton"
        :label="buttonLabel"
        color="primary"
        :disable="verificationState.state === 'verifying'"
        class="banner-button"
        @click.stop="handleVerify"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { EventSlug } from "src/shared/types/zod";
import { useZupassVerification } from "src/composables/zupass/useZupassVerification";
import { useTicketVerificationFlow } from "src/composables/zupass/useTicketVerificationFlow";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  eventTicketRequirementBannerTranslations,
  type EventTicketRequirementBannerTranslations,
} from "./EventTicketRequirementBanner.i18n";
import { getZupassEventConfig } from "src/shared/zupass/eventConfig";
import { useUserStore } from "src/stores/user";
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

const { zupassIframeContainer } = useZupassVerification();
const { verifyTicket } = useTicketVerificationFlow();
const userStore = useUserStore();

// Get verification state from store
const verificationState = computed(() => {
  if (!props.requiresEventTicket) {
    return { state: 'not_verified' as const };
  }
  return userStore.getTicketVerificationState(props.requiresEventTicket);
});

const errorMessage = computed(() => {
  const state = verificationState.value;
  return state.state === 'error' ? state.errorMessage : null;
});

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
  const state = verificationState.value.state;
  if (state === "verified") return "banner-verified";
  if (state === "error") return "banner-error";
  if (state === "verifying") return "banner-verifying";
  return "banner-requirement"; // not_verified
});

const bannerIcon = computed(() => {
  // In read-only mode, always show the requirement icon
  if (props.readOnly) {
    return "verified_user";
  }

  // In interactive mode, show status-based icon
  const state = verificationState.value.state;
  if (state === "verified") return "check_circle";
  if (state === "error") return "error";
  if (state === "verifying") return "sync";
  return "verified_user"; // not_verified
});

const compactBannerText = computed(() => {
  // In read-only mode, always show simple requirement message
  if (props.readOnly) {
    return t("verifyButtonRequirement").replace("{eventName}", eventName.value);
  }

  // In interactive mode, show verification status
  const state = verificationState.value.state;
  if (state === "verified") {
    return t("ticketVerified").replace("{eventName}", eventName.value);
  }
  if (state === "error") {
    return errorMessage.value || t("errorUnknown");
  }
  // verifying or not_verified
  return t("verifyButtonRequirement").replace("{eventName}", eventName.value);
});

const buttonLabel = computed(() => {
  return verificationState.value.state === "verifying"
    ? t("verifyingButton")
    : t("verifyButton");
});

async function handleVerify() {
  if (!props.requiresEventTicket) return;

  await verifyTicket({
    eventSlug: props.requiresEventTicket,
    successMessage: t("ticketVerified").replace("{eventName}", eventName.value),
    onSuccess: (result) => {
      // Type narrowing: onSuccess is only called when result.success === true
      if (result.success) {
        // Emit verified event with flags for parent to handle cache refresh
        emit("verified", {
          userIdChanged: result.userIdChanged,
          needsCacheRefresh: result.needsCacheRefresh,
        });
      }
    },
  });
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
