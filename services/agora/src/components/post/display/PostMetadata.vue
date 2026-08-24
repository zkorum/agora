<template>
  <div>
    <div class="container">
      <div v-if="props.showIdentityCard">
        <UserIdentityCard
          :author-verified="authorVerified"
          :created-at="createdAt"
          :is-edited="isEdited"
          :user-identity="
            props.organizationName == ''
              ? posterUserName
              : props.organizationName
          "
          :show-verified-text="false"
          :organization-image-url="props.organizationUrl"
          :show-avatar-fallback="props.organizationName == ''"
          :participation-mode="props.participationMode"
        />
      </div>

      <div class="actions-container">
        <!-- Three-dot menu -->
        <ZKButton
          button-type="icon"
          flat
          text-color="color-text-weak"
          icon="mdi-dots-vertical"
          size="0.656rem"
          @click.stop.prevent="clickedMoreIcon()"
        />
      </div>
    </div>
  </div>

  <q-dialog v-model="showReportDialog">
    <ReportContentDialog
      :opinion-slug-id="props.postSlugId"
      report-type="conversation"
      @close="showReportDialog = false"
    />
  </q-dialog>

  <PreParticipationIntentionDialog
    v-model="showLoginDialog"
    :ok-callback="() => onLoginConfirmationOk()"
    active-intention="reportUserContent"
  />

  <!-- Action Dialog -->
  <ZKActionDialog
    v-model="postActions.dialogState.value.isVisible"
    :actions="postActions.dialogState.value.actions"
    @action-selected="handleActionSelected"
    @dialog-closed="handleDialogClosed"
  />

  <!-- Share Actions Dialog -->
  <ZKActionDialog
    v-model="shareActions.dialogState.value.isVisible"
    :actions="shareActions.dialogState.value.actions"
    @action-selected="handleShareActionSelected"
    @dialog-closed="shareActions.closeDialog"
  />

  <!-- Confirmation Dialog -->
  <ZKConfirmDialog
    v-model="postActions.confirmationState.value.isVisible"
    :message="postActions.confirmationState.value.message"
    :confirm-text="postActions.confirmationState.value.confirmText"
    :cancel-text="postActions.confirmationState.value.cancelText"
    :variant="postActions.confirmationState.value.variant"
    @confirm="postActions.handleConfirmation"
    @cancel="postActions.handleConfirmationCancel"
  />

  <!-- Close Conversation Confirmation Dialog -->
  <ZKConfirmDialog
    v-model="showCloseDialog"
    :message="t('closeConfirmMessage')"
    :confirm-text="t('closeConfirmButton')"
    :cancel-text="t('cancelButton')"
    variant="default"
    @confirm="handleCloseConfirm"
  />

  <!-- Reopen Conversation Confirmation Dialog -->
  <ZKConfirmDialog
    v-model="showReopenDialog"
    :message="t('reopenConfirmMessage')"
    :confirm-text="t('reopenConfirmButton')"
    :cancel-text="t('cancelButton')"
    variant="default"
    @confirm="handleReopenConfirm"
  />
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { copyToClipboard, useQuasar } from "quasar";
import PreParticipationIntentionDialog from "src/components/authentication/intention/PreParticipationIntentionDialog.vue";
import { createConversationUpdatePreferenceAction } from "src/components/conversationUpdates/conversationUpdatePreferenceAction";
import UserIdentityCard from "src/components/features/user/UserIdentityCard.vue";
import ReportContentDialog from "src/components/report/ReportContentDialog.vue";
import ZKActionDialog from "src/components/ui-library/ZKActionDialog.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ZKConfirmDialog from "src/components/ui-library/ZKConfirmDialog.vue";
import { useConversationLoginIntentions } from "src/composables/auth/useConversationLoginIntentions";
import { useShareActions } from "src/composables/share/useShareActions";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { ConversationEmailUpdateConversationSummaryResponse } from "src/shared/types/dto";
import type {
  ConversationTypeConfig,
  ExternalSourceConfig,
  ParticipationMode,
} from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import type { ContentAction } from "src/utils/actions/core/types";
import { useContentActions } from "src/utils/actions/definitions/content-actions";
import { useBackendConversationEmailUpdatesApi } from "src/utils/api/conversationUpdates/conversationEmailUpdates";
import { useMaxDiffApi } from "src/utils/api/maxdiff/maxdiff";
import { useBackendUserMuteApi } from "src/utils/api/muteUser";
import {
  useCloseConversationMutation,
  useOpenConversationMutation,
} from "src/utils/api/post/useConversationMutations";
import { useInvalidateFeedQuery } from "src/utils/api/post/useFeedQuery";
import {
  type ConversationRouteContext,
  normalConversationRouteContext,
} from "src/utils/router/conversationRouteContext";
import { useEmbedMode } from "src/utils/ui/embedMode";
import { useNotify } from "src/utils/ui/notify";
import { useConversationUrl } from "src/utils/url/conversationUrl";
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  type PostMetadataTranslations,
  postMetadataTranslations,
} from "./PostMetadata.i18n";

const props = withDefaults(
  defineProps<{
    authorVerified: boolean;
    posterUserName: string;
    authorUsername: string;
    createdAt: Date;
    isEdited: boolean;
    postSlugId: string;
    organizationUrl: string;
    organizationName: string;
    participationMode: ParticipationMode;
    isClosed: boolean;
    conversationTitle: string;
    conversationTypeConfig: ConversationTypeConfig;
    externalSourceConfig: ExternalSourceConfig | null;
    showIdentityCard?: boolean;
    projectSlug?: string;
  }>(),
  {
    showIdentityCard: true,
    projectSlug: undefined,
  }
);

const emit = defineEmits<{
  openModerationHistory: [];
  conversationDeleted: [];
}>();

const router = useRouter();
const route = useRoute();
const { isEmbeddedMode } = useEmbedMode();

// Use the new content actions system
const postActions = useContentActions();

const { isLoggedIn } = storeToRefs(useAuthenticationStore());
const conversationEmailUpdatesApi = useBackendConversationEmailUpdatesApi();

const { muteUser } = useBackendUserMuteApi();
const { invalidateFeed } = useInvalidateFeedQuery();

const closeConversationMutation = useCloseConversationMutation();
const openConversationMutation = useOpenConversationMutation();
const { t } = useComponentI18n<PostMetadataTranslations>(
  postMetadataTranslations
);

const showReportDialog = ref(false);
const showLoginDialog = ref(false);
const showCloseDialog = ref(false);
const showReopenDialog = ref(false);

const { setReportIntention } = useConversationLoginIntentions();

const $q = useQuasar();
const notify = useNotify();
const { getEmbedUrl, getConversationUrl } = useConversationUrl();
const shareActions = useShareActions();
const isMaxDiffConversation = computed(
  () =>
    props.conversationTypeConfig.conversationType === "ranking" &&
    props.conversationTypeConfig.rankingMode === "bws"
);
const isRankingConversation = computed(
  () => props.conversationTypeConfig.conversationType === "ranking"
);

const conversationRouteContext = computed<ConversationRouteContext>(() => {
  if (props.projectSlug !== undefined) {
    return { kind: "project", projectSlug: props.projectSlug };
  }

  return normalConversationRouteContext;
});

function onLoginConfirmationOk() {
  setReportIntention("");
}

function reportContentCallback() {
  if (isLoggedIn.value) {
    showReportDialog.value = true;
  } else {
    showLoginDialog.value = true;
  }
}

async function openUserReportsCallback() {
  if (props.projectSlug !== undefined) {
    openRegularAppRouteInNewTab({
      name: "/reports/[reportType]/[conversationSlugId]/[[opinionSlugId]]",
      params: {
        reportType: "conversation",
        conversationSlugId: props.postSlugId,
      },
    });
    return;
  }

  await router.push({
    name: "/reports/[reportType]/[conversationSlugId]/[[opinionSlugId]]",
    params: {
      reportType: "conversation",
      conversationSlugId: props.postSlugId,
    },
  });
}

async function muteUserCallback() {
  const isSuccessful = await muteUser(props.posterUserName, "mute");
  if (isSuccessful) {
    invalidateFeed();
  }
}

async function moderatePostCallback() {
  if (props.projectSlug !== undefined) {
    openRegularAppRouteInNewTab({
      name: "/moderate/conversation/[conversationSlugId]/",
      params: { conversationSlugId: props.postSlugId },
    });
    return;
  }

  await router.push({
    name: "/moderate/conversation/[conversationSlugId]/",
    params: { conversationSlugId: props.postSlugId },
  });
}

async function moderationHistoryCallback() {
  if (route.name == "/conversation/[postSlugId]/" || isEmbeddedMode()) {
    emit("openModerationHistory");
  } else if (props.projectSlug !== undefined) {
    await router.push({
      path: `/project/${props.projectSlug}/conversation/${props.postSlugId}`,
      query: { filter: "moderated" },
    });
  } else {
    await router.push({
      name: "/conversation/[postSlugId]/",
      params: { postSlugId: props.postSlugId },
      query: { filter: "moderated" },
    });
  }
}

async function copyEmbedLinkCallback() {
  const embedUrl = getEmbedUrl(props.postSlugId);
  await copyToClipboard(embedUrl);
  notify.showCopiedToClipboard();
}

async function exportConversationCallback() {
  if (props.projectSlug !== undefined) {
    openRegularAppRouteInNewTab({
      name: "/conversation/[conversationSlugId]/export",
      params: { conversationSlugId: props.postSlugId },
    });
    return;
  }

  await router.push({
    name: "/conversation/[conversationSlugId]/export",
    params: { conversationSlugId: props.postSlugId },
  });
}

function openInAgoraCallback() {
  openRegularAppRouteInNewTab({
    name: "/conversation/[postSlugId]/",
    params: { postSlugId: props.postSlugId },
  });
}

async function editConversationCallback() {
  if (props.projectSlug !== undefined) {
    openRegularAppRouteInNewTab({
      name: "/conversation/[conversationSlugId]/edit/",
      params: { conversationSlugId: props.postSlugId },
      query: { returnTo: route.fullPath },
    });
    return;
  }

  await router.push({
    name: "/conversation/[conversationSlugId]/edit/",
    params: { conversationSlugId: props.postSlugId },
    query: { returnTo: route.fullPath },
  });
}

function shareCallback() {
  const sharePostUrl = getConversationUrl({
    conversationSlugId: props.postSlugId,
    routeContext: conversationRouteContext.value,
  });
  const shareTitle = "Agora - " + props.conversationTitle;

  shareActions.showShareActions({
    targetType: "post",
    targetId: props.postSlugId,
    targetAuthor: props.authorUsername,
    copyLinkCallback: async () => {
      await copyToClipboard(sharePostUrl);
      notify.showCopiedToClipboard();
    },
    openQrCodeCallback: async () => {
      const { default: ShareDialog } = await import("../ShareDialog.vue");
      $q.dialog({
        component: ShareDialog,
        componentProps: {
          url: sharePostUrl,
        },
      });
    },
    showShareVia: true,
    shareUrl: sharePostUrl,
    shareTitle,
  });
}

const { syncMaxDiff } = useMaxDiffApi();

async function syncGitHubCallback(): Promise<void> {
  const result = await syncMaxDiff({ conversationSlugId: props.postSlugId });
  if (result.status === "success") {
    notify.showNotifyMessage({
      message: t("syncSuccess"),
      icon: "mdi-check-circle-outline",
    });
  } else {
    notify.showNotifyMessage({
      message: t("syncError"),
      icon: "mdi-close-circle-outline",
    });
  }
}

async function conversationDeletedCallback(): Promise<void> {
  emit("conversationDeleted");

  if (props.projectSlug !== undefined) {
    await router.push({ path: `/project/${props.projectSlug}` });
    return;
  }

  const slugPrefix = `/conversation/${props.postSlugId}`;
  if (route.path === slugPrefix || route.path.startsWith(`${slugPrefix}/`)) {
    await router.push({ name: "/" });
  }
}

type ConversationEmailUpdateSummary = Extract<
  ConversationEmailUpdateConversationSummaryResponse,
  { success: true }
>;

const conversationEmailUpdateSummary = ref<
  ConversationEmailUpdateSummary | undefined
>(undefined);
const isSavingConversationEmailUpdatePreference = ref(false);
let conversationEmailUpdateSummaryRequestId = 0;

async function clickedMoreIcon(): Promise<void> {
  const showSyncGitHub =
    isMaxDiffConversation.value &&
    props.externalSourceConfig?.sourceType === "github_issue";

  postActions.showPostActions(
    props.postSlugId,
    props.posterUserName,
    props.organizationName,
    {
      reportPostCallback: reportContentCallback,
      openUserReportsCallback,
      muteUserCallback,
      moderatePostCallback,
      moderationHistoryCallback,
      copyEmbedLinkCallback,
      editConversationCallback,
      exportConversationCallback,
      openInAgoraCallback:
        props.projectSlug === undefined ? null : openInAgoraCallback,
      shareCallback,
      syncGitHubCallback: showSyncGitHub ? syncGitHubCallback : null,
      openConversationCallback: () => {
        showReopenDialog.value = true;
      },
      closeConversationCallback: () => {
        showCloseDialog.value = true;
      },
      isConversationClosed: props.isClosed,
      isConversationExportAvailable: !isRankingConversation.value,
      conversationDeletedCallback,
    }
  );

  if (props.projectSlug !== undefined) {
    postActions.dialogState.value.actions =
      postActions.dialogState.value.actions.map((action) =>
        regularAppToolActionIds.has(action.id)
          ? { ...action, trailingIcon: "mdi-open-in-new" }
          : action
      );
  }

  await loadConversationUpdateActions();
}

async function loadConversationUpdateActions(): Promise<void> {
  const requestId = ++conversationEmailUpdateSummaryRequestId;
  try {
    const response = await conversationEmailUpdatesApi.getConversationSummary({
      conversationSlugId: props.postSlugId,
    });
    if (requestId !== conversationEmailUpdateSummaryRequestId) {
      return;
    }
    conversationEmailUpdateSummary.value = response.success
      ? response
      : undefined;
  } catch (error) {
    if (requestId !== conversationEmailUpdateSummaryRequestId) {
      return;
    }
    console.error("Failed to load Email Update conversation summary", error);
    conversationEmailUpdateSummary.value = undefined;
  }
  addConversationUpdateActions();
}

function addConversationUpdateActions(): void {
  const existingActions = postActions.dialogState.value.actions.filter(
    (action) =>
      action.id !== "conversationEmailUpdates" &&
      action.id !== "manageConversationEmailUpdates"
  );
  const additions: ContentAction[] = [];
  const summary = conversationEmailUpdateSummary.value;

  if (
    summary?.authoringAction !== undefined &&
    summary.authoringAction !== "none"
  ) {
    const destinationTab = summary.authoringAction;
    additions.push({
      id: "manageConversationEmailUpdates",
      label: t("emailUpdatesLabel"),
      icon: "mdi-email-edit-outline",
      handler: () => {
        openConversationEmailUpdates(destinationTab);
      },
      isVisible: () => true,
    });
  }

  const participantPreference = summary?.participantPreference;
  if (participantPreference !== undefined) {
    const enabled = participantPreference.resolvedEnabled;
    const description =
      participantPreference.state === "enabled"
        ? t("emailUpdatesPreferenceOn")
        : participantPreference.state === "disabled"
          ? t("emailUpdatesPreferenceOff")
          : t("emailUpdatesPreferenceUndisclosed");
    additions.push(
      createConversationUpdatePreferenceAction({
        id: "conversationEmailUpdates",
        label: t("receiveEmailUpdatesLabel"),
        enabled,
        description,
        disabled: isSavingConversationEmailUpdatePreference.value,
        onToggle: () => {
          void updateConversationUpdatePreference(!enabled);
        },
      })
    );
  }

  const destructiveIndex = existingActions.findIndex(
    (action) => action.variant === "destructive"
  );
  if (destructiveIndex === -1) {
    postActions.dialogState.value.actions = [...existingActions, ...additions];
    return;
  }
  postActions.dialogState.value.actions = [
    ...existingActions.slice(0, destructiveIndex),
    ...additions,
    ...existingActions.slice(destructiveIndex),
  ];
}

async function updateConversationUpdatePreference(
  enabled: boolean
): Promise<void> {
  if (isSavingConversationEmailUpdatePreference.value) {
    return;
  }
  const previousSummary = conversationEmailUpdateSummary.value;
  const previousPreference = previousSummary?.participantPreference;
  if (previousSummary === undefined || previousPreference === undefined) {
    return;
  }
  conversationEmailUpdateSummaryRequestId += 1;
  isSavingConversationEmailUpdatePreference.value = true;
  conversationEmailUpdateSummary.value = {
    ...previousSummary,
    participantPreference: {
      ...previousPreference,
      state: enabled ? "enabled" : "disabled",
    },
  };
  addConversationUpdateActions();

  try {
    const response = await conversationEmailUpdatesApi.updatePreference({
      operation: "set_conversation_preference",
      conversationSlugId: props.postSlugId,
      enabled,
      source: "menu",
    });
    if (!response.success) {
      await loadConversationUpdateActions();
      notify.showNotifyMessage(t("emailUpdatesPreferenceSaveError"));
      return;
    }
    await loadConversationUpdateActions();
  } catch (error) {
    console.error("Failed to update Email Update preference", error);
    await loadConversationUpdateActions();
    notify.showNotifyMessage(t("emailUpdatesPreferenceSaveError"));
  } finally {
    isSavingConversationEmailUpdatePreference.value = false;
    addConversationUpdateActions();
  }
}

function openConversationEmailUpdates(tab: "compose" | "history"): void {
  void router.push({
    path: "/email-updates/",
    query: {
      tab,
      conversationSlugId: props.postSlugId,
    },
  });
}

const regularAppToolActionIds = new Set([
  "edit",
  "exportConversation",
  "moderate",
  "userReports",
]);

function openRegularAppRouteInNewTab(
  to: Parameters<typeof router.resolve>[0]
): void {
  const resolved = router.resolve(to);
  window.open(resolved.href, "_blank", "noopener,noreferrer");
}

/**
 * Handle action selection
 */
async function handleActionSelected(action: ContentAction) {
  await postActions.executeAction(action);
}

/**
 * Handle share action selection
 */
async function handleShareActionSelected(action: ContentAction) {
  await shareActions.executeAction(action);
}

/**
 * Handle dialog close
 */
function handleDialogClosed() {
  postActions.closeDialog();
}

/**
 * Handle close confirmation
 */
function handleCloseConfirm() {
  // TanStack Query mutation handles all success/error states and cache updates
  closeConversationMutation.mutate({
    conversationSlugId: props.postSlugId,
  });
}

/**
 * Handle reopen confirmation
 */
function handleReopenConfirm() {
  // TanStack Query mutation handles all success/error states and cache updates
  openConversationMutation.mutate({
    conversationSlugId: props.postSlugId,
  });
}
</script>

<style scoped lang="scss">
.container {
  display: flex;
  gap: 1rem;
  align-items: start;
  justify-content: space-between;
  color: $color-text-weak;
}

.iconSizeLarge {
  width: 4rem;
}

.reportDialog {
  background-color: white;
}

.identityFlex {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.actions-container {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
</style>
