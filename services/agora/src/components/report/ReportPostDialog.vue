<template>
  <div class="card">
    <div class="container">
      <div class="title">Please select a report reason:</div>

      <div class="reportReasonsFlex">
        <div
          v-for="reason in userReportReasonMapping"
          :key="reason.value"
          @click="selectedReason = reason.value"
        >
          <ZKButton
            :label="reason.label"
            :color="selectedReason == reason.value ? 'primary' : 'secondary'"
            :text-color="
              selectedReason == reason.value ? 'secondary' : 'primary'
            "
          />
        </div>
      </div>

      <div v-if="selectedReason" class="flaggingExplanation">
        <div class="title">
          Why are you flagging this conversation as {{ selectedReason }}?
        </div>

        <div>
          <q-input
            v-model="explanation"
            :maxlength="MAX_LENGTH_USER_REPORT_EXPLANATION"
            outlined
            autogrow
          />
        </div>

        <div class="submitButtons">
          <div>
            <ZKButton
              label="Submit"
              :disable="!selectedReason"
              color="secondary"
              text-color="primary"
              @click="clickedSubmitButton()"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { userReportReasonMapping } from "src/utils/component/userReports";
import { ref } from "vue";
import ZKButton from "../ui-library/ZKButton.vue";
import type { UserReportReason } from "src/shared/types/zod";
import { MAX_LENGTH_USER_REPORT_EXPLANATION } from "src/shared/shared";
import { useBackendReportApi } from "src/utils/api/report";

const props = defineProps<{
  postSlugId: string;
}>();

const explanation = ref("");
const selectedReason = ref<UserReportReason>();

const { createUserReportByPostSlugId } = useBackendReportApi();

function clickedSubmitButton() {
  if (selectedReason.value) {
    createUserReportByPostSlugId(
      props.postSlugId,
      selectedReason.value,
      explanation.value
    );
  }
}
</script>

<style lang="scss" scoped>
.container {
  width: calc(min(30rem, 100vw) - 5rem);
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding: 2rem;
}

.card {
  background-color: white;
}

.reportReasonsFlex {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.submitButtons {
  display: flex;
  justify-content: end;
  gap: 1rem;
}

.label {
  padding: 1rem;
}

.title {
  font-size: 1rem;
}

.flaggingExplanation {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
