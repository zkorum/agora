<template>
  <ZKButton
    v-if="actions.length > 0"
    button-type="icon"
    flat
    color="white"
    icon="mdi-dots-horizontal"
    :aria-label="t('projectActions')"
    @click="showDialog = true"
  />

  <ZKActionDialog
    v-model="showDialog"
    :title="t('projectActions')"
    :actions="actions"
    @action-selected="handleActionSelected"
  />
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useQuasar } from "quasar";
import { createConversationUpdatePreferenceAction } from "src/components/conversationUpdates/conversationUpdatePreferenceAction";
import ZKActionDialog from "src/components/ui-library/ZKActionDialog.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { ConversationEmailUpdateProjectSummaryResponse } from "src/shared/types/dto";
import { useAuthenticationStore } from "src/stores/authentication";
import type {
  ContentAction,
  ContentActionContext,
} from "src/utils/actions/core/types";
import { useBackendConversationEmailUpdatesApi } from "src/utils/api/conversationUpdates/conversationEmailUpdates";
import { useNotify } from "src/utils/ui/notify";
import { computed, ref, watch } from "vue";

import {
  type ProjectEmailUpdatesMenuTranslations,
  projectEmailUpdatesMenuTranslations,
} from "./ProjectEmailUpdatesMenu.i18n";

const props = defineProps<{
  projectSlug: string;
}>();

const $q = useQuasar();
const notify = useNotify();
const { t } = useComponentI18n<ProjectEmailUpdatesMenuTranslations>(
  projectEmailUpdatesMenuTranslations
);
const emailUpdatesApi = useBackendConversationEmailUpdatesApi();
const authenticationStore = useAuthenticationStore();
const { isLoggedIn } = storeToRefs(authenticationStore);
const showDialog = ref(false);
const isSavingPreference = ref(false);
const summary =
  ref<
    Extract<ConversationEmailUpdateProjectSummaryResponse, { success: true }>
  >();
let summaryRequestId = 0;

const actionContext: ContentActionContext = {
  isOwner: false,
  isSiteModerator: false,
  isConversationOwner: false,
  isOrgMember: false,
  isLoggedIn: true,
  isEmbeddedMode: false,
  targetType: "post",
  targetId: "project",
  targetAuthor: "",
};

const actions = computed<ContentAction[]>(() => {
  const currentSummary = summary.value;
  if (currentSummary === undefined) {
    return [];
  }

  const projectActions: ContentAction[] = [];
  const participantPreference = currentSummary.participantPreference;
  if (participantPreference !== undefined) {
    const preferenceEnabled = participantPreference.state === "enabled";
    const description =
      participantPreference.state === "enabled"
        ? participantPreference.resolvedEnabled
          ? t("preferenceOn")
          : t("preferenceOnPaused")
        : participantPreference.state === "disabled"
          ? t("preferenceOff")
          : t("preferenceDefault");
    projectActions.push(
      createConversationUpdatePreferenceAction({
        id: "projectEmailUpdatePreference",
        label: t("receiveUpdates"),
        description,
        disabled: isSavingPreference.value,
        enabled: preferenceEnabled,
        onToggle: () => {
          void updatePreference(!preferenceEnabled);
        },
      })
    );
  }

  if (currentSummary.authoringAction !== "none") {
    const tab = currentSummary.authoringAction;
    projectActions.push({
      id: "projectEmailUpdateWorkspace",
      label: tab === "compose" ? t("sendUpdate") : t("updateHistory"),
      description:
        tab === "compose"
          ? t("sendUpdateDescription")
          : t("updateHistoryDescription"),
      icon: tab === "compose" ? "mdi-email-edit-outline" : "mdi-history",
      trailingIcon: $q.lang.rtl ? "mdi-chevron-left" : "mdi-chevron-right",
      to: {
        path: "/email-updates/",
        query: { tab, projectSlug: props.projectSlug },
      },
      isVisible: () => true,
    });
  }

  return projectActions;
});

async function loadSummary(): Promise<void> {
  const requestId = ++summaryRequestId;
  if (!isLoggedIn.value) {
    summary.value = undefined;
    return;
  }

  try {
    const response = await emailUpdatesApi.getProjectSummary({
      projectSlug: props.projectSlug,
    });
    if (requestId !== summaryRequestId) {
      return;
    }
    summary.value = response.success ? response : undefined;
  } catch (error) {
    console.error("Failed to load project Email Update actions", error);
    if (requestId === summaryRequestId) {
      summary.value = undefined;
    }
  }
}

async function updatePreference(enabled: boolean): Promise<void> {
  if (isSavingPreference.value) {
    return;
  }

  isSavingPreference.value = true;
  try {
    const response = await emailUpdatesApi.updatePreference({
      operation: "set_project_preference",
      projectSlug: props.projectSlug,
      enabled,
      source: "menu",
    });
    if (!response.success) {
      notify.showNotifyMessage(t("saveError"));
      return;
    }
    if (response.result.operation === "set_project_preference") {
      const currentSummary = summary.value;
      if (currentSummary?.participantPreference !== undefined) {
        summary.value = {
          ...currentSummary,
          participantPreference: {
            ...currentSummary.participantPreference,
            state: response.result.state,
          },
        };
      }
    }
  } catch (error) {
    console.error("Failed to update project Email Update preference", error);
    notify.showNotifyMessage(t("saveError"));
  } finally {
    isSavingPreference.value = false;
  }
}

async function handleActionSelected(action: ContentAction): Promise<void> {
  if (action.handler !== undefined) {
    await action.handler(actionContext);
  }
}

watch(
  [() => props.projectSlug, isLoggedIn],
  () => {
    void loadSummary();
  },
  { immediate: true }
);
</script>

<style scoped lang="scss">
:deep(.quasarBtn) {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 999px;
  background: rgba($ink-base, 0.78);
  box-shadow: 0 0.25rem 1rem rgba(10, 7, 20, 0.14);
}
</style>
