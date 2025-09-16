<template>
  <button
    v-if="props.type != 'none'"
    class="choice-button"
    @click="handleClick"
  >
    {{ buttonText }}
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useComponentI18n } from "src/composables/useComponentI18n";
import {
  analysisActionButtonTranslations,
  type AnalysisActionButtonTranslations,
} from "./AnalysisActionButton.i18n";

const { t } = useComponentI18n<AnalysisActionButtonTranslations>(
  analysisActionButtonTranslations
);

const props = defineProps<{
  type: "learnMore" | "viewMore" | "none";
}>();

const emit = defineEmits<{
  actionClick: [];
}>();

const buttonText = computed(() => {
  return props.type === "learnMore" ? t("learnMore") : t("viewMore");
});

const handleClick = () => {
  emit("actionClick");
};
</script>

<style lang="scss" scoped>
.choice-button {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
  font-weight: var(--font-weight-medium);
  color: #6d6a74;
  border-radius: 4px;
  transition: background-color 0.2s;
  white-space: nowrap;
  height: 2rem;
  display: flex;
  align-items: center;

  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
}
</style>
