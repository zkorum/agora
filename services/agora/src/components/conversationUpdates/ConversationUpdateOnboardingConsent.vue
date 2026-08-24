<template>
  <ZKCheckbox
    v-model="checked"
    :label="checkboxLabel"
    :description="t('description')"
    :required="false"
    :disabled="false"
  />
</template>

<script setup lang="ts">
import ZKCheckbox from "src/components/ui-library/ZKCheckbox.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { computed } from "vue";

import {
  type ConversationUpdateOnboardingConsentTranslations,
  conversationUpdateOnboardingConsentTranslations,
} from "./ConversationUpdateOnboardingConsent.i18n";

const props = defineProps<{
  scopeKind: "no-project" | "project";
}>();

const checked = defineModel<boolean>({ required: true });

const { t } = useComponentI18n<ConversationUpdateOnboardingConsentTranslations>(
  conversationUpdateOnboardingConsentTranslations
);

const checkboxLabel = computed(() =>
  props.scopeKind === "project" ? t("projectLabel") : t("conversationLabel")
);
</script>
