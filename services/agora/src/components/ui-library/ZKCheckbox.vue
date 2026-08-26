<template>
  <div class="zk-checkbox">
    <q-checkbox
      v-model="checked"
      color="primary"
      :disable="disabled"
      v-bind="requiredAttributes"
      :aria-describedby="description === undefined ? undefined : descriptionId"
    >
      <ZKFieldLabel
        :label="label"
        :required="required"
        :required-text="undefined"
      />
    </q-checkbox>
    <small v-if="description !== undefined" :id="descriptionId">{{
      description
    }}</small>
  </div>
</template>

<script setup lang="ts">
import { computed, useId } from "vue";

import ZKFieldLabel from "./ZKFieldLabel.vue";

const props = defineProps<{
  label: string;
  description: string | undefined;
  required: boolean;
  disabled: boolean;
}>();

const checked = defineModel<boolean>({ required: true });
const descriptionId = `zk-checkbox-description-${useId()}`;
const requiredAttributes = computed(() =>
  props.required ? { "aria-required": "true" } : {}
);
</script>

<style scoped lang="scss">
.zk-checkbox {
  display: grid;
  gap: 0.2rem;

  small {
    padding-inline-start: 2.5rem;
    color: $grey-7;
    line-height: 1.4;
  }

  :deep(.q-checkbox__label) {
    line-height: 1.4;
  }
}
</style>
