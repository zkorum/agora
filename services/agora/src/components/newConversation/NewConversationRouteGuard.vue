<template>
  <ExitRoutePrompt
    v-model="showExitDialog"
    :title="t('saveConversationDraft')"
    :description="t('draftWillBeHere')"
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
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  newConversationRouteGuardTranslations,
  type NewConversationRouteGuardTranslations,
} from "./NewConversationRouteGuard.i18n";

const { t } = useComponentI18n<NewConversationRouteGuardTranslations>(
  newConversationRouteGuardTranslations
);

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
