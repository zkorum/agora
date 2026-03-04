<template>
  <div class="report-section">
    <h2 v-if="!singleClusterKey" class="section-title">{{ t("title") }}</h2>

    <div
      v-for="entry in clusterEntriesWithRepresentative"
      :key="entry.key"
      class="group-section"
    >
      <h2 class="section-title">
        <span class="group-name">
          <template v-if="useLetterCodes">
            {{ formatClusterLabel(entry.key, false) }}<template v-if="entry.cluster.aiLabel"> · {{ entry.cluster.aiLabel }}</template>
          </template>
          <template v-else>
            {{ entry.cluster.aiLabel || formatClusterLabel(entry.key, true) }}
          </template>
        </span>
        <span class="group-meta">
          — {{ entry.cluster.numUsers }} {{ t("participants") }}
          ({{ formatPercentage(calculatePercentage(entry.cluster.numUsers, totalParticipantCount)) }})
        </span>
      </h2>
      <p class="group-subtitle">{{ t("groupSubtitle") }}</p>

      <slot name="after-subtitle" />

      <table class="opinion-table">
        <thead>
          <tr>
            <th class="col-rank">#</th>
            <th class="col-statement">{{ t("statement") }}</th>
            <th class="col-vote">{{ t("overall") }} ({{ totalParticipantCount }})</th>
            <th
              v-for="clusterEntry in allClusterEntries"
              :key="clusterEntry.key"
              class="col-vote"
              :class="{ 'col-vote--highlighted': clusterEntry.key === entry.key }"
            >
              <template v-if="useLetterCodes">
                {{ formatClusterLabel(clusterEntry.key, false) }} ({{ clusterEntry.cluster.numUsers }})
              </template>
              <template v-else>
                {{ clusterEntry.cluster.aiLabel || formatClusterLabel(clusterEntry.key, true) }}
                ({{ clusterEntry.cluster.numUsers }})
              </template>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(item, index) in entry.representativeItems"
            :key="item.opinionSlugId"
          >
            <td class="col-rank cell-rank">{{ index + 1 }}</td>
            <td class="col-statement cell-statement">
              <div class="statement-text">
                <ZKHtmlContent
                  :html-body="item.opinion"
                  :compact-mode="false"
                  :enable-links="false"
                />
              </div>
            </td>
            <td class="col-vote">
              <ReportVoteCell
                :num-agrees="item.numAgrees"
                :num-disagrees="item.numDisagrees"
                :num-passes="item.numPasses"
                :num-users="item.numParticipants"
              />
            </td>
            <td
              v-for="clusterEntry in allClusterEntries"
              :key="clusterEntry.key"
              class="col-vote"
              :class="{ 'col-vote--highlighted': clusterEntry.key === entry.key }"
            >
              <ReportVoteCell
                v-if="getClusterStats({ item, clusterKey: clusterEntry.key })"
                :num-agrees="getClusterStats({ item, clusterKey: clusterEntry.key })!.numAgrees"
                :num-disagrees="getClusterStats({ item, clusterKey: clusterEntry.key })!.numDisagrees"
                :num-passes="getClusterStats({ item, clusterKey: clusterEntry.key })!.numPasses"
                :num-users="getClusterStats({ item, clusterKey: clusterEntry.key })!.numUsers"
              />
              <ReportVoteCell
                v-else
                :num-agrees="0"
                :num-disagrees="0"
                :num-passes="0"
                :num-users="0"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="clusterEntriesWithRepresentative.length === 0" class="empty-state">
      {{ t("noStatements") }}
    </div>
  </div>
</template>

<script setup lang="ts">
import ZKHtmlContent from "src/components/ui-library/ZKHtmlContent.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type {
  AnalysisOpinionItem,
  ClusterStats,
  PolisClusters,
  PolisKey,
} from "src/shared/types/zod";
import { calculatePercentage } from "src/shared/util";
import { formatPercentage } from "src/utils/common";
import { formatClusterLabel } from "src/utils/component/opinion";
import { REPORT_MAX_REPRESENTATIVE_ITEMS } from "src/utils/component/report/reportData";
import { computed } from "vue";

import {
  type ReportRepresentativeOpinionsTranslations,
  reportRepresentativeOpinionsTranslations,
} from "./ReportRepresentativeOpinions.i18n";
import ReportVoteCell from "./ReportVoteCell.vue";

const props = defineProps<{
  clusters: Partial<PolisClusters>;
  totalParticipantCount: number;
  singleClusterKey?: PolisKey;
}>();

const { t } = useComponentI18n<ReportRepresentativeOpinionsTranslations>(
  reportRepresentativeOpinionsTranslations,
);

type ClusterValue = NonNullable<PolisClusters[PolisKey]>;

const allClusterEntries = computed(() => {
  const entries: Array<{ key: PolisKey; cluster: ClusterValue }> = [];
  for (const [key, cluster] of Object.entries(props.clusters)) {
    if (cluster) {
      entries.push({ key: key as PolisKey, cluster });
    }
  }
  return entries;
});

const useLetterCodes = computed(() => allClusterEntries.value.length >= 4);

const clusterEntriesWithRepresentative = computed(() => {
  const entries = props.singleClusterKey
    ? allClusterEntries.value.filter((e) => e.key === props.singleClusterKey)
    : allClusterEntries.value;

  return entries
    .map((entry) => ({
      ...entry,
      representativeItems: entry.cluster.representative.slice(
        0,
        REPORT_MAX_REPRESENTATIVE_ITEMS,
      ),
    }))
    .filter((entry) => entry.representativeItems.length > 0);
});

function getClusterStats({
  item,
  clusterKey,
}: {
  item: AnalysisOpinionItem;
  clusterKey: PolisKey;
}): ClusterStats | undefined {
  return item.clustersStats.find((s) => s.key === clusterKey);
}
</script>

<style lang="scss" scoped>
.report-section {
  page-break-inside: avoid;
  break-inside: avoid;
}

.section-title {
  font-size: 1rem;
  font-weight: var(--font-weight-medium);
  color: #333238;
  margin: 0 0 0.25rem 0;
}

.empty-state {
  font-size: 0.8rem;
  color: #9e9ba5;
  font-style: italic;
  padding: 0.5rem 0;
}

.group-section {
  margin-bottom: 1.5rem;
}

.group-name {
  font-weight: var(--font-weight-semibold);
  color: #333238;
}

.group-meta {
  font-size: 0.85rem;
  color: #6d6a74;
  font-weight: normal;
}

.group-subtitle {
  font-size: 0.85rem;
  color: #6d6a74;
  margin: 0 0 1rem 0;
  font-weight: normal;
}

.opinion-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  font-size: 0.85rem;

  th,
  td {
    padding: 0.35rem 0.4rem;
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

.col-rank {
  width: 2rem;
  text-align: center;
  white-space: nowrap;
}

.cell-rank {
  color: #9e9ba5;
  font-weight: var(--font-weight-semibold);
  text-align: center;
}

.col-statement {
  width: 250px;
  padding-right: 0.5rem;
}

.cell-statement {
  color: #333238;
  line-height: 1.3;
}

.statement-text {
  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 0.85rem;
  word-break: break-word;
}

.col-vote {
  padding-left: 0.15rem;
  padding-right: 0.15rem;

  &--highlighted {
    background-color: #f8f7ff;
  }
}
</style>
