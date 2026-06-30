<template>
  <div v-if="disclosureEnabled" class="zk-content-disclosure">
    <div
      :id="contentId"
      ref="contentRef"
      class="zk-content-disclosure__content"
      :class="{
        'zk-content-disclosure__content--collapsed': isCollapsed,
      }"
      :style="contentStyle"
    >
      <slot />
    </div>

    <button
      v-if="showDisclosureButton"
      type="button"
      class="zk-content-disclosure__button"
      :aria-expanded="!isCollapsed"
      :aria-controls="contentId"
      @click.stop="toggleDisclosure"
    >
      {{ isCollapsed ? t("readMore") : t("showLess") }}
    </button>
  </div>

  <span
    v-else
    class="zk-content-disclosure__compact-content"
    :class="{
      'zk-content-disclosure__compact-content--clamped': compactMode,
    }"
    :style="contentStyle"
  >
    <slot />
  </span>
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
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
  type ZKContentDisclosureTranslations,
  zkContentDisclosureTranslations,
} from "./ZKContentDisclosure.i18n";

const props = withDefaults(
  defineProps<{
    compactMode: boolean;
    disclosureEnabled: boolean;
    collapsedLineCount?: number;
    desktopCollapsedLineCount?: number;
    compactLineCount?: number;
    refreshKey?: string | number | boolean | undefined;
  }>(),
  {
    collapsedLineCount: 10,
    desktopCollapsedLineCount: 10,
    compactLineCount: 5,
    refreshKey: undefined,
  }
);

const { t } = useComponentI18n<ZKContentDisclosureTranslations>(
  zkContentDisclosureTranslations
);

const contentId = `zk-content-disclosure-${useId()}`;
const contentRef = ref<HTMLElement | null>(null);
const isCollapsed = ref(true);
const isOverflowing = ref(false);
let resizeObserver: ResizeObserver | undefined;

const showDisclosureButton = computed(
  () => props.disclosureEnabled && isOverflowing.value
);

const contentStyle = computed(() => ({
  "--collapsed-line-count": props.collapsedLineCount.toString(),
  "--desktop-collapsed-line-count": props.desktopCollapsedLineCount.toString(),
  "--compact-line-count": props.compactLineCount.toString(),
}));

function resetResizeObserver(): void {
  resizeObserver?.disconnect();
  resizeObserver = undefined;

  if (!props.disclosureEnabled || typeof ResizeObserver === "undefined") {
    return;
  }

  const contentElement = contentRef.value;
  if (contentElement === null) {
    return;
  }

  resizeObserver = new ResizeObserver(() => {
    void updateOverflowState();
  });
  resizeObserver.observe(contentElement);
}

async function updateOverflowState(): Promise<void> {
  await nextTick();
  const contentElement = contentRef.value;
  if (contentElement === null || !props.disclosureEnabled) {
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

onMounted(() => {
  resetResizeObserver();
  void updateOverflowState();
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
});

watch(
  [
    () => props.disclosureEnabled,
    () => props.collapsedLineCount,
    () => props.desktopCollapsedLineCount,
    () => props.refreshKey,
  ],
  () => {
    isCollapsed.value = true;
    resetResizeObserver();
    void updateOverflowState();
  }
);

watch(contentRef, () => {
  resetResizeObserver();
  void updateOverflowState();
});
</script>

<style scoped lang="scss">
.zk-content-disclosure {
  display: block;
}

.zk-content-disclosure__content--collapsed {
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: var(--collapsed-line-count);
  line-clamp: var(--collapsed-line-count);
  -webkit-box-orient: vertical;

  @media (min-width: $breakpoint-sm) {
    -webkit-line-clamp: var(--desktop-collapsed-line-count);
    line-clamp: var(--desktop-collapsed-line-count);
  }
}

.zk-content-disclosure__button {
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

.zk-content-disclosure__button:hover {
  text-decoration: underline;
}

.zk-content-disclosure__compact-content--clamped {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: var(--compact-line-count);
  line-clamp: var(--compact-line-count);
  -webkit-box-orient: vertical;
}
</style>
