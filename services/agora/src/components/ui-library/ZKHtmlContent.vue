<!-- eslint-disable vue/no-v-html -->
<template>
  <div v-if="isDisclosureEnabled" class="html-content-wrapper">
    <div
      :id="contentId"
      ref="contentRef"
      class="textBreak"
      :class="{
        truncate: compactMode,
        'collapsible-content': isDisclosureEnabled,
        'collapsible-content--collapsed': isDisclosureEnabled && isCollapsed,
        coloredHrefs: !compactMode,
      }"
      :style="contentStyle"
      role="user-content"
      :aria-label="compactMode ? t('postContentPreview') : t('postContent')"
      @click="handleClick"
      v-html="sanitizedHtmlBody"
    ></div>

    <button
      v-if="showDisclosureButton"
      type="button"
      class="disclosure-button"
      :aria-expanded="!isCollapsed"
      :aria-controls="contentId"
      @click.stop="toggleDisclosure"
    >
      {{ isCollapsed ? t("readMore") : t("showLess") }}
    </button>
  </div>

  <span
    v-else
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
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useId,
  watch,
} from "vue";

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
  }>(),
  {
    contentRole: "body",
    collapsible: true,
    collapsedLineCount: 10,
  }
);

const { t } = useComponentI18n<ZKHtmlContentTranslations>(
  zkHtmlContentTranslations
);

const contentId = `zk-html-content-${useId()}`;
const contentRef = ref<HTMLElement | null>(null);
const isCollapsed = ref(true);
const isOverflowing = ref(false);
let resizeObserver: ResizeObserver | undefined;

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

const showDisclosureButton = computed(
  () => isDisclosureEnabled.value && isOverflowing.value
);

const contentStyle = computed(() => ({
  "--collapsed-line-count": props.collapsedLineCount.toString(),
}));

function observeContentElement(contentElement: HTMLElement | null): void {
  resizeObserver?.disconnect();
  if (resizeObserver !== undefined && contentElement !== null) {
    resizeObserver.observe(contentElement);
  }
}

async function updateOverflowState(): Promise<void> {
  await nextTick();
  const contentElement = contentRef.value;
  if (contentElement === null || !isDisclosureEnabled.value) {
    isOverflowing.value = false;
    return;
  }

  if (!isCollapsed.value) {
    return;
  }

  isOverflowing.value =
    contentElement.scrollHeight > contentElement.clientHeight + 1;
}

function toggleDisclosure(): void {
  isCollapsed.value = !isCollapsed.value;
  if (isCollapsed.value) {
    contentRef.value?.scrollIntoView({ block: "nearest" });
    void updateOverflowState();
  }
}

const handleClick = (event: Event) => {
  const target = event.target as HTMLElement;
  // Check if the clicked element is a link or is inside a link
  const link = target.closest("a[href]");
  if (link) {
    // Prevent the click from propagating to parent elements
    event.stopPropagation();
  }
};

onMounted(() => {
  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(() => {
      void updateOverflowState();
    });
    observeContentElement(contentRef.value);
  }
  void updateOverflowState();
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
});

watch(
  [sanitizedHtmlBody, isDisclosureEnabled, () => props.collapsedLineCount],
  () => {
    isCollapsed.value = true;
    void updateOverflowState();
  }
);

watch(contentRef, (contentElement) => {
  observeContentElement(contentElement);
  void updateOverflowState();
});
</script>

<style lang="scss" scoped>
.textBreak {
  font-size: 0.9rem;
  line-height: normal;
  overflow-wrap: break-word;
  word-break: break-word;
}

.html-content-wrapper {
  display: block;
}

.collapsible-content {
  position: relative;
}

.collapsible-content--collapsed {
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: var(--collapsed-line-count);
  line-clamp: var(--collapsed-line-count);
  -webkit-box-orient: vertical;
}

.disclosure-button {
  display: flex;
  align-items: center;
  padding: 0;
  width: fit-content;
  margin-block: 0.5rem;
  border: 0;
  background: transparent;
  color: $primary;
  font: inherit;
  font-weight: var(--font-weight-medium);
  cursor: pointer;
}

.disclosure-button:hover {
  text-decoration: underline;
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
