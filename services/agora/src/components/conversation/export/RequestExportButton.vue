<template>
  <div class="request-section">
    <PrimeButton
      :label="t('requestNewExport')"
      icon="pi pi-download"
      :disabled="disabled"
      @click="handleClick"
    />
  </div>
</template>

<script setup lang="ts">
import Button from "primevue/button";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";

import {
  type RequestExportButtonTranslations,
  requestExportButtonTranslations,
} from "./RequestExportButton.i18n";

defineOptions({
  components: {
    PrimeButton: Button,
  },
});

withDefaults(defineProps<Props>(), {
  disabled: false,
});

const emit = defineEmits<{
  request: [];
}>();

interface Props {
  disabled?: boolean;
}

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
