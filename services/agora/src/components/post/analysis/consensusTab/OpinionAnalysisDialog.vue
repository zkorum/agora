<template>
  <div>
    <q-dialog v-model="showDialog">
      <div class="dialog-container">
        <div class="dialog-header">
          <div class="dialog-title">{{ t("title") }}</div>
          <ZKButton button-type="icon" icon="mdi-close" size="1rem" @click="showDialog = false" />
        </div>

        <div class="dialog-content">
          <OpinionIdentityCard :author-verified="false" :created-at="opinionItem.createdAt"
            :user-identity="opinionItem.username" :show-verified-text="false" :organization-image-url="''"
            :is-seed="opinionItem.isSeed" />

          <div class="opinion-text">
            <ZKHtmlContent :html-body="opinionItem.opinion" :compact-mode="false" :enable-links="true" />
          </div>

          <div class="opinion-stats">
            <table class="stats-table">
              <thead>
                <tr>
                  <th></th>
                  <th class="agree-header">{{ t("agree") }}</th>
                  <th class="pass-header">{{ t("pass") }}</th>
                  <th class="disagree-header">{{ t("disagree") }}</th>
                </tr>
              </thead>
              <tbody>
                <tr class="total-row">
                  <td class="group-name">
                    {{
                      `${t("total")} (${formatAmount(props.opinionItem.numParticipants)})`
                    }}
                  </td>
                  <td class="agree-cell">
                    {{ props.opinionItem.numAgrees }} •
                    {{
                      formatPercentage(
                        calculatePercentage(
                          props.opinionItem.numAgrees,
                          props.opinionItem.numParticipants
                        )
                      )
                    }}
                  </td>
                  <td class="pass-cell">
                    {{ props.opinionItem.numPasses }} •
                    {{
                      formatPercentage(
                        calculatePercentage(
                          props.opinionItem.numPasses,
                          props.opinionItem.numParticipants
                        )
                      )
                    }}
                  </td>
                  <td class="disagree-cell">
                    {{ props.opinionItem.numDisagrees }} •
                    {{
                      formatPercentage(
                        calculatePercentage(
                          props.opinionItem.numDisagrees,
                          props.opinionItem.numParticipants
                        )
                      )
                    }}
                  </td>
                </tr>
                <template v-if="shouldShowGroupStats">
                  <tr v-if="noGroupStats.numUsers > 0" class="no-group-row">
                    <td class="group-name">
                      {{ `${t("noGroup")} (${noGroupStats.numUsers})` }}
                    </td>
                    <td class="agree-cell">
                      {{ noGroupStats.numAgrees }} •
                      {{
                        formatPercentage(
                          calculatePercentage(
                            noGroupStats.numAgrees,
                            noGroupStats.numUsers
                          )
                        )
                      }}
                    </td>
                    <td class="pass-cell">
                      {{ noGroupStats.numPasses }} •
                      {{
                        formatPercentage(
                          calculatePercentage(
                            noGroupStats.numPasses,
                            noGroupStats.numUsers
                          )
                        )
                      }}
                    </td>
                    <td class="disagree-cell">
                      {{ noGroupStats.numDisagrees }} •
                      {{
                        formatPercentage(
                          calculatePercentage(
                            noGroupStats.numDisagrees,
                            noGroupStats.numUsers
                          )
                        )
                      }}
                    </td>
                  </tr>
                  <tr v-for="(group, index) in opinionItem.clustersStats" :key="index">
                    <td class="group-name">
                      {{
                        `${formatClusterLabel(group.key, true, group.aiLabel)} (${formatAmount(group.numUsers)})`
                      }}
                    </td>
                    <td class="agree-cell">
                      {{ group.numAgrees }} •
                      {{
                        formatPercentage(
                          calculatePercentage(group.numAgrees, group.numUsers)
                        )
                      }}
                    </td>
                    <td class="pass-cell">
                      {{ group.numPasses }} •
                      {{
                        formatPercentage(
                          calculatePercentage(group.numPasses, group.numUsers)
                        )
                      }}
                    </td>
                    <td class="disagree-cell">
                      {{ group.numDisagrees }} •
                      {{
                        formatPercentage(
                          calculatePercentage(
                            group.numDisagrees,
                            group.numUsers
                          )
                        )
                      }}
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>

          <!-- TODO: ACCESSIBILITY - Change <div> to <button> element for keyboard accessibility -->
          <!-- View original comment link should be keyboard accessible for users with motor disabilities -->
          <div class="view-original" @click="viewOriginalComment">
            {{ t("viewOriginal") }}
          </div>
        </div>
      </div>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ZKHtmlContent from "src/components/ui-library/ZKHtmlContent.vue";
import OpinionIdentityCard from "src/components/post/comments/OpinionIdentityCard.vue";
import type { OpinionItem } from "src/shared/types/zod";
import { formatClusterLabel } from "src/utils/component/opinion";
import { calculatePercentage } from "src/shared/common/util";
import { formatAmount, formatPercentage } from "src/utils/common";
import { useRouterNavigation } from "src/utils/router/navigation";
import { computed } from "vue";
import { useComponentI18n } from "src/composables/useComponentI18n";
import {
  opinionAnalysisDialogTranslations,
  type OpinionAnalysisDialogTranslations,
} from "./OpinionAnalysisDialog.i18n";

const props = defineProps<{
  conversationSlugId: string;
  opinionItem: OpinionItem;
}>();

const { forceOpenComment } = useRouterNavigation();

const { t } = useComponentI18n<OpinionAnalysisDialogTranslations>(
  opinionAnalysisDialogTranslations
);

const showDialog = defineModel<boolean>({ required: true });

const noGroupStats = computed(() => {
  const totalClusteredAgrees = props.opinionItem.clustersStats.reduce(
    (sum, cluster) => sum + cluster.numAgrees,
    0
  );
  const totalClusteredDisagrees = props.opinionItem.clustersStats.reduce(
    (sum, cluster) => sum + cluster.numDisagrees,
    0
  );
  const totalClusteredPasses = props.opinionItem.clustersStats.reduce(
    (sum, cluster) => sum + cluster.numPasses,
    0
  );
  const totalClusteredUsers = props.opinionItem.clustersStats.reduce(
    (sum, cluster) => sum + cluster.numUsers,
    0
  );

  const noGroupAgrees = props.opinionItem.numAgrees - totalClusteredAgrees;
  const noGroupDisagrees =
    props.opinionItem.numDisagrees - totalClusteredDisagrees;
  const noGroupPasses = props.opinionItem.numPasses - totalClusteredPasses;
  const noGroupUsers = props.opinionItem.numParticipants - totalClusteredUsers;

  return {
    numAgrees: noGroupAgrees,
    numDisagrees: noGroupDisagrees,
    numPasses: noGroupPasses,
    numUsers: noGroupUsers,
  };
});

const shouldShowGroupStats = computed(() => {
  return props.opinionItem.clustersStats.length > 1;
});

async function viewOriginalComment() {
  await forceOpenComment(
    props.conversationSlugId,
    props.opinionItem.opinionSlugId
  );
  showDialog.value = false;
  // Add the routing later
}
</script>

<style lang="scss" scoped>
.dialog-container {
  display: flex;
  flex-direction: column;
  background-color: white;
  border-radius: 25px;
  width: min(100vw, 30rem);
  max-height: 80vh;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  background-color: white;
  padding: 1.5rem 1.5rem 0 1.5rem;
  border-radius: 25px 25px 0 0;
}

.dialog-title {
  font-size: 1.5rem;
  font-weight: 500;
}

.dialog-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
  padding-top: 1rem;
  overflow-y: auto;
  flex: 1;
}

.opinion-text {
  font-size: 1rem;
  line-height: 1.5;
}

.opinion-stats {
  width: 100%;
}

.stats-table {
  width: 100%;
  border-collapse: collapse;
}

.stats-table th,
.stats-table td {
  padding: 0.75rem 1rem;
  text-align: right;
}

/* Apply border to all rows in tbody, but only for the 2nd and 3rd columns */
.stats-table tbody tr td:not(:first-child) {
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.group-name {
  font-weight: 500;
  max-width: 40%;
}

.agree-header,
.agree-cell {
  color: #6b4eff;
}

.pass-header,
.pass-cell {
  color: #6d6a74;
}

.disagree-header,
.disagree-cell {
  color: #a05e03;
}

.view-original {
  color: #6d6a74;
  font-weight: 500;
  text-align: center;
  cursor: pointer;
  padding: 0.5rem;
  margin-top: 0.5rem;
}
</style>
