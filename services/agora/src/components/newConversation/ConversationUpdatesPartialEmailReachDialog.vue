<template>
  <ZKConfirmDialog
    v-model="showDialog"
    :title="t('partialReachTitle')"
    :message="warningMessage"
    :confirm-text="t('keepUpdatesOn')"
    :cancel-text="t('enforceEmailVerificationOnly')"
    cancel-severity="primary"
    :cancel-outlined="false"
    :alternate-text="t('turnUpdatesOff')"
    alternate-severity="primary"
    :persistent="true"
    variant="warning"
    @confirm="emitAction('keep_updates_on')"
    @cancel="emitAction('enforce_email_verification')"
    @alternate="emitAction('turn_updates_off')"
  />
</template>

<script setup lang="ts">
import ZKConfirmDialog from "src/components/ui-library/ZKConfirmDialog.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { computed } from "vue";

import {
  type ConversationUpdatesPartialEmailReachDialogTranslations,
  conversationUpdatesPartialEmailReachDialogTranslations,
} from "./ConversationUpdatesPartialEmailReachDialog.i18n";
import type {
  PartialEmailReachAction,
  PartialEmailReachParticipationMode,
} from "./conversationUpdatesPartialEmailReachLogic";

const emit = defineEmits<{
  action: [action: PartialEmailReachAction];
}>();
const warningMode = defineModel<PartialEmailReachParticipationMode | undefined>(
  { required: true }
);
const { t } =
  useComponentI18n<ConversationUpdatesPartialEmailReachDialogTranslations>(
    conversationUpdatesPartialEmailReachDialogTranslations
  );

const showDialog = computed({
  get: () => warningMode.value !== undefined,
  set: (isVisible: boolean) => {
    if (!isVisible) {
      warningMode.value = undefined;
    }
  },
});
const warningMessage = computed(() => {
  if (warningMode.value === "guest") {
    return t("guestPartialReach");
  }
  if (warningMode.value === "strong_verification") {
    return t("strongVerificationPartialReach");
  }
  return t("accountPartialReach");
});

function emitAction(action: PartialEmailReachAction): void {
  emit("action", action);
}
</script>
