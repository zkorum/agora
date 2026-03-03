<template>
  <div class="report-section">
    <h2 class="section-title">
      <span :style="{ color: titleColor }">{{ title }}</span>
    </h2>
    <p v-if="subtitle" class="section-subtitle">{{ subtitle }}</p>

    <div v-if="items.length === 0" class="empty-state">
      {{ t("noItems") }}
    </div>

    <table v-else class="opinion-table">
      <thead>
        <tr>
          <th class="col-rank">#</th>
          <th class="col-statement">{{ t("statement") }}</th>
          <th class="col-vote">{{ t("overall") }} {{ totalParticipants }}</th>
          <th
            v-for="entry in clusterEntries"
            :key="entry.key"
            class="col-vote"
          >
            {{ formatClusterLabel(entry.key, false) }}
            {{ entry.cluster.numUsers }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(item, index) in items"
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
            v-for="entry in clusterEntries"
            :key="entry.key"
            class="col-vote"
          >
            <ReportVoteCell
              v-if="getClusterStats({ item, clusterKey: entry.key })"
              :num-agrees="getClusterStats({ item, clusterKey: entry.key })!.numAgrees"
              :num-disagrees="getClusterStats({ item, clusterKey: entry.key })!.numDisagrees"
              :num-passes="getClusterStats({ item, clusterKey: entry.key })!.numPasses"
              :num-users="getClusterStats({ item, clusterKey: entry.key })!.numUsers"
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
import { formatClusterLabel } from "src/utils/component/opinion";
import { computed } from "vue";

import {
  type ReportOpinionListTranslations,
  reportOpinionListTranslations,
} from "./ReportOpinionList.i18n";
import ReportVoteCell from "./ReportVoteCell.vue";

const props = defineProps<{
  title: string;
  subtitle?: string;
  titleColor: string;
  items: AnalysisOpinionItem[];
  clusters: Partial<PolisClusters>;
  totalParticipants: number;
}>();

const { t } = useComponentI18n<ReportOpinionListTranslations>(
  reportOpinionListTranslations,
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
  margin: 0 0 1.25rem 0;
  font-weight: normal;
}

.empty-state {
  font-size: 0.8rem;
  color: #9e9ba5;
  font-style: italic;
  padding: 0.5rem 0;
}

.opinion-table {
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
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    white-space: nowrap;
    border-bottom: 1px solid #e9e9f1;
  }
}

.col-rank {
  width: 2rem;
  text-align: center;
}

.cell-rank {
  color: #9e9ba5;
  font-weight: var(--font-weight-semibold);
  text-align: center;
}

.col-statement {
  width: 40%;
  padding-right: 2rem;
}

.cell-statement {
  color: #333238;
  line-height: 1.4;
}

.statement-text {
  display: -webkit-box;
  -webkit-line-clamp: 6;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 0.9rem;
}

.col-vote {
  min-width: 90px;
}
</style>
