<template>
  <div class="report-section">
    <h2 class="section-title">{{ t("title") }}</h2>
    <p class="section-subtitle">{{ hasAiLabels ? t("subtitle") : t("subtitleNoAi") }}</p>

    <p v-if="isImbalanced && Object.keys(clusters).length > 1" class="imbalance-notice">
      {{ t("imbalanceNotice") }}
    </p>

    <div v-if="Object.keys(clusters).length <= 1" class="empty-state">
      {{ t("notEnoughGroups") }}
    </div>

    <table v-else class="groups-table">
      <thead>
        <tr>
          <th class="col-label">{{ t("label") }}</th>
          <th class="col-participants">{{ t("participants") }}</th>
          <th class="col-summary">{{ t("aiSummary") }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="entry in clusterEntries" :key="entry.key">
          <td class="col-label cell-label">
            <template v-if="useLetterCodes">
              <strong>{{ formatClusterLabel(entry.key, false) }}</strong><template v-if="entry.cluster.aiLabel"> · <strong>{{ entry.cluster.aiLabel }}</strong></template>
            </template>
            <template v-else>
              <strong>{{ entry.cluster.aiLabel || formatClusterLabel(entry.key, true) }}</strong>
            </template>
          </td>
          <td class="col-participants cell-participants">
            {{ entry.cluster.numUsers }}
            ({{ formatPercentage(calculatePercentage(entry.cluster.numUsers, totalParticipantCount)) }})
          </td>
          <td class="col-summary cell-summary">
            {{ entry.cluster.aiSummary || t("noSummary") }}
          </td>
        </tr>
        <tr>
          <td class="col-label cell-no-group">
            {{ t("noGroup") }}
          </td>
          <td class="col-participants cell-participants">
            {{ noGroupUsers }}
            ({{ formatPercentage(calculatePercentage(noGroupUsers, totalParticipantCount)) }})
          </td>
          <td class="col-summary cell-summary cell-no-group-summary">
            {{ t("noGroupExplanation", { minVotes: String(MIN_VOTES_FOR_CLUSTER) }) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { PolisClusters, PolisKey } from "src/shared/types/zod";
import { calculatePercentage } from "src/shared/util";
import { formatPercentage } from "src/utils/common";
import {
  formatClusterLabel,
  isClustersImbalanced,
  MIN_VOTES_FOR_CLUSTER,
} from "src/utils/component/opinion";
import { computed } from "vue";

import {
  type ReportGroupsTableTranslations,
  reportGroupsTableTranslations,
} from "./ReportGroupsTable.i18n";

const props = defineProps<{
  clusters: Partial<PolisClusters>;
  totalParticipantCount: number;
}>();

const { t } = useComponentI18n<ReportGroupsTableTranslations>(
  reportGroupsTableTranslations,
);

type ClusterValue = NonNullable<PolisClusters[PolisKey]>;

const clusterEntries = computed(() => {
  const entries: Array<{ key: PolisKey; cluster: ClusterValue }> = [];
  for (const [key, cluster] of Object.entries(props.clusters)) {
    if (cluster) {
      entries.push({ key: key as PolisKey, cluster });
    }
  }
  return entries;
});

const useLetterCodes = computed(() => clusterEntries.value.length >= 4);

const isImbalanced = computed(() => {
  const sizes = clusterEntries.value.map((entry) => entry.cluster.numUsers);
  return isClustersImbalanced(sizes);
});

const hasAiLabels = computed(() =>
  clusterEntries.value.some((entry) => Boolean(entry.cluster.aiLabel)),
);

const noGroupUsers = computed(() => {
  const clusteredUsers = clusterEntries.value.reduce(
    (sum, entry) => sum + entry.cluster.numUsers,
    0,
  );
  return Math.max(0, props.totalParticipantCount - clusteredUsers);
});
</script>

<style lang="scss" scoped>
.report-section {
  margin-bottom: 1.5rem;
  page-break-inside: avoid;
  break-inside: avoid;
}

.section-title {
  font-size: 1rem;
  font-weight: var(--font-weight-semibold);
  color: #333238;
  margin: 0 0 0.25rem 0;
}

.section-subtitle {
  font-size: 0.85rem;
  color: #6d6a74;
  margin: 0 0 0.75rem 0;
  font-weight: normal;
}

.imbalance-notice {
  font-size: 0.85rem;
  color: #6d6a74;
  margin: 0 0 0.75rem 0;
  font-style: italic;
}

.empty-state {
  font-size: 0.8rem;
  color: #9e9ba5;
  font-style: italic;
  padding: 0.5rem 0;
}

.groups-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;

  th,
  td {
    padding: 0.4rem 0.5rem;
    text-align: left;
    vertical-align: top;
    border-bottom: 1px solid #f0f0f5;
  }

  th {
    font-weight: var(--font-weight-semibold);
    color: #6d6a74;
    font-size: 0.6rem;
    letter-spacing: 0.01em;
    border-bottom: 1px solid #e9e9f1;
    word-break: break-word;
  }
}

.col-label {
  min-width: 200px;
}

.col-participants {
  white-space: nowrap;
}

.col-summary {
  width: 100%;
}

.cell-label {
  font-weight: var(--font-weight-semibold);
  color: #333238;
}

.cell-participants {
  color: #6d6a74;
  white-space: nowrap;
}

.cell-summary {
  color: #333238;
  line-height: 1.4;
}

.cell-no-group {
  color: #9e9ba5;
  font-style: italic;
}

.cell-no-group-summary {
  color: #9e9ba5;
}
</style>
