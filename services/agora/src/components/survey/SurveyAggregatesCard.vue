<template>
  <ZKCard padding="1rem" class="aggregates-card">
    <div class="aggregates-card__title">{{ t("title") }}</div>

    <div v-if="!hasSurvey" class="aggregates-card__empty">{{ t("noSurvey") }}</div>

    <div v-else class="aggregates-card__meta">
      <div>{{ t("accessLevel", { level: accessLevel }) }}</div>
      <div>{{ t("rowsLabel", { count: rows.length }) }}</div>
    </div>

    <div v-if="hasSurvey && rows.length === 0" class="aggregates-card__empty">{{ t("noRows") }}</div>

    <div v-else class="aggregates-list">
      <div v-for="(row, index) in rows" :key="index" class="aggregate-row">
        <div class="aggregate-row__scope">
          {{ row.scope === "overall" ? t("overallScope") : t("clusterScope", { label: row.clusterLabel }) }}
        </div>
        <div>{{ row.question }}</div>
        <div>{{ row.option }}</div>
        <div>
          <span v-if="row.isSuppressed">{{ t("suppressed") }}</span>
          <span v-else>{{ row.count ?? 0 }} / {{ row.percentage ?? 0 }}%</span>
        </div>
      </div>
    </div>
  </ZKCard>
</template>

<script setup lang="ts">
import ZKCard from "src/components/ui-library/ZKCard.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { SurveyAggregateRow, SurveyResultsAccessLevel } from "src/shared/types/zod";

import {
  type SurveyAggregatesCardTranslations,
  surveyAggregatesCardTranslations,
} from "./SurveyAggregatesCard.i18n";

defineProps<{
  hasSurvey: boolean;
  accessLevel: SurveyResultsAccessLevel;
  rows: readonly SurveyAggregateRow[];
}>();

const { t } = useComponentI18n<SurveyAggregatesCardTranslations>(
  surveyAggregatesCardTranslations
);
</script>

<style scoped lang="scss">
.aggregates-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.aggregates-card__title {
  font-size: 1rem;
  font-weight: 600;
}

.aggregates-card__meta,
.aggregate-row {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.aggregates-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.aggregate-row {
  background: #f9fafb;
  border-radius: 12px;
  padding: 0.75rem;
}

.aggregate-row__scope,
.aggregates-card__empty {
  color: #6b7280;
}
</style>
