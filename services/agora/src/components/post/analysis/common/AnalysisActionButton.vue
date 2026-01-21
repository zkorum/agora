<template>
  <button
    v-if="props.type === 'learnMore' || props.type === 'viewMore'"
    class="choice-button"
    @click="handleClick"
  >
    {{ buttonText }}
  </button>

  <ZKButton
    v-else-if="props.type === 'informationIcon'"
    button-type="icon"
    :aria-label="t('informationIconAriaLabel')"
    @click="handleClick"
  >
    <ZKIcon color="#6d6a74" name="mdi-information-outline" size="1.2rem" />
  </ZKButton>
</template>

<script setup lang="ts">
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ZKIcon from "src/components/ui-library/ZKIcon.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { computed } from "vue";

import {
  type AnalysisActionButtonTranslations,
  analysisActionButtonTranslations,
} from "./AnalysisActionButton.i18n";

const props = defineProps<{
  type: "learnMore" | "viewMore" | "informationIcon" | "none";
}>();

const emit = defineEmits<{
  actionClick: [];
}>();

const { t } = useComponentI18n<AnalysisActionButtonTranslations>(
  analysisActionButtonTranslations
);

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
