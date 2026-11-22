<template>
  <section class="qv-analysis">
    <h2>{{ t("analysisTitle") }}</h2>
    <p v-if="!isClosed">{{ t("analysisOpen") }}</p>
    <p v-else-if="conversationSlugId === undefined">
      {{ t("analysisUnavailable") }}
    </p>
    <p v-else-if="accessRevoked" role="alert">{{ t("analysisUnavailable") }}</p>
    <template v-else-if="ready !== undefined">
      <ClosedAnalysisInputControl
        v-if="ready.closedAnalysisSelection !== undefined"
        :selection="ready.closedAnalysisSelection"
        :can-switch="canSwitch"
        :saving="saving"
        :save-failed="saveFailed"
        @select-mode="selectMode"
      />
      <p>
        {{
          t("basedOnParticipants", {
            count: numbers.integer(ready.participantCount),
          })
        }}
      </p>
      <p v-if="ready.participantCount === 0">{{ t("analysisEmpty") }}</p>
      <ol v-else class="qv-results">
        <li
          v-for="item in ready.items"
          :key="item.itemSlugId"
          :value="item.rank"
          class="qv-result"
        >
          <bdi class="qv-rank">#{{ numbers.integer(item.rank) }}</bdi>
          <div>
            <QvResultItemContent
              :conversation-slug-id="conversationSlugId"
              :item-slug-id="item.itemSlugId"
              :display-content="item.displayContent"
            />
            <p>
              {{ t("netVotes", { count: numbers.integer(item.netUnits) }) }}
            </p>
            <p>
              {{
                t("supportVotes", { count: numbers.integer(item.supportUnits) })
              }}
              ·
              {{
                t("oppositionVotes", {
                  count: numbers.integer(item.oppositionUnits),
                })
              }}
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
      :label="t('backToItems')"
      severity="secondary"
      outlined
      @click="onViewItems()"
    />
  </section>
</template>

<script setup lang="ts">
import { useQueryClient } from "@tanstack/vue-query";
import { isAxiosError } from "axios";
import ClosedAnalysisInputControl from "src/components/post/analysis/common/ClosedAnalysisInputControl.vue";
import { useClosedAnalysisSelection } from "src/composables/conversation/useClosedAnalysisSelection";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useDisplayNumbers } from "src/i18n/numberFormats";
import { useQvResults } from "src/utils/api/post/useQvResults";
import { computed } from "vue";

import QvResultItemContent from "./QvResultItemContent.vue";
import { qvVotingTranslations } from "./QvVoting.i18n";

const props = defineProps<{
  conversationSlugId: string | undefined;
  isClosed: boolean;
  canEditConversation: boolean;
  onViewItems: () => void;
}>();
const { query, ready } = useQvResults(() => props.conversationSlugId);
const queryClient = useQueryClient();
const { canSwitch, saving, saveFailed, selectMode } =
  useClosedAnalysisSelection({
    slug: () => props.conversationSlugId,
    selection: () => ready.value?.closedAnalysisSelection,
    canEdit: () => props.isClosed && props.canEditConversation,
    refresh: async (slug) => {
      const filter = { queryKey: ["qv-results", slug] };
      await queryClient.cancelQueries(filter);
      await queryClient.invalidateQueries(filter);
    },
  });
const accessRevoked = computed(
  () =>
    isAxiosError<unknown>(query.error.value) &&
    query.error.value.response !== undefined &&
    [401, 403, 404, 410].includes(query.error.value.response.status)
);
const numbers = useDisplayNumbers();
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
</style>
