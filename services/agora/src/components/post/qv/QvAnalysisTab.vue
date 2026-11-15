<template>
  <section class="qv-analysis">
    <h2>{{ t("analysisTitle") }}</h2>
    <p v-if="!isClosed">{{ t("analysisOpen") }}</p>
    <p v-else-if="conversationSlugId === undefined">
      {{ t("analysisUnavailable") }}
    </p>
    <p v-else-if="accessRevoked" role="alert">{{ t("analysisUnavailable") }}</p>
    <template v-else-if="ready !== undefined">
      <p>{{ t("basedOnParticipants", { count: ready.participantCount }) }}</p>
      <p v-if="ready.participantCount === 0">{{ t("analysisEmpty") }}</p>
      <ol v-else class="qv-results">
        <li
          v-for="item in ready.items"
          :key="item.itemSlugId"
          :value="item.rank"
          class="qv-result"
        >
          <span class="qv-rank">#{{ item.rank }}</span>
          <div>
            <div role="heading" aria-level="3" class="qv-result-title">
              <ZKHtmlContent
                :html-body="item.title"
                :compact-mode="false"
                :enable-links="false"
                content-role="title"
              />
            </div>
            <ZKHtmlContent
              v-if="item.body !== undefined"
              :html-body="item.body"
              :compact-mode="false"
              :enable-links="true"
              :collapsed-line-count="3"
              :desktop-collapsed-line-count="3"
            />
            <p>{{ t("netVotes", { count: item.netUnits }) }}</p>
            <p>
              {{ t("supportVotes", { count: item.supportUnits }) }} ·
              {{ t("oppositionVotes", { count: item.oppositionUnits }) }}
            </p>
          </div>
        </li>
      </ol>
    </template>
    <p v-else-if="query.isError.value" role="alert">
      {{ t("analysisUnavailable") }}
    </p>
    <p v-else-if="query.data.value?.status === 'failed'">
      {{ t("analysisFailed") }}
    </p>
    <p v-else role="status">{{ t("analysisCalculating") }}</p>
    <PrimeButton
      :label="t('backToStatements')"
      severity="secondary"
      outlined
      @click="onViewStatements()"
    />
  </section>
</template>

<script setup lang="ts">
import { isAxiosError } from "axios";
import ZKHtmlContent from "src/components/ui-library/ZKHtmlContent.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useQvResults } from "src/utils/api/post/useQvResults";
import { computed } from "vue";

import { qvVotingTranslations } from "./QvVoting.i18n";

const props = defineProps<{
  conversationSlugId: string | undefined;
  isClosed: boolean;
  onViewStatements: () => void;
}>();
const { query, ready } = useQvResults(() => props.conversationSlugId);
const accessRevoked = computed(
  () =>
    isAxiosError<unknown>(query.error.value) &&
    query.error.value.response !== undefined &&
    [401, 403, 404, 410].includes(query.error.value.response.status)
);
const { t } = useComponentI18n(qvVotingTranslations);
</script>

<style scoped lang="scss">
.qv-analysis {
  display: grid;
  justify-items: start;
  gap: 1rem;
  padding-block: 1.5rem;
  color: $ink-dark;
}
h2 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: var(--font-weight-semibold);
}
p {
  margin: 0;
  color: $ink-light;
}
.qv-results {
  display: grid;
  gap: 1rem;
  list-style: none;
  padding: 0;
  margin: 0;
  inline-size: 100%;
}
.qv-result {
  display: flex;
  gap: 1rem;
  padding-block: 1rem;
  border-block-start: 1px solid $ink-light;
}
.qv-rank {
  font-weight: var(--font-weight-semibold);
}
.qv-result-title {
  font-size: 1rem;
  margin-block-end: 0.5rem;
}
</style>
