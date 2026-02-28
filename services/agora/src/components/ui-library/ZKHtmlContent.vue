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
import { processUserGeneratedHtml } from "src/shared-app-api/html";
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
    return processUserGeneratedHtml(props.htmlBody, props.enableLinks);
  } catch (error) {
    console.error("Error sanitizing HTML content:", error);
    // Fallback to plain text if sanitization fails
    // Strip tags repeatedly to handle malformed/nested tags before v-html rendering
    let text = props.htmlBody;
    let prev: string;
    do {
      prev = text;
      text = text.replace(/<[^>]*>/g, "");
    } while (text !== prev);
    return text.replace(/<[^>]*$/, "");
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
  font-size: 0.9rem;
  line-height: normal;
}

:deep(p) {
  margin-bottom: 0.5rem;
}

:deep(p:empty) {
  min-height: 1.2em;
}

:deep(ul),
:deep(ol) {
  padding-left: 1.5rem;
  margin-bottom: 0.5rem;
  margin-top: 0;
}

:deep(li) {
  margin-bottom: 0.25rem;
}

:deep(li > p) {
  margin-bottom: 0;
}

/* Nested lists should have minimal spacing */
:deep(li ul),
:deep(li ol) {
  margin-top: 0.125rem;
  margin-bottom: 0;
}

/* Top-level unordered list uses disc */
:deep(ul) {
  list-style-type: disc;
}

/* Nested unordered lists use circle, then square */
:deep(ul ul) {
  list-style-type: circle;
}

:deep(ul ul ul) {
  list-style-type: square;
}

:deep(ol) {
  list-style-type: decimal;
  padding-left: 1.75rem;
}

/* Nested ordered lists use different numbering styles */
:deep(ol ol) {
  list-style-type: lower-alpha;
}

:deep(ol ol ol) {
  list-style-type: lower-roman;
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
