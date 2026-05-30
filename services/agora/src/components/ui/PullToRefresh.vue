<template>
  <div
    @mousedown.capture="updateBoundaryState"
    @touchstart.capture="updateBoundaryState"
  >
    <div
      v-if="hasCustomBoundary"
      ref="scrollProxyElement"
      class="scrollProxy"
      aria-hidden="true"
    >
      <div class="scrollProxyContent"></div>
    </div>

    <q-pull-to-refresh
      :bg-color="bgColor"
      :color="color"
      :disable="isDisabled"
      :icon="icon"
      :no-mouse="noMouse"
      :scroll-target="effectiveScrollTarget"
      @refresh="handleRefresh"
    >
      <slot />
    </q-pull-to-refresh>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";

defineOptions({ name: "PullToRefresh" });

const props = withDefaults(
  defineProps<{
    bgColor?: string;
    boundaryScrollContainer?: HTMLElement | null;
    canRefresh?: PullToRefreshBoundaryPredicate;
    color?: string;
    disabled?: boolean;
    icon?: string;
    noMouse?: boolean;
    scrollTarget?: HTMLElement | string;
  }>(),
  {
    bgColor: undefined,
    boundaryScrollContainer: undefined,
    canRefresh: undefined,
    color: undefined,
    disabled: false,
    icon: undefined,
    noMouse: false,
    scrollTarget: undefined,
  }
);
const emit = defineEmits<{
  refresh: [done: PullToRefreshDone];
}>();
type PullToRefreshDone = () => void;
type PullToRefreshBoundaryPredicate = () => boolean;

const scrollProxyElement = ref<HTMLElement | null>(null);
let cleanupBoundaryListeners: (() => void) | undefined;

const hasCustomBoundary = computed(() => props.canRefresh !== undefined);

const isDisabled = computed(
  () =>
    props.disabled ||
    (hasCustomBoundary.value && scrollProxyElement.value === null)
);

const effectiveScrollTarget = computed<HTMLElement | string | undefined>(() => {
  if (hasCustomBoundary.value) {
    return scrollProxyElement.value ?? undefined;
  }

  return props.scrollTarget;
});

function setProxyScrollPosition(canRefresh: boolean): void {
  const proxyElement = scrollProxyElement.value;
  if (proxyElement === null) {
    return;
  }

  proxyElement.scrollTop = canRefresh ? 0 : 1;
}

function updateBoundaryState(): void {
  const canRefresh = props.canRefresh;
  if (canRefresh === undefined) {
    return;
  }

  setProxyScrollPosition(canRefresh());
}

function handleRefresh(done: PullToRefreshDone): void {
  emit("refresh", done);
}

function setupBoundaryListeners(): void {
  cleanupBoundaryListeners?.();
  cleanupBoundaryListeners = undefined;

  if (props.canRefresh === undefined || typeof window === "undefined") {
    return;
  }

  const scrollTarget = props.boundaryScrollContainer ?? window;
  scrollTarget.addEventListener("scroll", updateBoundaryState, {
    passive: true,
  });
  window.addEventListener("resize", updateBoundaryState, { passive: true });
  window.addEventListener("orientationchange", updateBoundaryState, {
    passive: true,
  });

  cleanupBoundaryListeners = () => {
    scrollTarget.removeEventListener("scroll", updateBoundaryState);
    window.removeEventListener("resize", updateBoundaryState);
    window.removeEventListener("orientationchange", updateBoundaryState);
  };
}

watch(
  () => props.boundaryScrollContainer,
  async () => {
    setupBoundaryListeners();
    await nextTick();
    updateBoundaryState();
  }
);

watch(
  () => props.canRefresh,
  async () => {
    setupBoundaryListeners();
    await nextTick();
    updateBoundaryState();
  }
);

watch(scrollProxyElement, updateBoundaryState);

onMounted(async () => {
  setupBoundaryListeners();
  await nextTick();
  updateBoundaryState();
});

onBeforeUnmount(() => {
  cleanupBoundaryListeners?.();
});
</script>

<style scoped lang="scss">
.scrollProxy {
  position: fixed;
  inset-block-start: -100px;
  inset-inline-start: -100px;
  width: 1px;
  height: 1px;
  overflow-y: scroll;
  pointer-events: none;
  opacity: 0;
}

.scrollProxyContent {
  height: 2px;
}
</style>
