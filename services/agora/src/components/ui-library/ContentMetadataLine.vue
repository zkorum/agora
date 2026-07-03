<template>
  <InlineMetadataLine>
    <span>{{ timeAgo }}</span>
    <template v-if="isEdited">
      <span class="content-metadata-line__bullet">•</span>
      <span>{{ editedLabel }}</span>
    </template>
  </InlineMetadataLine>
</template>

<script setup lang="ts">
import { useLocalizedTimeAgo } from "src/composables/ui/useLocalizedTimeAgo";

import InlineMetadataLine from "./InlineMetadataLine.vue";

const props = defineProps<{
  createdAt: Date | number | string;
  isEdited: boolean;
  editedLabel: string;
}>();

const timeAgo = useLocalizedTimeAgo(() => props.createdAt);
</script>

<style scoped lang="scss">
.content-metadata-line__bullet {
  opacity: 0.6;
}
</style>
