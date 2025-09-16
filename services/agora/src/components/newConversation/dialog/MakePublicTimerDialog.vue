<template>
  <q-dialog v-model="showDialog" position="bottom">
    <ZKBottomDialogContainer>
      <div class="timer-options">
        <!-- TODO: ACCESSIBILITY - Change <div> to <button> element for keyboard accessibility -->
        <!-- Timer option selection should be keyboard accessible for users with motor disabilities -->
        <div
          v-for="(option, index) in timerOptions"
          :key="index"
          class="option-item"
          :class="{
            selected: isSelected(option),
            'custom-option': option.value === 'custom',
          }"
          @click="selectOption(option)"
        >
          <div class="option-header">{{ getTimerTitle(option.value) }}</div>
        </div>
      </div>
    </ZKBottomDialogContainer>
  </q-dialog>

  <CustomTimerDialog
    v-model:show-dialog="showCustomDialog"
    @go-back="handleGoBack"
  />
</template>

<script setup lang="ts">
import { ref } from "vue";
import { storeToRefs } from "pinia";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import CustomTimerDialog from "./CustomTimerDialog.vue";
import { useComponentI18n } from "src/composables/useComponentI18n";
import {
  makePublicTimerDialogTranslations,
  type MakePublicTimerDialogTranslations,
} from "./MakePublicTimerDialog.i18n";

const { t } = useComponentI18n<MakePublicTimerDialogTranslations>(
  makePublicTimerDialogTranslations
);

const showDialog = defineModel<boolean>("showDialog", { required: true });

const { conversationDraft } = storeToRefs(useNewPostDraftsStore());

const showCustomDialog = ref<boolean>(false);

interface TimerOption {
  value: "never" | "24hours" | "3days" | "1week" | "1month" | "custom";
  hours?: number;
}

const timerOptions: TimerOption[] = [
  {
    value: "never",
  },
  {
    value: "24hours",
    hours: 24,
  },
  {
    value: "3days",
    hours: 72,
  },
  {
    value: "1week",
    hours: 168,
  },
  {
    value: "1month",
    hours: 720, // 30 days
  },
  {
    value: "custom",
  },
];

function getTimerTitle(value: TimerOption["value"]): string {
  const titleMap: Record<TimerOption["value"], string> = {
    never: t("never"),
    "24hours": t("after24Hours"),
    "3days": t("after3Days"),
    "1week": t("after1Week"),
    "1month": t("after1Month"),
    custom: t("custom"),
  };
  return titleMap[value];
}

const selectedValue = ref<TimerOption["value"]>("never");

function isSelected(option: TimerOption): boolean {
  return selectedValue.value === option.value;
}

function selectOption(option: TimerOption): void {
  selectedValue.value = option.value;

  if (option.value === "never") {
    conversationDraft.value.privateConversationSettings.hasScheduledConversion = false;
    showDialog.value = false;
  } else if (option.value === "custom") {
    showDialog.value = false;
    showCustomDialog.value = true;
  } else if (option.hours) {
    conversationDraft.value.privateConversationSettings.hasScheduledConversion = true;
    const targetDate = new Date();
    targetDate.setHours(targetDate.getHours() + option.hours);
    conversationDraft.value.privateConversationSettings.conversionDate =
      targetDate;
    showDialog.value = false;
  }
}

function handleGoBack(): void {
  showCustomDialog.value = false;
  showDialog.value = true;
}
</script>

<style scoped lang="scss">
.timer-options {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.option-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
  @include hover-effects(
    $hover-background-color,
    $selected-hover-background-color
  );
}

.option-header {
  font-size: 1.1rem;
  font-weight: 500;
}

.custom-option {
  .custom-preview {
    margin-top: 0.5rem;
    font-size: 0.9rem;
    color: #6b7280;
    font-style: italic;
  }
}
</style>
