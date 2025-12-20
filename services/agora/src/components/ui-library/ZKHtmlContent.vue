<!-- eslint-disable vue/no-v-html -->
<template>
  <span
    class="textBreak"
    :class="{ truncate: compactMode, coloredHrefs: !compactMode }"
    role="user-content"
    :aria-label="compactMode ? t('postContentPreview') : t('postContent')"
    @click="handleClick"
    v-html="sanitizedHtmlBody"
  ></span>
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { processHtmlBody } from "src/shared-app-api/html";
import { computed } from "vue";

import {
  type ZKHtmlContentTranslations,
  zkHtmlContentTranslations,
} from "./ZKHtmlContent.i18n";

const props = defineProps<{
  htmlBody: string;
  compactMode: boolean;
  enableLinks: boolean;
}>();

const { t } = useComponentI18n<ZKHtmlContentTranslations>(
  zkHtmlContentTranslations
);

const sanitizedHtmlBody = computed(() => {
  try {
    return processHtmlBody(props.htmlBody, props.enableLinks);
  } catch (error) {
    console.error("Error sanitizing HTML content:", error);
    // Fallback to plain text if sanitization fails
    return props.htmlBody.replace(/<[^>]*>/g, "");
  }
});

const handleClick = (event: Event) => {
  const target = event.target as HTMLElement;
  // Check if the clicked element is a link or is inside a link
  const link = target.closest("a[href]");
  if (link) {
    // Prevent the click from propagating to parent elements
    event.stopPropagation();
  }
};
</script>

<style lang="scss" scoped>
.textBreak {
  font-size: 1rem;
  line-height: normal;
  word-break: break-word;
  /* Prevent potential layout issues with long content */
  overflow-wrap: break-word;
  hyphens: auto;
}

:deep(p) {
  margin-bottom: 0.5rem;
}

:deep(p:empty) {
  min-height: 1.2em;
}

:deep(div) {
  margin-bottom: 0.5rem;
}

:deep(a[href]) {
  color: rgb(0, 121, 211);
  font-weight: var(--font-weight-medium);
  margin-right: 0.25rem;
}

.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 5;
  line-clamp: 5;
  -webkit-box-orient: vertical;
}

/* Ensure any remaining potentially dangerous content is hidden */
:deep(script),
:deep(iframe),
:deep(object),
:deep(embed) {
  display: none !important;
}
</style>
