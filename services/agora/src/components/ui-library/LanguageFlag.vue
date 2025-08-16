<template>
  <div class="language-flag-container">
    <span
      v-if="flagMapping"
      :class="['fi', `fi-${flagMapping.flagCode}`, 'language-flag']"
      :title="flagAltText"
      role="img"
      :aria-label="flagAltText"
    ></span>
    <div v-else class="language-flag-placeholder">
      <ZKIcon name="mdi-earth" size="1.2rem" color="#666" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { getLanguageByCode } from "src/utils/language";
import type { AllLanguageCodes } from "src/shared/languages";
import ZKIcon from "src/components/ui-library/ZKIcon.vue";

interface Props {
  languageCode: AllLanguageCodes;
  size?: string;
}

const props = withDefaults(defineProps<Props>(), {
  size: "1.5rem",
});

// Computed properties
const languageMetadata = computed(() => getLanguageByCode(props.languageCode));

const flagMapping = computed(() => {
  const metadata = languageMetadata.value;
  if (!metadata?.flagCode) return null;
  return {
    flagCode: metadata.flagCode,
    flagName: metadata.flagCountryName || metadata.englishName,
  };
});

const flagAltText = computed(() => {
  const mapping = flagMapping.value;
  if (!mapping) return `Language: ${props.languageCode}`;
  return `Flag of ${mapping.flagName}`;
});
</script>

<style scoped lang="scss">
.language-flag-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: v-bind(size);
  height: calc(v-bind(size) * 0.75); // Maintain 4:3 aspect ratio
  flex-shrink: 0;
}

.language-flag {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 2px;
  border: 1px solid #e5e7eb;
}

.language-flag-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
  border-radius: 2px;
  border: 1px solid #e5e7eb;
}
</style>
