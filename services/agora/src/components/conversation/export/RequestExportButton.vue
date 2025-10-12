<template>
  <div class="request-section">
    <PrimeButton
      :label="t('requestNewExport')"
      icon="pi pi-download"
      :loading="loading"
      :disabled="disabled"
      @click="handleClick"
    />
  </div>
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  requestExportButtonTranslations,
  type RequestExportButtonTranslations,
} from "./RequestExportButton.i18n";

interface Props {
  loading?: boolean;
  disabled?: boolean;
}

withDefaults(defineProps<Props>(), {
  loading: false,
  disabled: false,
});

const emit = defineEmits<{
  request: [];
}>();

const { t } = useComponentI18n<RequestExportButtonTranslations>(
  requestExportButtonTranslations
);

function handleClick(): void {
  emit("request");
}
</script>

<style scoped lang="scss">
.request-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
