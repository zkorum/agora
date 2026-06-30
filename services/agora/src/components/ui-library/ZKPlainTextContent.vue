<template>
  <ZKContentDisclosure
    :compact-mode="compactMode"
    :disclosure-enabled="isDisclosureEnabled"
    :collapsed-line-count="collapsedLineCount"
    :desktop-collapsed-line-count="desktopCollapsedLineCount"
    :compact-line-count="compactLineCount"
    :refresh-key="plainText"
  >
    {{ plainText }}
  </ZKContentDisclosure>
</template>

<script setup lang="ts">
import { computed } from "vue";

import ZKContentDisclosure from "./ZKContentDisclosure.vue";

type PlainTextContentRole = "body" | "title";

const props = withDefaults(
  defineProps<{
    plainText: string;
    compactMode: boolean;
    contentRole?: PlainTextContentRole;
    collapsible?: boolean;
    collapsedLineCount?: number;
    desktopCollapsedLineCount?: number;
    compactLineCount?: number;
  }>(),
  {
    contentRole: "body",
    collapsible: true,
    collapsedLineCount: 10,
    desktopCollapsedLineCount: 10,
    compactLineCount: 5,
  }
);

const isDisclosureEnabled = computed(
  () => props.collapsible && props.contentRole === "body" && !props.compactMode
);
</script>
