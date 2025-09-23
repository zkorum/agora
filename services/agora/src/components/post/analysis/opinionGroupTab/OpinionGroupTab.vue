<template>
  <div>
    <AnalysisSectionWrapper>
      <template #header>
        <AnalysisTitleHeader
          :show-star-in-title="false"
          :title="t('groupsTitle')"
        >
          <template #action-button>
            <ZKButton
              button-type="icon"
              aria-label="Information about opinion groups"
              @click="showClusterInformation = true"
            >
              <ZKIcon
                color="#6d6a74"
                name="mdi-information-outline"
                size="1.2rem"
              />
            </ZKButton>
          </template>
        </AnalysisTitleHeader>
      </template>

      <template #body>
        <EmptyStateMessage
          v-if="Object.keys(props.clusters).length <= 1"
          :message="t('notEnoughGroupsMessage')"
        />
        <ClusterVisualization
          v-else
          :clusters="props.clusters"
          :total-participant-count="props.totalParticipantCount"
          :current-cluster-tab="currentClusterTab"
          @update:current-cluster-tab="currentClusterTab = $event"
        />

        <template v-if="Object.keys(props.clusters).length > 1">
          <OpinionGroupSelector
            v-if="drawerBehavior == 'desktop'"
            :cluster-metadata-list="props.clusters"
            :selected-cluster-key="currentClusterTab"
            @changed-cluster-key="currentClusterTab = $event"
          />

          <GroupConsensusSummary
            v-if="currentAiSummary"
            :summary="currentAiSummary"
            :selected-cluster-key="currentClusterTab"
          />

          <OpinionGroupComments
            :conversation-slug-id="props.conversationSlugId"
            :item-list="
              props.clusters[currentClusterTab]?.representative ??
              ([] as OpinionItem[])
            "
            :current-cluster-tab="currentClusterTab"
            :has-ungrouped-participants="hasUngroupedParticipants"
            @update:current-cluster-tab="currentClusterTab = $event"
          />
        </template>
      </template>
    </AnalysisSectionWrapper>

    <ClusterInformationDialog v-model="showClusterInformation" />
  </div>
</template>

<script setup lang="ts">
import type {
  OpinionItem,
  PolisClusters,
  PolisKey,
} from "src/shared/types/zod";
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import ClusterVisualization from "./ClusterVisualization.vue";
import OpinionGroupSelector from "./OpinionGroupSelector.vue";
import GroupConsensusSummary from "./GroupConsensusSummary.vue";
import OpinionGroupComments from "./OpinionGroupComments.vue";
import AnalysisTitleHeader from "../common/AnalysisTitleHeader.vue";
import AnalysisSectionWrapper from "../common/AnalysisSectionWrapper.vue";
import EmptyStateMessage from "../common/EmptyStateMessage.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  opinionGroupTabTranslations,
  type OpinionGroupTabTranslations,
} from "./OpinionGroupTab.i18n";
import ClusterInformationDialog from "./ClusterInformationDialog.vue";
import ZKIcon from "src/components/ui-library/ZKIcon.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { useNavigationStore } from "src/stores/navigation";

const props = defineProps<{
  conversationSlugId: string;
  clusters: Partial<PolisClusters>;
  totalParticipantCount: number;
}>();

const { t } = useComponentI18n<OpinionGroupTabTranslations>(
  opinionGroupTabTranslations
);

const { drawerBehavior } = storeToRefs(useNavigationStore());

const hasUngroupedParticipants = computed(() => {
  if (Object.keys(props.clusters).length === 0) {
    return false;
  }
  const totalGroupParticipants = Object.values(props.clusters).reduce(
    (sum, cluster) => sum + cluster.numUsers,
    0
  );
  return props.totalParticipantCount > totalGroupParticipants;
});

const currentClusterTab = ref<PolisKey>("0");
const showClusterInformation = ref(false);

const currentAiSummary = computed(() => {
  if (currentClusterTab.value in props.clusters) {
    return props.clusters[currentClusterTab.value]?.aiSummary;
  }
  return undefined;
});
</script>
