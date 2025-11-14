<template>
  <q-dialog v-model="showWarning" persistent>
    <q-card class="embedded-warning-card">
      <q-card-section class="warning-content">
        <!-- Title -->
        <h3 class="warning-title">{{ t("title") }}</h3>

        <!-- Message (context) -->
        <p class="warning-message">
          {{
            appName
              ? t("message").replace("{app}", appName)
              : t("messageGeneric")
          }}
        </p>

        <!-- Instructions (primary content) -->
        <div class="instructions-box">
          <div class="instructions-title">{{ t("instructionsTitle") }}</div>
          <ol class="instructions-list">
            <li>{{ t("instructionStep1") }}</li>
            <li>{{ t("instructionStep2") }}</li>
            <li>{{ t("instructionStep3") }}</li>
          </ol>
        </div>
      </q-card-section>

      <!-- Actions (sticky footer) -->
      <q-card-actions class="warning-actions">
        <div class="primary-actions">
          <!-- PRIMARY: Copy URL (most helpful) -->
          <PrimeButton
            :label="copied ? t('urlCopied') : t('copyUrl')"
            severity="primary"
            outlined
            :icon="copied ? 'pi pi-check' : 'pi pi-copy'"
            class="full-width"
            :disabled="copied"
            @click="copyUrl"
          />

          <!-- SECONDARY: Continue Anyway (discouraged) -->
          <PrimeButton
            :label="t('continueAnyway')"
            severity="secondary"
            outlined
            class="full-width"
            @click="continueAnyway"
          />
        </div>

        <!-- DANGER: Report False Positive -->
        <PrimeButton
          :label="t('notInAppBrowser')"
          severity="danger"
          text
          size="small"
          class="full-width"
          @click="reportFalsePositive"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { storeToRefs } from "pinia";
import { useEmbeddedBrowserWarningStore } from "src/stores/embeddedBrowserWarning";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useNotify } from "src/utils/ui/notify";
import { embeddedBrowserWarningTranslations } from "./EmbeddedBrowserWarningDialog.i18n";

const { t } = useComponentI18n(embeddedBrowserWarningTranslations);
const { showNotifyMessage } = useNotify();

const store = useEmbeddedBrowserWarningStore();
const { showWarning, appName } = storeToRefs(store);
const { closeWarning, reportFalsePositive: reportFalsePositiveStore } = store;

const copied = ref(false);

async function copyUrl() {
  try {
    await navigator.clipboard.writeText(window.location.href);
    copied.value = true;
    showNotifyMessage(t("urlCopiedNotification"));

    setTimeout(() => {
      copied.value = false;
    }, 3000);
  } catch (err) {
    console.error("[EmbeddedBrowserWarning] Failed to copy URL:", err);
    showNotifyMessage(t("copyFailedNotification"));
  }
}

function continueAnyway() {
  console.log("[EmbeddedBrowserWarning] User chose to continue anyway");
  closeWarning();
}

function reportFalsePositive() {
  console.log("[EmbeddedBrowserWarning] User reported false positive");
  reportFalsePositiveStore();
}
</script>

<style scoped lang="scss">
.embedded-warning-card {
  max-width: 500px;
  width: 90vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  overflow: hidden;
}

.warning-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  text-align: center;
  overflow-y: auto;
  flex: 1;
  padding: 1.5rem;
}

.warning-title {
  margin: 0;
  font-size: 1.375rem;
  font-weight: var(--font-weight-bold);
  color: $color-text-strong;
  text-align: center;
}

.warning-message {
  margin: 0;
  font-size: 0.9375rem;
  line-height: 1.6;
  text-align: center;
  color: $color-text-weak;
}

.instructions-box {
  background: linear-gradient(135deg, #f8f9fa 0%, #f0f1f3 100%);
  border-radius: 12px;
  padding: 1.5rem;
  text-align: left;
  border: 1px solid #e8e9eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.instructions-title {
  font-weight: var(--font-weight-bold);
  margin-bottom: 1rem;
  font-size: 1.0625rem;
  color: $color-text-strong;
}

.instructions-list {
  margin: 0;
  padding-left: 1.5rem;

  li {
    margin-bottom: 0.875rem;
    line-height: 1.7;
    font-size: 0.9375rem;
    color: $color-text-strong;

    &:last-child {
      margin-bottom: 0;
    }
  }
}

.warning-actions {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.25rem 1.5rem;
  border-top: 1px solid #e8e9eb;
  background-color: #fafbfc;

  .primary-actions {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .full-width {
    width: 100%;
  }
}
</style>
