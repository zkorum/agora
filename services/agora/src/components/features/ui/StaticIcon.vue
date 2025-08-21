<template>
  <img :src="starIcon" :alt="t('stars')" :style="{ height: props.size }" />
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/useComponentI18n";
import {
  staticIconTranslations,
  type StaticIconTranslations,
} from "./StaticIcon.i18n";

const props = defineProps<{
  src: string;
  size: string;
}>();

const { t } = useComponentI18n<StaticIconTranslations>(staticIconTranslations);

const starIcon = process.env.VITE_PUBLIC_DIR + props.src;
</script>

<style lang="scss" scoped></style>
