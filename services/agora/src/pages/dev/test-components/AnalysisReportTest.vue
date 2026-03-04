<template>
  <PrimeCard class="test-section-card">
    <template #title>
      <div class="section-header">
        <i class="pi pi-file section-icon"></i>
        <span>{{ t("analysisReportTest") }}</span>
      </div>
    </template>
    <template #content>
      <p class="section-description">
        {{ t("analysisReportTestDescription") }}
      </p>

      <div class="button-container">
        <PrimeButton
          :label="t('openReportTestButton')"
          icon="pi pi-eye"
          class="test-button"
          @click="navigateToReportTest"
        />
      </div>
    </template>
  </PrimeCard>
</template>

<script setup lang="ts">
import Button from "primevue/button";
import Card from "primevue/card";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useRouter } from "vue-router";

import {
  type AnalysisReportTestTranslations,
  analysisReportTestTranslations,
} from "./AnalysisReportTest.i18n";

defineOptions({
  components: {
    PrimeButton: Button,
    PrimeCard: Card,
  },
});

const { t } = useComponentI18n<AnalysisReportTestTranslations>(
  analysisReportTestTranslations,
);

const router = useRouter();

function navigateToReportTest(): void {
  void router.push("/dev/analysis-report-test");
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
