<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <div class="dialog-container">
      <div class="dialog-header">
        <ZKButton
          button-type="icon"
          icon="mdi-close"
          size="1rem"
          @click="onDialogCancel"
        />
      </div>

      <div class="dialog-content">
        <div class="qr-code-container">
          <img v-if="qrCodeDataUrl" :src="qrCodeDataUrl" alt="QR Code" />
        </div>

        <ZKButton button-type="largeButton" class="copy-link-button" @click="copyUrl">
          {{ t("copyLink") }}
        </ZKButton>
      </div>
    </div>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent, copyToClipboard } from "quasar";
import { useQRCode } from "@vueuse/integrations/useQRCode";
import { toRef } from "vue";
import { useNotify } from "src/utils/ui/notify";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import {
  shareDialogTranslations,
  type ShareDialogTranslations,
} from "./ShareDialog.i18n";

const props = defineProps<{
  url: string;
  title: string;
}>();

defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide, onDialogCancel } = useDialogPluginComponent();
const { showNotifyMessage } = useNotify();
const { t } = useComponentI18n<ShareDialogTranslations>(
  shareDialogTranslations
);

const qrCodeDataUrl = useQRCode(toRef(props, "url"), {
  width: 218,
  margin: 1,
  color: {
    dark: "#000000",
    light: "#0000",
  },
});

async function copyUrl(): Promise<void> {
  try {
    await copyToClipboard(props.url);
    showNotifyMessage(t("copiedToClipboard"));
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    showNotifyMessage(t("couldNotCopy"));
  }
}
</script>

<style scoped lang="scss">
.dialog-container {
  display: flex;
  flex-direction: column;
  background: linear-gradient(114.81deg, #f1eeff 46.45%, #e8f1ff 100.1%);
  border-radius: 25px;
  width: min(100vw, 428px);
  max-height: 80vh;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 1.5rem 1.5rem 0 1.5rem;
}

.dialog-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  padding: 1.5rem;
  padding-top: 1rem;
  overflow-y: auto;
  flex: 1;
  justify-content: center;
}

.qr-code-container {
  display: flex;
  align-items: center;
  justify-content: center;
}

.copy-link-button :deep(.q-btn) {
  width: 227px;
  height: 48px;
  background: $gradient-hero;
  color: white;
}

.copy-link-button :deep(.q-btn:hover) {
  background: $gradient-hover;
}

.copy-link-button :deep(.q-btn:active) {
  background: $gradient-pressed;
}
</style>