<template>
  <ZKCard
    v-if="isVisible"
    padding="1rem"
    class="opinion-not-found-banner"
    role="alert"
    aria-live="polite"
  >
    <div class="banner-container">
      <div class="banner-main-content">
        <div class="banner-icon">
          <q-icon name="mdi-alert-circle" size="1.5rem" color="orange" />
        </div>
        <div class="banner-content">
          <div class="banner-message">
            {{ t("requestedOpinionNotFound") }}
          </div>
          <div v-if="opinionId" class="banner-opinion-id">
            {{ t("opinionId") }}:
            <code class="opinion-id-code">{{ opinionId }}</code>
          </div>
        </div>
      </div>
      <div class="banner-actions">
        <PrimeButton
          severity="secondary"
          :label="t('dismiss')"
          :aria-label="t('dismissBannerAriaLabel')"
          class="dismiss-button"
          @click="handleDismiss"
        />
      </div>
    </div>
  </ZKCard>
</template>

<script setup lang="ts">
import Button from "primevue/button";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";

import {
  type OpinionNotFoundBannerTranslations,
  opinionNotFoundBannerTranslations,
} from "./OpinionNotFoundBanner.i18n";

defineOptions({
  components: {
    PrimeButton: Button,
  },
});

defineProps<{
  isVisible: boolean;
  opinionId: string | null;
}>();

const emit = defineEmits<{
  dismiss: [];
}>();

const { t } = useComponentI18n<OpinionNotFoundBannerTranslations>(
  opinionNotFoundBannerTranslations
);

function handleDismiss(): void {
  emit("dismiss");
}
</script>

<style scoped lang="scss">
.opinion-not-found-banner {
  margin-bottom: 1rem;
  background: white;

  .banner-container {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }

  .banner-main-content {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    flex: 1;
  }

  .banner-icon {
    flex-shrink: 0;
    margin-top: 0.1rem;
  }

  .banner-content {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex: 1;
  }

  .banner-message {
    font-weight: var(--font-weight-semibold);
    font-size: 0.95rem;
    color: rgba(0, 0, 0, 0.87);
  }

  .banner-opinion-id {
    font-size: 0.85rem;
    color: rgba(0, 0, 0, 0.6);

    .opinion-id-code {
      background: rgba(0, 0, 0, 0.1);
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
      font-family: var(
        --q-font-family-monospace,
        "Monaco",
        "Menlo",
        "Ubuntu Mono",
        monospace
      );
      font-size: 0.8rem;
    }
  }

  .banner-actions {
    flex-shrink: 0;
  }

  // Enhanced focus styles for accessibility
  .dismiss-button:focus {
    outline: 2px solid $primary;
    outline-offset: 2px;
  }

  // Style the dismiss button to match the black text theme
  .dismiss-button {
    color: black !important;
    font-size: 0.8rem;
  }

  // Responsive adjustments
  @media (max-width: 600px) {
    .banner-container {
      flex-direction: column;
      align-items: stretch;
    }

    .banner-actions {
      align-self: flex-end;
    }

    .banner-content {
      font-size: 0.9rem;
    }

    .banner-opinion-id {
      font-size: 0.8rem;

      .opinion-id-code {
        font-size: 0.75rem;
        padding: 0.15rem 0.3rem;
      }
    }
  }
}

// High contrast mode support
@media (prefers-contrast: high) {
  .opinion-not-found-banner {
    .banner-opinion-id {
      color: currentColor;
    }

    .opinion-id-code {
      background: currentColor;
      color: white;
    }
  }
}

// Reduced motion preferences
@media (prefers-reduced-motion: reduce) {
  .opinion-not-found-banner {
    transition: none;
  }
}
</style>
