<template>
  <template v-if="clusterList.length > 1">
    <div ref="stickySentinelElement"></div>
    <div
      ref="stickyBarElement"
      class="analysis-cluster-selector-bar"
      :class="{
        'analysis-cluster-selector-bar--stuck': isSticky,
      }"
      :style="selectorStyle"
    >
      <div class="analysis-cluster-selector-bar__row">
        <ZKDropdownSelectorButton
          :label="selectedClusterLabel"
          :accessibility-label="props.accessibilityLabel"
          button-type="standardButton"
          class="analysis-cluster-selector-bar__trigger"
          content-alignment="start"
          icon-name="mdi-chevron-down"
          icon-size="1rem"
          label-overflow="truncate"
          @click="showDrawer = true"
        />

        <slot name="secondary" />
      </div>
    </div>
  </template>

  <q-dialog v-model="showDrawer" position="bottom">
    <ZKBottomDialogContainer :title="props.accessibilityLabel">
      <div class="analysis-cluster-selector-drawer-list">
        <button
          v-if="props.allOption !== undefined"
          type="button"
          class="analysis-cluster-selector-drawer-option"
          :class="{
            'analysis-cluster-selector-drawer-option--selected':
              props.selectedClusterKey === undefined,
          }"
          :aria-pressed="props.selectedClusterKey === undefined"
          @click="selectFromDrawer({ clusterKey: undefined })"
        >
          <span>{{ props.allOption.label }}</span>
          <q-icon
            v-if="props.selectedClusterKey === undefined"
            name="mdi-check"
            size="1.1rem"
          />
        </button>

        <button
          v-for="cluster in clusterList"
          :key="cluster.key"
          type="button"
          class="analysis-cluster-selector-drawer-option"
          :class="{
            'analysis-cluster-selector-drawer-option--selected':
              cluster.key === props.selectedClusterKey,
          }"
          :aria-pressed="cluster.key === props.selectedClusterKey"
          @click="selectFromDrawer({ clusterKey: cluster.key })"
        >
          <span>{{ getClusterLabel(cluster) }}</span>
          <q-icon
            v-if="cluster.key === props.selectedClusterKey"
            name="mdi-check"
            size="1.1rem"
          />
        </button>
      </div>
    </ZKBottomDialogContainer>
  </q-dialog>
</template>

<script setup lang="ts">
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import ZKDropdownSelectorButton from "src/components/ui-library/ZKDropdownSelectorButton.vue";
import type { ConversationScrollContext } from "src/composables/conversation/useConversationParentState";
import type { PolisClusters, PolisKey } from "src/shared/types/zod";
import {
  computeClusterSelectorContentFloorScroll,
  computeClusterSelectorRestoreTarget,
  computeClusterSelectorStickyTopOffset,
  computeIsClusterSelectorSticky,
  computeIsSecondaryContentMerged,
} from "src/utils/component/analysis/clusterSelectorBar";
import { formatClusterLabel } from "src/utils/component/opinion";
import { getHeaderHeight } from "src/utils/html/scroll";
import {
  computed,
  nextTick,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  onUpdated,
  ref,
  watch,
} from "vue";

type ClusterItem = NonNullable<PolisClusters[PolisKey]>;

interface AllClusterSelectorOption {
  label: string;
}

const props = defineProps<{
  clusters: Partial<PolisClusters>;
  selectedClusterKey: PolisKey | undefined;
  allOption: AllClusterSelectorOption | undefined;
  accessibilityLabel: string;
  conversationScrollContext: ConversationScrollContext;
  contentFloorElement: HTMLElement | null;
  secondaryContentMergeTarget: HTMLElement | null;
}>();

const emit = defineEmits<{
  "update:selectedClusterKey": [clusterKey: PolisKey | undefined];
  "update:isSecondaryContentMerged": [isMerged: boolean];
}>();

const stickySentinelElement = ref<HTMLElement | null>(null);
const stickyBarElement = ref<HTMLElement | null>(null);
const showDrawer = ref(false);
const isSticky = ref(false);
const isSecondaryContentMerged = ref(false);
const stickyTopOffset = ref(0);
const selectionScrollPositions = new Map<PolisKey | undefined, number>();

let resizeObserver: ResizeObserver | undefined;
let removeScrollListener: (() => void) | undefined;
let layoutRafId: number | undefined;

const clusterList = computed<ClusterItem[]>(() =>
  Object.values(props.clusters)
    .filter((cluster): cluster is ClusterItem => cluster !== undefined)
    .sort((a, b) => Number(a.key) - Number(b.key))
);

const selectedCluster = computed(() => {
  const key = props.selectedClusterKey;
  if (key === undefined) {
    return undefined;
  }

  return clusterList.value.find((cluster) => cluster.key === key);
});

const selectedClusterLabel = computed(() => {
  const key = props.selectedClusterKey;
  if (key === undefined) {
    return props.allOption?.label ?? "";
  }

  const cluster = selectedCluster.value;
  if (cluster === undefined) {
    return formatClusterLabel(key, false);
  }

  return getClusterLabel(cluster);
});

const selectorStyle = computed(() => ({
  "--analysis-cluster-selector-top": `${stickyTopOffset.value}px`,
}));

watch(
  [clusterList, selectedClusterLabel, () => props.allOption],
  () => {
    void nextTick(() => {
      resetResizeObserver();
      requestLayoutUpdate();
    });
  },
  { deep: true }
);

watch(
  () => props.conversationScrollContext.scrollContainerElement,
  () => {
    bindScrollListener();
    void nextTick(() => {
      resetResizeObserver();
      requestLayoutUpdate();
    });
  }
);

watch(
  [
    () => props.conversationScrollContext.actionBarElement,
    () => props.contentFloorElement,
    () => props.secondaryContentMergeTarget,
  ],
  () => {
    void nextTick(() => {
      resetResizeObserver();
      requestLayoutUpdate();
    });
  }
);

onMounted(async () => {
  await nextTick();
  resetResizeObserver();
  bindScrollListener();
  requestLayoutUpdate();
});

onActivated(() => {
  bindScrollListener();
  requestLayoutUpdate();
});

onUpdated(() => {
  resetResizeObserver();
  requestLayoutUpdate();
});

onDeactivated(() => {
  removeActiveScrollListener();
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  removeActiveScrollListener();
  setSecondaryContentMerged(false);
  if (layoutRafId !== undefined) {
    cancelAnimationFrame(layoutRafId);
  }
});

function getClusterLabel(cluster: ClusterItem): string {
  return formatClusterLabel(cluster.key, false, cluster.aiLabel);
}

async function selectFromDrawer({
  clusterKey,
}: {
  clusterKey: PolisKey | undefined;
}): Promise<void> {
  showDrawer.value = false;

  if (clusterKey === props.selectedClusterKey) {
    return;
  }

  saveCurrentSelectionScrollPosition();
  emit("update:selectedClusterKey", clusterKey);

  await nextTick();

  restoreSelectedSelectionScrollPosition({ clusterKey });
  requestLayoutUpdate();
}

function saveCurrentSelectionScrollPosition(): void {
  selectionScrollPositions.set(
    props.selectedClusterKey,
    props.conversationScrollContext.getScrollPosition()
  );
}

function restoreSelectedSelectionScrollPosition({
  clusterKey,
}: {
  clusterKey: PolisKey | undefined;
}): void {
  const floorScroll = getContentFloorScroll();
  const savedScroll = selectionScrollPositions.get(clusterKey);
  const targetScroll = computeClusterSelectorRestoreTarget({
    savedScroll,
    floorScroll,
  });

  props.conversationScrollContext.scrollToPosition({
    top: targetScroll,
    behavior: "smooth",
  });
}

function getContentFloorScroll(): number {
  const targetElement = props.contentFloorElement;
  if (targetElement === null) {
    return props.conversationScrollContext.getScrollPosition();
  }

  return computeClusterSelectorContentFloorScroll({
    elementScrollPosition:
      props.conversationScrollContext.getElementScrollPosition({
        element: targetElement,
      }),
    stickyTopOffset: getStickyTopOffset(),
    selectorHeight: getSelectorHeight(),
  });
}

function getContainerTop(): number {
  return (
    props.conversationScrollContext.scrollContainerElement?.getBoundingClientRect()
      .top ?? 0
  );
}

function getStickyTopOffset(): number {
  const actionBarElement = props.conversationScrollContext.actionBarElement;
  if (actionBarElement === null) {
    return getHeaderHeight();
  }

  const actionBarRect = actionBarElement.getBoundingClientRect();

  return computeClusterSelectorStickyTopOffset({
    actionBarViewportTop: actionBarRect.top,
    actionBarHeight: actionBarRect.height,
    containerViewportTop: getContainerTop(),
    headerHeight: getHeaderHeight(),
  });
}

function requestLayoutUpdate(): void {
  if (layoutRafId !== undefined) {
    return;
  }

  layoutRafId = requestAnimationFrame(() => {
    layoutRafId = undefined;
    updateStickyState();
  });
}

function updateStickyState(): void {
  const sentinel = stickySentinelElement.value;
  const stickyBar = stickyBarElement.value;
  const nextStickyTopOffset = getStickyTopOffset();

  stickyTopOffset.value = nextStickyTopOffset;

  if (sentinel === null || stickyBar === null) {
    isSticky.value = false;
    setSecondaryContentMerged(false);
    return;
  }

  const containerTop = getContainerTop();
  isSticky.value = computeIsClusterSelectorSticky({
    sentinelViewportTop: sentinel.getBoundingClientRect().top,
    containerViewportTop: containerTop,
    stickyTopOffset: nextStickyTopOffset,
  });

  const mergeTarget = props.secondaryContentMergeTarget;
  if (!isSticky.value || mergeTarget === null) {
    setSecondaryContentMerged(false);
    return;
  }

  setSecondaryContentMerged(
    computeIsSecondaryContentMerged({
      secondaryContentViewportTop: mergeTarget.getBoundingClientRect().top,
      containerViewportTop: containerTop,
      stickyTopOffset: nextStickyTopOffset,
      selectorHeight: getSelectorHeight(),
    })
  );
}

function setSecondaryContentMerged(isMerged: boolean): void {
  if (isSecondaryContentMerged.value === isMerged) {
    return;
  }

  isSecondaryContentMerged.value = isMerged;
  emit("update:isSecondaryContentMerged", isMerged);
}

function resetResizeObserver(): void {
  resizeObserver?.disconnect();
  if (typeof ResizeObserver === "undefined") {
    return;
  }

  resizeObserver = new ResizeObserver(() => {
    requestLayoutUpdate();
  });

  observeElement({ element: stickyBarElement.value });
  observeElement({
    element: props.conversationScrollContext.actionBarElement,
  });
  observeElement({ element: props.contentFloorElement });
  observeElement({ element: props.secondaryContentMergeTarget });
}

function observeElement({ element }: { element: HTMLElement | null }): void {
  if (element === null || resizeObserver === undefined) {
    return;
  }

  resizeObserver.observe(element);
}

function bindScrollListener(): void {
  removeActiveScrollListener();

  const scrollTarget =
    props.conversationScrollContext.scrollContainerElement ?? window;
  scrollTarget.addEventListener("scroll", requestLayoutUpdate, {
    passive: true,
  });
  removeScrollListener = () => {
    scrollTarget.removeEventListener("scroll", requestLayoutUpdate);
  };
}

function removeActiveScrollListener(): void {
  removeScrollListener?.();
  removeScrollListener = undefined;
}

function getSelectorHeight(): number {
  const element = stickyBarElement.value;
  if (element === null) {
    return 0;
  }

  return Math.max(element.offsetHeight, element.scrollHeight);
}
</script>

<style lang="scss" scoped>
.analysis-cluster-selector-bar {
  position: sticky;
  top: var(--analysis-cluster-selector-top, 0px);
  z-index: 9;
  background-color: white;
  padding: 0.125rem 0;
  transition: top 0.12s ease;
}

.analysis-cluster-selector-bar--stuck {
  box-shadow: 0 1px 0 #e9e9f1;
}

.analysis-cluster-selector-bar__row {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: nowrap;
  gap: 0.35rem;
  min-width: 0;
  overflow: hidden;
}

.analysis-cluster-selector-bar__trigger {
  flex: 1 1 0;
  min-width: 0;
  max-width: 100%;
}

.analysis-cluster-selector-drawer-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.analysis-cluster-selector-drawer-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
  border: 1px solid transparent;
  border-radius: 10px;
  background: white;
  color: #333238;
  padding: 0.9rem 1rem;
  text-align: start;
  font: inherit;
  font-weight: var(--font-weight-medium);
  cursor: pointer;
}

.analysis-cluster-selector-drawer-option--selected {
  background: #e8f1ff;
  color: #6b4eff;
}
</style>
