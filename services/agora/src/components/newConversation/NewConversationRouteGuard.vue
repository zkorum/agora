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
import ExitRoutePrompt from "src/components/routeGuard/ExitRoutePrompt.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useRouteGuard } from "src/utils/component/routing/routeGuard";
import { onMounted } from "vue";
import { type RouteLocationNormalized } from "vue-router";

import {
  type NewConversationRouteGuardTranslations,
  newConversationRouteGuardTranslations,
} from "./NewConversationRouteGuard.i18n";

interface Props {
  allowedRoutes?: string[];
  hasUnsavedChanges: () => boolean;
  resetDraft: () => void;
}

const props = withDefaults(defineProps<Props>(), {
  allowedRoutes: () => [],
});

const { t } = useComponentI18n<NewConversationRouteGuardTranslations>(
  newConversationRouteGuardTranslations
);

const {
  lockRoute,
  unlockRoute,
  showExitDialog,
  proceedWithNavigation,
  isRouteLockedCheck,
} = useRouteGuard(() => props.hasUnsavedChanges(), onBeforeRouteLeaveCallback);

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

  if (props.hasUnsavedChanges() && isRouteLockedCheck()) {
    return false;
  } else {
    return true;
  }
}

async function saveDraft() {
  await proceedWithNavigation(() => {});
}

async function noSaveDraft() {
  props.resetDraft();
  await proceedWithNavigation(() => {});
}
</script>
