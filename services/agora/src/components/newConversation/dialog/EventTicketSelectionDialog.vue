<template>
  <q-dialog v-model="showDialog" position="bottom">
    <ZKBottomDialogContainer>
      <div class="event-options">
        <div
          v-for="(option, index) in eventOptions"
          :key="index"
          class="option-item"
          :class="{
            selected: isSelected(option),
          }"
          @click="selectOption(option)"
        >
          <div class="option-header">{{ getEventTitle(option.value) }}</div>
        </div>
      </div>
    </ZKBottomDialogContainer>
  </q-dialog>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import type { EventSlug } from "src/shared/types/zod";
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  eventTicketSelectionDialogTranslations,
  type EventTicketSelectionDialogTranslations,
} from "./EventTicketSelectionDialog.i18n";

const { t } = useComponentI18n<EventTicketSelectionDialogTranslations>(
  eventTicketSelectionDialogTranslations
);

const showDialog = defineModel<boolean>("showDialog", { required: true });

const { conversationDraft } = storeToRefs(useNewPostDraftsStore());

defineEmits<{
  goBack: [];
}>();

interface EventOption {
  value: EventSlug;
}

const eventOptions: EventOption[] = [
  {
    value: "devconnect-2025",
  },
];

function getEventTitle(value: EventSlug): string {
  const titleMap: Record<EventSlug, string> = {
    "devconnect-2025": t("devconnect2025"),
  };
  return titleMap[value];
}

function isSelected(option: EventOption): boolean {
  return conversationDraft.value.requiresEventTicket === option.value;
}

function selectOption(option: EventOption): void {
  conversationDraft.value.requiresEventTicket = option.value;
  showDialog.value = false;
}
</script>

<style scoped lang="scss">
.event-options {
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
  font-weight: var(--font-weight-medium);
}
</style>
