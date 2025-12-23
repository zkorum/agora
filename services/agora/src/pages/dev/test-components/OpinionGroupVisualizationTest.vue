<template>
  <PrimeCard class="test-section-card">
    <template #title>
      <div class="section-header">
        <i class="pi pi-chart-bar section-icon"></i>
        <span>{{ t("opinionGroupVisualization") }}</span>
      </div>
    </template>
    <template #content>
      <p class="section-description">
        {{ t("opinionGroupVisualizationDescription") }}
      </p>

      <div class="button-container">
        <PrimeButton
          :label="t('openVisualizationButton')"
          icon="pi pi-eye"
          class="test-button"
          @click="navigateToVisualization"
        />
      </div>
    </template>
  </PrimeCard>
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useRouter } from "vue-router";

import {
  type OpinionGroupVisualizationTestTranslations,
  opinionGroupVisualizationTestTranslations,
} from "./OpinionGroupVisualizationTest.i18n";

const { t } = useComponentI18n<OpinionGroupVisualizationTestTranslations>(
  opinionGroupVisualizationTestTranslations
);

const router = useRouter();

function navigateToVisualization(): void {
  void router.push("/dev/opinion-group-visualization");
}
</script>

<style scoped lang="scss">
.test-section-card {
  margin-bottom: 2rem;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
  font-weight: var(--font-weight-semibold);

  .section-icon {
    color: $primary;
  }
}

.section-description {
  margin: 0 0 2rem 0;
  color: $grey-8;
  font-size: 1rem;
  line-height: 1.5;
}

.button-container {
  display: flex;
  justify-content: center;
}
</style>
