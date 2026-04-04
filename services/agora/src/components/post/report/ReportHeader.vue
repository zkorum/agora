<template>
  <div class="report-header">
    <div class="header-top">
      <div class="branding">Agora Citizen Network</div>
      <div class="stats-row">
        <div class="stat-item">
          <span class="stat-value">
            {{ formatAmount(participantCount) }}<span v-if="totalParticipantCount > participantCount" class="stat-of"> {{ t("of") }} {{ formatAmount(totalParticipantCount) }}*</span>
          </span>
          <span class="stat-label">{{ t("participants") }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">
            {{ formatAmount(opinionCount) }}<span v-if="totalOpinionCount > opinionCount" class="stat-of"> {{ t("of") }} {{ formatAmount(totalOpinionCount) }}*</span>
          </span>
          <span class="stat-label">{{ t("statements") }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">
            {{ formatAmount(voteCount) }}<span v-if="totalVoteCount > voteCount" class="stat-of"> {{ t("of") }} {{ formatAmount(totalVoteCount) }}*</span>
          </span>
          <span class="stat-label">{{ t("votes") }}</span>
        </div>
      </div>
    </div>

    <h1 class="conversation-title">{{ conversationTitle }}</h1>

    <div class="meta-row">
      <span v-if="authorUsername">{{ t("by") }} {{ authorUsername }}</span>
      <span class="separator">·</span>
      <span>{{ formattedDate }}</span>
    </div>

    <div v-if="hasModeration" class="footnote">
      * {{ t("footnote") }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  localizedDateTimeFormatOptions,
  useLocalizedDateTimeFormatter,
} from "src/composables/ui/useLocalizedDateTime";
import { formatAmount } from "src/utils/common";
import { computed } from "vue";

import {
  type ReportHeaderTranslations,
  reportHeaderTranslations,
} from "./ReportHeader.i18n";

const props = defineProps<{
  conversationTitle: string;
  authorUsername: string;
  createdAt: string | Date;
  participantCount: number;
  opinionCount: number;
  voteCount: number;
  totalParticipantCount: number;
  totalOpinionCount: number;
  totalVoteCount: number;
}>();

const { t } = useComponentI18n<ReportHeaderTranslations>(
  reportHeaderTranslations,
);

const formatReportDate = useLocalizedDateTimeFormatter({
  options: localizedDateTimeFormatOptions.longDate,
});

const hasModeration = computed(
  () =>
    props.totalParticipantCount > props.participantCount ||
    props.totalOpinionCount > props.opinionCount ||
    props.totalVoteCount > props.voteCount,
);

const formattedDate = computed(() => {
  return formatReportDate(props.createdAt);
});
</script>

<style lang="scss" scoped>
.report-header {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e9e9f1;
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1.5rem;
  margin-bottom: 1.25rem;
}

.branding {
  font-size: 0.75rem;
  color: #9e9ba5;
  font-weight: var(--font-weight-medium);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.conversation-title {
  font-size: 1.4rem;
  font-weight: var(--font-weight-bold);
  color: #333238;
  margin: 0 0 0.375rem 0;
  line-height: 1.3;
}

.meta-row {
  font-size: 0.85rem;
  color: #6d6a74;

  .separator {
    margin: 0 0.375rem;
  }
}

.stats-row {
  display: flex;
  gap: 1.5rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  white-space: nowrap;
}

.stat-value {
  display: inline-flex;
  align-items: baseline;
  font-size: 1rem;
  font-weight: var(--font-weight-semibold);
  color: #333238;
}

.stat-of {
  margin-left: 0.25em;
  font-size: 0.8rem;
  font-weight: var(--font-weight-regular);
  color: #b8b5bf;
}

.stat-label {
  font-size: 0.7rem;
  color: #9e9ba5;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.footnote {
  margin-top: 0.75rem;
  font-size: 0.75rem;
  color: #9e9ba5;
  line-height: 1.4;
}
</style>
