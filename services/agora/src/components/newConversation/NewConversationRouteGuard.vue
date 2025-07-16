<template>
  <ExitRoutePrompt
    v-model="showExitDialog"
    title="Save conversation as draft?"
    description="Your drafted conversation will be here when you return."
    :save-draft="saveDraft"
    :no-save-draft="noSaveDraft"
  />
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { type RouteLocationNormalized } from "vue-router";
import { storeToRefs } from "pinia";
import ExitRoutePrompt from "src/components/routeGuard/ExitRoutePrompt.vue";
import { useRouteGuard } from "src/utils/component/routing/routeGuard";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";

interface Props {
  allowedRoutes?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  allowedRoutes: () => [],
});

const { hasUnsavedChanges, createEmptyDraft } = useNewPostDraftsStore();
const { conversationDraft } = storeToRefs(useNewPostDraftsStore());

const {
  lockRoute,
  unlockRoute,
  showExitDialog,
  proceedWithNavigation,
  isRouteLockedCheck,
} = useRouteGuard(() => hasUnsavedChanges(), onBeforeRouteLeaveCallback);

defineExpose({
  unlockRoute,
});

onMounted(() => {
  lockRoute();
});

function onBeforeRouteLeaveCallback(to: RouteLocationNormalized): boolean {
  if (props.allowedRoutes.some((route) => to.name === route)) {
    return true;
  }

  if (hasUnsavedChanges() && isRouteLockedCheck()) {
    return false;
  } else {
    return true;
  }
}

async function saveDraft() {
  await proceedWithNavigation(() => {});
}

async function noSaveDraft() {
  conversationDraft.value = createEmptyDraft();
  await proceedWithNavigation(() => {});
}
</script>
