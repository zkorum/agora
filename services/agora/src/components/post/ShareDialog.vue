<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="share-dialog-card">
      <q-btn
        icon="close"
        flat
        round
        dense
        class="close-button"
        @click="onDialogCancel"
      />

      <div class="dialog-content">
        <div class="qr-code-container">
          <img v-if="qrCodeDataUrl" :src="qrCodeDataUrl" alt="QR Code" />
        </div>

        <q-btn
          no-caps
          class="copy-button"
          @click="copyUrl"
        >
          <div class="flex items-center no-wrap">
            <div>Copy link to conversation</div>
          </div>
        </q-btn>
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent, useQuasar, copyToClipboard } from "quasar";
import QRCode from "qrcode";
import { ref, onMounted } from "vue";

const props = defineProps<{
  url: string;
  title: string;
}>();

defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide, onDialogCancel } = useDialogPluginComponent();
const $q = useQuasar();

const qrCodeDataUrl = ref("");

onMounted(async () => {
  try {
    qrCodeDataUrl.value = await QRCode.toDataURL(props.url, {
      width: 218,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#0000", // Transparent background
      },
    });
  } catch (err) {
    console.error(err);
  }
});

function copyUrl() {
  copyToClipboard(props.url)
    .then(() => {
      $q.notify({
        message: "Copied to clipboard!",
        color: "positive",
        position: "top",
        icon: "check",
      });
    })
    .catch(() => {
      $q.notify({
        message: "Could not copy to clipboard.",
        color: "negative",
        position: "top",
        icon: "warning",
      });
    });
}
</script>

<style scoped lang="scss">
.share-dialog-card {
  width: 428px;
  height: 450px;
  border-radius: 32px;
  background: linear-gradient(114.81deg, #f1eeff 46.45%, #e8f1ff 100.1%);
  padding: 24px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.close-button {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 48px;
  height: 48px;
  border-radius: 16px;
  background-color: rgba(0, 0, 0, 0.05);
}

.dialog-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
  flex-grow: 1; /* Allow container to grow */
  justify-content: center; /* Center content vertically */
}


.qr-code-container {
  width: 218px;
  height: 218px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.copy-button {
  width: 241px;
  height: 48px;
  border-radius: 16px;
  background: linear-gradient(180deg, #6b4eff 30.96%, #4f92f6 99.99%);
  color: white;
  font-family: "Albert Sans", sans-serif;
  font-weight: 500;
  font-size: 16px; // Adjusted to fit better
  line-height: 24px;
}
</style>