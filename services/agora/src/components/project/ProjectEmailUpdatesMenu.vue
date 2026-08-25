<template>
  <ZKButton
    v-if="actions.length > 0"
    button-type="icon"
    flat
    text-color="color-text-weak"
    icon="mdi-dots-vertical"
    size="0.656rem"
    :aria-label="t('projectActions')"
    @click.stop.prevent="showDialog = true"
  />

  <ZKActionDialog
    v-model="showDialog"
    :actions="actions"
    :dialog-label="t('projectActions')"
    @action-selected="handleActionSelected"
  />
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useQuasar } from "quasar";
import {
  createConversationUpdatePreferenceAction,
  resolveEmailUpdatePreferenceChoiceEnabled,
} from "src/components/conversationUpdates/conversationUpdatePreferenceAction";
import {
  type EmailUpdateResumeNotificationTranslations,
  emailUpdateResumeNotificationTranslations,
} from "src/components/conversationUpdates/emailUpdateResumeNotification.i18n";
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
import { useRemoveConversationEmailUpdateSummaryQueries } from "src/utils/api/conversationUpdates/useConversationEmailUpdateQueries";
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
const { t: tEmailUpdateResume } =
  useComponentI18n<EmailUpdateResumeNotificationTranslations>(
    emailUpdateResumeNotificationTranslations
  );
const emailUpdatesApi = useBackendConversationEmailUpdatesApi();
const removeConversationEmailUpdateSummaryQueries =
  useRemoveConversationEmailUpdateSummaryQueries();
const authenticationStore = useAuthenticationStore();
const { isLoggedIn } = storeToRefs(authenticationStore);
const showDialog = ref(false);
const isSavingPreference = ref(false);
const summary =
  ref<
    Extract<ConversationEmailUpdateProjectSummaryResponse, { success: true }>
  >();
let summaryRequestId = 0;
let preferenceMutationGeneration = 0;

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
    const preferenceEnabled = resolveEmailUpdatePreferenceChoiceEnabled(
      participantPreference
    );
    projectActions.push(
      createConversationUpdatePreferenceAction({
        id: "projectEmailUpdatePreference",
        label: t("receiveUpdates"),
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
      label: tab === "compose" ? t("manageUpdates") : t("viewHistory"),
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
  const projectSlug = props.projectSlug;
  if (!isLoggedIn.value) {
    summary.value = undefined;
    return;
  }

  try {
    const response = await emailUpdatesApi.getProjectSummary({
      projectSlug,
    });
    if (requestId !== summaryRequestId || projectSlug !== props.projectSlug) {
      return;
    }
    summary.value = response.success ? response : undefined;
  } catch (error) {
    console.error("Failed to load project Email Update actions", error);
    if (requestId === summaryRequestId && projectSlug === props.projectSlug) {
      summary.value = undefined;
    }
  }
}

async function updatePreference(enabled: boolean): Promise<void> {
  if (isSavingPreference.value) {
    return;
  }

  const previousSummary = summary.value;
  const previousPreference = previousSummary?.participantPreference;
  if (previousSummary === undefined || previousPreference === undefined) {
    return;
  }

  const projectSlug = props.projectSlug;
  const generation = ++preferenceMutationGeneration;
  summaryRequestId += 1;
  isSavingPreference.value = true;
  summary.value = {
    ...previousSummary,
    participantPreference: {
      ...previousPreference,
      state: enabled ? "enabled" : "disabled",
    },
  };
  try {
    const response = await emailUpdatesApi.updatePreference({
      operation: "set_project_preference",
      projectSlug,
      enabled,
      source: { kind: "menu" },
    });
    if (!isCurrentPreferenceMutation({ generation, projectSlug })) {
      return;
    }
    if (
      !response.success ||
      response.result.operation !== "set_project_preference" ||
      response.result.projectSlug !== projectSlug
    ) {
      summary.value = previousSummary;
      notify.showNotifyMessage(t("saveError"));
      await loadSummary();
      return;
    }
    removeConversationEmailUpdateSummaryQueries(response.result);
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
    notify.showNotifyMessage(
      response.result.globalResumed
        ? tEmailUpdateResume("preferenceSavedAndGlobalResumed")
        : t(
            response.result.state === "enabled" ? "saveEnabled" : "saveDisabled"
          )
    );
  } catch (error) {
    if (!isCurrentPreferenceMutation({ generation, projectSlug })) {
      return;
    }
    console.error("Failed to update project Email Update preference", error);
    summary.value = previousSummary;
    notify.showNotifyMessage(t("saveError"));
    await loadSummary();
  } finally {
    if (isCurrentPreferenceMutation({ generation, projectSlug })) {
      isSavingPreference.value = false;
    }
  }
}

function isCurrentPreferenceMutation({
  generation,
  projectSlug,
}: {
  generation: number;
  projectSlug: string;
}): boolean {
  return (
    generation === preferenceMutationGeneration &&
    projectSlug === props.projectSlug
  );
}

async function handleActionSelected(action: ContentAction): Promise<void> {
  if (action.handler !== undefined) {
    await action.handler(actionContext);
  }
}

watch(
  [() => props.projectSlug, isLoggedIn],
  () => {
    preferenceMutationGeneration += 1;
    isSavingPreference.value = false;
    summary.value = undefined;
    showDialog.value = false;
    void loadSummary();
  },
  { immediate: true }
);
</script>
