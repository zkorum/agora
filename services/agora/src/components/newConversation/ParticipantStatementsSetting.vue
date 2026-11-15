<template>
  <section v-if="modelValue.supported" class="participant-statements-setting">
    <q-toggle
      :model-value="modelValue.enabled"
      :label="t('label')"
      :disable="disabled"
      @update:model-value="update"
    />
    <p>{{ t("help") }}</p>
  </section>
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { ParticipantStatements } from "src/shared/types/zod";

import { participantStatementsTranslations } from "./ParticipantStatements.i18n";
const props = defineProps<{
  modelValue: ParticipantStatements;
  disabled: boolean;
}>();
const emit = defineEmits<{
  "update:modelValue": [value: ParticipantStatements];
}>();
const { t } = useComponentI18n(participantStatementsTranslations);
function update(enabled: boolean): void {
  if (props.disabled || !props.modelValue.supported) return;
  emit("update:modelValue", { supported: true, enabled });
}
</script>

<style scoped lang="scss">
.participant-statements-setting {
  margin-block: 1rem;
}
p {
  margin: 0.5rem 0;
  color: $color-text-weak;
}
</style>
