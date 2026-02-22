<template>
  <div></div>
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useNotify } from "src/utils/ui/notify";
import { onMounted } from "vue";
import { useRouter } from "vue-router";

import {
  type NotFoundTranslations,
  notFoundTranslations,
} from "./[...all].i18n";

const { t } = useComponentI18n<NotFoundTranslations>(notFoundTranslations);
const { showNotifyMessage } = useNotify();
const router = useRouter();

onMounted(async () => {
  showNotifyMessage(t("pageNotFound"));
  await router.replace({ name: "/" });
});
</script>
