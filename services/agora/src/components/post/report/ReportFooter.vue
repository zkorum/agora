<template>
  <div class="report-footer">
    <div class="footer-line">
      {{ t("generatedOn") }} {{ formattedNow }}
    </div>
    <div class="footer-line">
      {{ conversationUrl }}
    </div>
    <div class="footer-branding">
      {{ t("poweredBy") }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  localizedDateTimeFormatOptions,
  useLocalizedDateTimeFormatter,
} from "src/composables/ui/useLocalizedDateTime";
import { useConversationUrl } from "src/utils/url/conversationUrl";
import { computed } from "vue";

import {
  type ReportFooterTranslations,
  reportFooterTranslations,
} from "./ReportFooter.i18n";

const props = defineProps<{
  conversationSlugId: string;
}>();

const { t } = useComponentI18n<ReportFooterTranslations>(
  reportFooterTranslations,
);

const formatGeneratedAt = useLocalizedDateTimeFormatter({
  options: localizedDateTimeFormatOptions.dateTime,
});

const { getConversationUrl } = useConversationUrl();

const conversationUrl = computed(() =>
  getConversationUrl(props.conversationSlugId),
);

const formattedNow = computed(() =>
  formatGeneratedAt(new Date()),
);
</script>

<style lang="scss" scoped>
.report-footer {
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid #e9e9f1;
  text-align: center;
}

.footer-line {
  font-size: 0.7rem;
  color: #9e9ba5;
  margin-bottom: 0.2rem;
}

.footer-branding {
  font-size: 0.7rem;
  color: #9e9ba5;
  font-weight: var(--font-weight-medium);
  margin-top: 0.25rem;
  padding-bottom: 0.5rem;
}
</style>
