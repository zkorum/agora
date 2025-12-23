<template>
  <img :src="props.src" :alt="t('stars')" :style="{ height: props.size }" />
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/ui/useComponentI18n";

import {
  type StaticIconTranslations,
  staticIconTranslations,
} from "./StaticIcon.i18n";

const props = defineProps<{
  src: string;
  size: string;
}>();

const { t } = useComponentI18n<StaticIconTranslations>(staticIconTranslations);
</script>

<style lang="scss" scoped></style>
