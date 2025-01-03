<template>
  <div class="card">
    <div v-if="!selectedReason" class="container">
      <div class="title">Submit a report</div>

      <div>
        Thank you for helping us improve the community. What is the problem with
        this {{ reportType }}?
      </div>

      <div class="reportReasonsFlex">
        <div
          v-for="reason in userReportReasonMapping"
          :key="reason.value"
          @click="selectedReason = reason.value"
        >
          <ZKButton color="button-background-color" text-color="black">
            <div class="iconLayout">
              <div>
                <q-icon :name="reason.icon" />
              </div>

              <div>
                {{ reason.label }}
              </div>
            </div>
          </ZKButton>
        </div>
      </div>
    </div>

    <div v-if="selectedReason" class="container">
      <div v-if="selectedReason" class="flaggingExplanation">
        <div class="title">Thanks for your feedback!</div>

        <div>
          Why are you flagging this {{ reportType }} as {{ selectedReason }}?
        </div>

        <div>
          <q-input
            v-model="explanation"
            :maxlength="MAX_LENGTH_USER_REPORT_EXPLANATION"
            outlined
            autogrow
            label="Enter reason"
          />
        </div>

        <div class="submitButtons">
          <div v-if="enabledSkip == false">
            <ZKButton
              label="Skip"
              color="secondary"
              text-color="primary"
              flat
              @click="clickedSkipExplanationButton()"
            />
          </div>

          <div>
            <ZKButton
              label="Submit"
              :disable="explanation.length == 0 && !enabledSkip"
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
  reportType: "conversation" | "opinion";
  slugId: string;
}>();

const emit = defineEmits(["close"]);

const explanation = ref("");
const selectedReason = ref<UserReportReason>();

const enabledSkip = ref(false);

const { createUserReportByPostSlugId, createUserReportByCommentSlugId } =
  useBackendReportApi();

function clickedSkipExplanationButton() {
  explanation.value = "";
  clickedSubmitButton();
}

async function clickedSubmitButton() {
  if (selectedReason.value) {
    if (props.reportType == "conversation") {
      const isSuccessful = await createUserReportByPostSlugId(
        props.slugId,
        selectedReason.value,
        explanation.value
      );

      if (isSuccessful) {
        emit("close");
      }
    } else {
      const isSuccessful = await createUserReportByCommentSlugId(
        props.slugId,
        selectedReason.value,
        explanation.value
      );

      if (isSuccessful) {
        emit("close");
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.container {
  width: calc(min(30rem, 100vw) - 5rem);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
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
  gap: 1.5rem;
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
  font-size: 1.2rem;
  font-weight: 500;
}

.flaggingExplanation {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.iconLayout {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  align-items: center;
  justify-content: center;
  padding: 0.3rem;
  min-width: 5rem;
}
</style>
