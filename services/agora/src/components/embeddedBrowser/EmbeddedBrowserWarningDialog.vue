<template>
  <q-dialog v-model="showWarning" persistent>
    <q-card class="embedded-warning-card">
      <!-- Fixed Header -->
      <q-card-section class="warning-header">
        <!-- Title -->
        <h3 class="warning-title">
          {{
            appName
              ? t("title").replace("{app}", appName)
              : t("titleGeneric")
          }}
        </h3>

        <!-- Message (context) -->
        <p class="warning-message">
          {{ t("message") }}
        </p>
      </q-card-section>

      <!-- Scrollable Content -->
      <q-card-section class="warning-content">
        <!-- Instructions (always visible on non-Android, collapsible on Android) -->
        <div v-if="!isAndroid" class="instructions-box">
          <div class="instructions-title">{{ t("instructionsTitle") }}</div>
          <!-- iOS: Single step with compass icon -->
          <ol v-if="isIOS" class="instructions-list">
            <li>
              {{ t("instructionStep1iOS") }} <i class="pi pi-compass"></i>
            </li>
          </ol>
          <!-- Non-iOS: Full steps -->
          <ol v-else class="instructions-list">
            <li>{{ t("instructionStep1") }}</li>
            <li>{{ t("instructionStep2") }}</li>
            <li>{{ t("instructionStep3") }}</li>
          </ol>
        </div>

        <!-- Android: Collapsible instructions as backup -->
        <div v-else class="instructions-collapsible">
          <button
            class="instructions-toggle"
            @click="showInstructions = !showInstructions"
          >
            <span>{{ t("showManualInstructions") }}</span>
            <i
              :class="[
                'pi',
                showInstructions ? 'pi-chevron-up' : 'pi-chevron-down',
              ]"
            ></i>
          </button>
          <div v-if="showInstructions" class="instructions-box">
            <ol class="instructions-list">
              <li>{{ t("instructionStep1") }}</li>
              <li>{{ t("instructionStep2") }}</li>
              <li>{{ t("instructionStep3") }}</li>
            </ol>
          </div>
        </div>
      </q-card-section>

      <!-- Fixed Footer (Actions) -->
      <q-card-actions class="warning-actions">
        <div class="primary-actions">
          <!-- ANDROID ONLY: Retry automatic redirect (MOST PROMINENT) -->
          <PrimeButton
            v-if="isAndroid"
            :label="t('retryRedirect')"
            severity="primary"
            :icon="'pi pi-external-link'"
            class="full-width"
            size="small"
            @click="retryAndroidRedirect"
          />

          <!-- PRIMARY: Copy URL (helpful fallback) -->
          <PrimeButton
            :label="copied ? t('urlCopied') : t('copyUrl')"
            :severity="isAndroid ? 'secondary' : 'primary'"
            outlined
            :icon="copied ? 'pi pi-check' : 'pi pi-copy'"
            class="full-width"
            size="small"
            :disabled="copied"
            @click="copyUrl"
          />

          <!-- SECONDARY: Continue Anyway (discouraged) -->
          <PrimeButton
            :label="t('continueAnyway')"
            severity="secondary"
            outlined
            class="full-width"
            size="small"
            @click="continueAnyway"
          />
        </div>

        <!-- Report False Positive (discrete) -->
        <button class="false-positive-link" @click="reportFalsePositive">
          {{ t("notInAppBrowser") }}
        </button>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { storeToRefs } from "pinia";
import { Platform } from "quasar";
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
const showInstructions = ref(false);
const isAndroid = Platform.is.android;
const isIOS = Platform.is.ios;

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

function retryAndroidRedirect() {
  console.log("[EmbeddedBrowserWarning] User manually retrying Android Intent redirect");

  try {
    const url = new URL(window.location.href);
    const intentUrl = `intent://${url.host}${url.pathname}${url.search}${url.hash}#Intent;scheme=${url.protocol.replace(":", "")};S.browser_fallback_url=${encodeURIComponent(window.location.href)};end`;

    showNotifyMessage(t("retryingRedirect"));
    window.location.href = intentUrl;
  } catch (error) {
    console.error("[EmbeddedBrowserWarning] Failed to retry Android Intent redirect:", error);
    showNotifyMessage(t("redirectFailed"));
  }
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

.warning-header {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  text-align: center;
  padding: 1.25rem 1.5rem 0.75rem;
}

.warning-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 1.5rem 1rem;
  min-height: 0;
}

.warning-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: var(--font-weight-bold);
  color: $color-text-strong;
  text-align: center;
}

.warning-message {
  margin: 0;
  font-size: 0.9375rem;
  line-height: 1.5;
  text-align: center;
  color: $color-text-weak;
  opacity: 0.85;
}

.instructions-collapsible {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.instructions-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: transparent;
  border: 1px solid #e8e9eb;
  border-radius: 8px;
  color: $color-text-weak;
  font-size: 0.9375rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #f8f9fa;
    border-color: #d1d3d6;
  }

  i {
    font-size: 0.875rem;
  }
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
  font-size: 1.125rem;
  color: $color-text-strong;
}

.instructions-list {
  margin: 0;
  padding-left: 1.5rem;

  li {
    margin-bottom: 1rem;
    line-height: 1.7;
    font-size: 1.0625rem;
    color: $color-text-strong;

    &:last-child {
      margin-bottom: 0;
    }
  }
}

.warning-actions {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e8e9eb;
  background-color: #fafbfc;

  .primary-actions {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }

  .full-width {
    width: 100%;
  }
}

.false-positive-link {
  background: none;
  border: none;
  color: $color-text-weak;
  font-size: 0.8125rem;
  text-decoration: underline;
  cursor: pointer;
  padding: 0.5rem;
  text-align: center;
  transition: color 0.2s ease;

  &:hover {
    color: $color-text-strong;
  }
}
</style>
