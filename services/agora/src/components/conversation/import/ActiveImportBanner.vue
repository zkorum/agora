<template>
  <div class="active-import-banner">
    <ZKIcon
      name="mdi:information-outline"
      size="1.25rem"
      color="var(--p-blue-600)"
    />
    <div class="banner-content">
      <span class="banner-text">{{ t("message") }}</span>
      <PrimeButton
        :label="t('viewStatus')"
        severity="info"
        size="small"
        @click="handleViewStatus"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import ZKIcon from "src/components/ui-library/ZKIcon.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  activeImportBannerTranslations,
  type ActiveImportBannerTranslations,
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

<style scoped lang="scss">
.active-import-banner {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background-color: var(--p-blue-50);
  border: 1px solid var(--p-blue-200);
  border-radius: 8px;
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.banner-text {
  flex: 1;
  color: var(--p-blue-900);
  font-size: 0.95rem;
}
</style>
