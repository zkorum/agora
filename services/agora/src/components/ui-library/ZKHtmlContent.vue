<!-- eslint-disable vue/no-v-html -->
<template>
  <ZKContentDisclosure
    class="textBreak"
    :class="{ coloredHrefs: !compactMode }"
    :compact-mode="compactMode"
    :disclosure-enabled="isDisclosureEnabled"
    :collapsed-line-count="collapsedLineCount"
    :desktop-collapsed-line-count="desktopCollapsedLineCount"
    :compact-line-count="compactLineCount"
    :refresh-key="sanitizedHtmlBody"
    role="user-content"
    :aria-label="compactMode ? t('postContentPreview') : t('postContent')"
    @click="handleClick"
  >
    <span v-html="sanitizedHtmlBody"></span>
  </ZKContentDisclosure>
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { processUserGeneratedHtml } from "src/shared-app-api/html";
import { computed } from "vue";

import ZKContentDisclosure from "./ZKContentDisclosure.vue";
import {
  type ZKHtmlContentTranslations,
  zkHtmlContentTranslations,
} from "./ZKHtmlContent.i18n";

type HtmlContentRole = "body" | "title";

const props = withDefaults(
  defineProps<{
    htmlBody: string;
    compactMode: boolean;
    enableLinks: boolean;
    contentRole?: HtmlContentRole;
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

const isDisclosureEnabled = computed(
  () => props.collapsible && props.contentRole === "body" && !props.compactMode
);

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
  overflow-wrap: break-word;
  word-break: break-word;
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

/* Ensure any remaining potentially dangerous content is hidden */
:deep(script),
:deep(iframe),
:deep(object),
:deep(embed) {
  display: none;
}
</style>
