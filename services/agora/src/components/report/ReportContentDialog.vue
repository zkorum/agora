<template>
  <div class="card">
    <div v-if="!selectedReason" class="container">
      <div class="title">{{ t("submitReportTitle") }}</div>

      <div>
        {{
          t("improveCommunityText").replace(
            "{reportType}",
            getTranslatedReportType(reportType)
          )
        }}
      </div>

      <div class="reportReasonsFlex">
        <div
          v-for="reason in userReportReasonMapping"
          :key="reason.value"
          @click="selectedReason = reason.value"
        >
          <PrimeButton severity="secondary" outlined class="reason-button">
            <div class="iconLayout">
              <div>
                <q-icon :name="reason.icon" size="1.5rem" />
              </div>

              <div>
                {{ reason.label }}
              </div>
            </div>
          </PrimeButton>
        </div>
      </div>
    </div>

    <div v-if="selectedReason" class="container">
      <div v-if="selectedReason" class="flaggingExplanation">
        <div class="title">{{ t("thanksForFeedbackTitle") }}</div>

        <div>
          {{
            t("flaggingReasonText")
              .replace("{reportType}", getTranslatedReportType(reportType))
              .replace("{selectedReason}", getTranslatedSelectedReason())
          }}
        </div>

        <div>
          <!-- @vue-expect-error Quasar q-input types modelValue as string | number | null -->
          <q-input
            v-model="explanation"
            :maxlength="MAX_LENGTH_USER_REPORT_EXPLANATION"
            outlined
            autogrow
            :label="t('addExplanationLabel')"
          />
        </div>

        <div class="submitButtons">
          <div v-if="enabledSkip == false">
            <ZKGradientButton
              :label="t('skipButton')"
              variant="text"
              label-color="#666666"
              @click="clickedSkipExplanationButton()"
            />
          </div>

          <div>
            <ZKGradientButton
              :label="t('submitButton')"
              :disabled="explanation.length == 0 && !enabledSkip"
              @click="clickedSubmitButton()"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from "primevue/button";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { MAX_LENGTH_USER_REPORT_EXPLANATION } from "src/shared/shared";
import type { UserReportReason } from "src/shared/types/zod";
import { useBackendReportApi } from "src/utils/api/report";
import { useUserReports } from "src/utils/component/userReports";
import { ref } from "vue";

import ZKGradientButton from "../ui-library/ZKGradientButton.vue";
import {
  type ReportContentDialogTranslations,
  reportContentDialogTranslations,
} from "./ReportContentDialog.i18n";

defineOptions({
  components: {
    PrimeButton: Button,
  },
});

const props = defineProps<{
  reportType: "conversation" | "opinion";
  opinionSlugId: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

const explanation = ref("");
const selectedReason = ref<UserReportReason>();

const enabledSkip = ref(false);

const { createUserReportByPostSlugId, createUserReportByCommentSlugId } =
  useBackendReportApi();

const { t } = useComponentI18n<ReportContentDialogTranslations>(
  reportContentDialogTranslations
);

const userReportReasonMapping = useUserReports();

function getTranslatedReportType(
  reportType: "conversation" | "opinion"
): string {
  return reportType === "conversation"
    ? t("reportTypeConversation")
    : t("reportTypeOpinion");
}

function getTranslatedSelectedReason(): string {
  if (!selectedReason.value) return "";

  const reasonMapping = userReportReasonMapping.find(
    (mapping) => mapping.value === selectedReason.value
  );

  return reasonMapping?.label || selectedReason.value;
}

async function clickedSkipExplanationButton() {
  explanation.value = "";
  await clickedSubmitButton();
}

async function clickedSubmitButton() {
  if (selectedReason.value) {
    if (props.reportType == "conversation") {
      const isSuccessful = await createUserReportByPostSlugId(
        props.opinionSlugId,
        selectedReason.value,
        explanation.value
      );

      if (isSuccessful) {
        emit("close");
      }
    } else {
      const isSuccessful = await createUserReportByCommentSlugId(
        props.opinionSlugId,
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
  font-weight: var(--font-weight-medium);
}

.flaggingExplanation {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.iconLayout {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  min-width: 5rem;
}

.reason-button {
  min-height: 80px;
  min-width: 120px;
  border-radius: 12px;
}
</style>
