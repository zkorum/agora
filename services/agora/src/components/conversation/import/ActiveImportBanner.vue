<template>
  <ZKInfoBanner
    :message="t('message')"
    :action-label="t('viewStatus')"
    @action="handleViewStatus"
  />
</template>

<script setup lang="ts">
import ZKInfoBanner from "src/components/ui-library/ZKInfoBanner.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useRouter } from "vue-router";

import {
  type ActiveImportBannerTranslations,
  activeImportBannerTranslations,
} from "./ActiveImportBanner.i18n";

interface Props {
  importSlugId: string;
}

const props = defineProps<Props>();

const { t } = useComponentI18n<ActiveImportBannerTranslations>(
  activeImportBannerTranslations
);

const router = useRouter();

function handleViewStatus() {
  void router.push({
    name: "/conversation/import/[importSlugId]",
    params: { importSlugId: props.importSlugId },
  });
}
</script>
