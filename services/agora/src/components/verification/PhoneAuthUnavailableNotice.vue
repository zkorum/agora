<template>
  <q-banner
    v-if="reason === 'technical_unavailable'"
    class="notice"
    rounded
    role="status"
  >
    <q-icon name="mdi-alert-circle-outline" size="1.25rem" />
    <span>{{ t("technicalUnavailable") }}</span>
  </q-banner>
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { PhoneAuthUnavailableReason } from "src/utils/auth/phoneAuthMode";

import {
  type PhoneAuthUnavailableNoticeTranslations,
  phoneAuthUnavailableNoticeTranslations,
} from "./PhoneAuthUnavailableNotice.i18n";

defineProps<{
  reason: PhoneAuthUnavailableReason;
}>();

const { t } = useComponentI18n<PhoneAuthUnavailableNoticeTranslations>(
  phoneAuthUnavailableNoticeTranslations
);
</script>

<style scoped lang="scss">
.notice {
  background: #f3f1ff;
  color: $color-text-strong;

  :deep(.q-banner__content) {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
  }
}
</style>
