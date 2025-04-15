<!-- eslint-disable vue/no-v-html -->
<template>
  <span
    class="textBreak"
    :class="{ truncate: compactMode, coloredHrefs: !compactMode }"
    v-html="htmlBody"
  ></span>
</template>

<script setup lang="ts">
defineProps<{
  htmlBody: string;
  compactMode: boolean;
}>();
</script>

<style lang="scss" scoped>
:deep(a) {
  color: $primary;
}

.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 5;
  line-clamp: 5;
  -webkit-box-orient: vertical;
}

.textBreak {
  word-break: break-word;
}
</style>
