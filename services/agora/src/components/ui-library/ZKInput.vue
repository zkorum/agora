<template>
  <q-input
    v-model="model"
    :label="label"
    :label-slot="required"
    :required="required"
  >
    <template v-if="required" #label>
      <ZKFieldLabel :label="label" required :required-text="undefined" />
    </template>
  </q-input>
</template>

<script setup lang="ts">
import ZKFieldLabel from "./ZKFieldLabel.vue";

defineProps<{ label: string; required: boolean }>();
const model = defineModel<string | number | null>({ required: true });
</script>
