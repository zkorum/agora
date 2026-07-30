<template>
  <q-banner class="notice" rounded role="status">
    <q-icon name="mdi-alert-circle-outline" size="1.25rem" />
    <span>{{ message }}</span>
  </q-banner>
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { PhoneAuthUnavailableReason } from "src/utils/auth/phoneAuthMode";
import { computed } from "vue";

import {
  type PhoneAuthUnavailableNoticeTranslations,
  phoneAuthUnavailableNoticeTranslations,
} from "./PhoneAuthUnavailableNotice.i18n";

const props = defineProps<{
  reason: PhoneAuthUnavailableReason;
}>();

const { t } = useComponentI18n<PhoneAuthUnavailableNoticeTranslations>(
  phoneAuthUnavailableNoticeTranslations
);

const message = computed(() =>
  props.reason === "technical_unavailable"
    ? t("technicalUnavailable")
    : t("registrationUnavailable")
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
