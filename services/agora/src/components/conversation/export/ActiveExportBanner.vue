<template>
  <ZKInfoBanner
    :message="t('message')"
    :action-label="t('viewStatus')"
    @action="handleViewStatus"
  />
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import ZKInfoBanner from "src/components/ui-library/ZKInfoBanner.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  activeExportBannerTranslations,
  type ActiveExportBannerTranslations,
} from "./ActiveExportBanner.i18n";

interface Props {
  exportSlugId: string;
  conversationSlugId: string;
}

const props = defineProps<Props>();

const { t } = useComponentI18n<ActiveExportBannerTranslations>(
  activeExportBannerTranslations
);

const router = useRouter();

function handleViewStatus() {
  void router.push({
    name: "/conversation/[conversationSlugId]/export.[exportId]",
    params: {
      conversationSlugId: props.conversationSlugId,
      exportId: props.exportSlugId,
    },
  });
}
</script>
