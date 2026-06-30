<template>
  <ZKHtmlContent
    :html-body="htmlBody"
    :compact-mode="compactMode"
    :enable-links="enableLinks"
    :content-role="contentRole"
    :collapsible="collapsible"
    :collapsed-line-count="collapsedLineCount"
    :desktop-collapsed-line-count="desktopCollapsedLineCount"
    :compact-line-count="compactLineCount"
  />
</template>

<script setup lang="ts">
import { plainTextToSafeHtml } from "src/utils/html/plainText";
import { computed } from "vue";

import ZKHtmlContent from "./ZKHtmlContent.vue";

type PlainTextContentRole = "body" | "title";

const props = withDefaults(
  defineProps<{
    plainText: string;
    compactMode: boolean;
    enableLinks: boolean;
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

const htmlBody = computed(() =>
  plainTextToSafeHtml({ plainText: props.plainText })
);
</script>
