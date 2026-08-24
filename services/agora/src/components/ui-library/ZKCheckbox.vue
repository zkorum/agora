<template>
  <div class="zk-checkbox">
    <q-checkbox
      v-model="checked"
      color="primary"
      :disable="disabled"
      :aria-describedby="description === undefined ? undefined : descriptionId"
    >
      <span>
        {{ label }}
        <span v-if="required" aria-hidden="true" class="required-marker"
          >*</span
        >
        <span v-if="required" class="visually-hidden"> Required.</span>
      </span>
    </q-checkbox>
    <small v-if="description !== undefined" :id="descriptionId">{{
      description
    }}</small>
  </div>
</template>

<script setup lang="ts">
import { useId } from "vue";

defineProps<{
  label: string;
  description: string | undefined;
  required: boolean;
  disabled: boolean;
}>();

const checked = defineModel<boolean>({ required: true });
const descriptionId = `zk-checkbox-description-${useId()}`;
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

  .required-marker {
    margin-inline-start: 0.15rem;
    color: $negative;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
}
</style>
