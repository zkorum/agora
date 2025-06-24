<template>
  <div>
    <q-dialog v-model="showDialog">
      <div class="dialog-container">
        <div class="dialog-header">
          <div class="dialog-title">Opinion analysis</div>
          <ZKButton
            button-type="icon"
            icon="mdi-close"
            size="1rem"
            @click="showDialog = false"
          />
        </div>

        <UserIdentityCard
          :author-verified="false"
          :created-at="opinionData.createdAt"
          :user-identity="opinionData.username"
          :show-verified-text="false"
          :organization-image-url="''"
        />

        <div class="opinion-text">
          {{ opinionData.opinionText }}
        </div>

        <div class="opinion-stats">
          <table class="stats-table">
            <thead>
              <tr>
                <th></th>
                <th class="agree-header">Agree</th>
                <th class="disagree-header">Disagree</th>
              </tr>
            </thead>
            <tbody>
              <tr class="total-row">
                <td class="group-name">Total</td>
                <td class="agree-cell">
                  {{ totalAgree }} •
                  {{ calculatePercentage(totalAgree, totalVotes) }}%
                </td>
                <td class="disagree-cell">
                  {{ totalDisagree }} •
                  {{ calculatePercentage(totalDisagree, totalVotes) }}%
                </td>
              </tr>
              <tr v-for="(group, index) in opinionData.groups" :key="index">
                <td class="group-name">{{ group.name }}</td>
                <td class="agree-cell">
                  {{ group.agree }} •
                  {{
                    calculatePercentage(
                      group.agree,
                      group.agree + group.disagree
                    )
                  }}%
                </td>
                <td class="disagree-cell">
                  {{ group.disagree }} •
                  {{
                    calculatePercentage(
                      group.disagree,
                      group.agree + group.disagree
                    )
                  }}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="view-original" @click="viewOriginalComment">
          View original comment
        </div>
      </div>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { OpinionAnalysisData } from "src/utils/component/analysis/analysisTypes";
import UserIdentityCard from "src/components/features/user/UserIdentityCard.vue";

const props = defineProps<{
  opinionData: OpinionAnalysisData;
}>();

const showDialog = defineModel<boolean>({ required: true });

const totalAgree = computed(() => {
  return props.opinionData.groups.reduce((sum, group) => sum + group.agree, 0);
});

const totalDisagree = computed(() => {
  return props.opinionData.groups.reduce(
    (sum, group) => sum + group.disagree,
    0
  );
});

const totalVotes = computed(() => {
  return totalAgree.value + totalDisagree.value;
});

function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

function viewOriginalComment() {
  console.log("View original comment button clicked");
  // Add the routing later
}
</script>

<style lang="scss" scoped>
.dialog-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  background-color: white;
  border-radius: 25px;
  width: min(100vw, 30rem);
  padding: 1.5rem;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dialog-title {
  font-size: 1.5rem;
  font-weight: 500;
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
