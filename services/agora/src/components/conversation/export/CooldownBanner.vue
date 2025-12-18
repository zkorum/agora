<template>
  <ZKInfoBanner
    :message="cooldownMessage"
    :action-label="t('viewLast')"
    @action="handleViewLast"
  />
</template>

<script setup lang="ts">
import { useNow } from "@vueuse/core";
import ZKInfoBanner from "src/components/ui-library/ZKInfoBanner.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { computed } from "vue";
import { useRouter } from "vue-router";

import {
  type CooldownBannerTranslations,
  cooldownBannerTranslations,
} from "./CooldownBanner.i18n";

interface Props {
  cooldownEndsAt: string; // ISO string
  lastExportSlugId: string;
  conversationSlugId: string;
}

const props = defineProps<Props>();

const { t } = useComponentI18n<CooldownBannerTranslations>(
  cooldownBannerTranslations
);

const router = useRouter();

// Reactive time using VueUse - updates every second
const now = useNow({ interval: 1000 });

// Computed countdown message
const cooldownMessage = computed(() => {
  const cooldownEnd = new Date(props.cooldownEndsAt);
  const remainingMs = cooldownEnd.getTime() - now.value.getTime();
  const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));

  if (remainingSeconds === 0) {
    return t("cooldownEnded");
  }

  // Format duration
  if (remainingSeconds < 60) {
    return t("cooldownSeconds").replace("{seconds}", String(remainingSeconds));
  } else {
    const minutes = Math.ceil(remainingSeconds / 60);
    return t("cooldownMinutes").replace("{minutes}", String(minutes));
  }
});

function handleViewLast() {
  void router.push({
    name: "/conversation/[conversationSlugId]/export.[exportId]",
    params: {
      conversationSlugId: props.conversationSlugId,
      exportId: props.lastExportSlugId,
    },
  });
}
</script>
