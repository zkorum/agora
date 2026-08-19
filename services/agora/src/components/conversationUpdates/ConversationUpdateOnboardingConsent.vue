<template>
  <ZKCheckbox
    v-model="checked"
    :label="checkboxLabel"
    description="You can change this anytime in email settings."
    :required="false"
  />
</template>

<script setup lang="ts">
import ZKCheckbox from "src/components/ui-library/ZKCheckbox.vue";
import { computed } from "vue";

const props = defineProps<{
  scopeKind: "no-project" | "project";
}>();

const checked = defineModel<boolean>({ required: true });

const checkboxLabel = computed(() =>
  props.scopeKind === "project"
    ? "Email me occasional updates about this project"
    : "Email me occasional updates about this conversation"
);
</script>
