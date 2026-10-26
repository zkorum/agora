<template>
  <div>
    <ZKButton
      button-type="icon"
      flat
      @click.stop.prevent="optionButtonClicked()"
    >
      <ZKIcon
        color="black"
        name="iconamoon:menu-kebab-horizontal-bold"
        size="1rem"
      />
    </ZKButton>
  </div>

  <q-dialog v-model="showReportDialog">
    <ReportContentDialog
      :opinion-slug-id="props.commentItem.opinionSlugId"
      report-type="opinion"
      @close="showReportDialog = false"
    />
  </q-dialog>

  <!-- Action Dialog -->
  <ZKActionDialog
    v-model="commentActions.dialogState.value.isVisible"
    :actions="commentActions.dialogState.value.actions"
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
    v-model="commentActions.confirmationState.value.isVisible"
    :message="commentActions.confirmationState.value.message"
    :actions="commentActions.confirmationState.value.actions"
    @confirm="commentActions.handleConfirmation"
    @cancel="commentActions.handleConfirmationCancel"
  />
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { copyToClipboard } from "quasar";
import { opinionEditingTranslations } from "src/components/post/comments/opinionEditing.i18n";
import ReportContentDialog from "src/components/report/ReportContentDialog.vue";
import ZKActionDialog from "src/components/ui-library/ZKActionDialog.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ZKConfirmDialog from "src/components/ui-library/ZKConfirmDialog.vue";
import ZKIcon from "src/components/ui-library/ZKIcon.vue";
import { useShareActions } from "src/composables/share/useShareActions";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { DisplayedOpinionItem, OpinionItem } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import type { ContentAction } from "src/utils/actions/core/types";
import { useContentActions } from "src/utils/actions/definitions/content-actions";
import { useDeleteCommentMutation } from "src/utils/api/comment/useCommentQueries";
import { useBackendUserMuteApi } from "src/utils/api/muteUser";
import {
  type ConversationRouteContext,
  getOpinionShareUrl,
} from "src/utils/router/conversationRouteContext";
import { getConversationSurveyVerifyHardPath } from "src/utils/survey/navigation";
import { useNotify } from "src/utils/ui/notify";
import { ref, watch } from "vue";
import { useRouter } from "vue-router";

import {
  type CommentActionOptionsTranslations,
  commentActionOptionsTranslations,
} from "./CommentActionOptions.i18n";

const props = defineProps<{
  postSlugId: string;
  commentItem: OpinionItem;
  conversationAuthorUsername: string;
  conversationOrganizationName: string;
  conversationRouteContext: ConversationRouteContext;
  editableOpinion: DisplayedOpinionItem | undefined;
  editingOpinionSlugId: string | undefined;
}>();

const emit = defineEmits<{
  deleted: [];
  mutedComment: [];
  editOpinion: [opinion: DisplayedOpinionItem];
}>();

const { isLoggedIn } = storeToRefs(useAuthenticationStore());

const shareActions = useShareActions();
const notify = useNotify();

// Use the new content actions system
const commentActions = useContentActions();

const showReportDialog = ref(false);

const router = useRouter();

const { muteUser } = useBackendUserMuteApi();
const deleteCommentMutation = useDeleteCommentMutation();

const { t } = useComponentI18n<CommentActionOptionsTranslations>(
  commentActionOptionsTranslations
);
const { t: editT } = useComponentI18n(opinionEditingTranslations);

async function reportContentCallback() {
  if (isLoggedIn.value) {
    showReportDialog.value = true;
  } else {
    await router.push({
      path: getConversationSurveyVerifyHardPath({
        conversationSlugId: props.postSlugId,
        routeContext: props.conversationRouteContext,
      }),
    });
  }
}

async function openUserReportsCallback() {
  await router.push({
    name: "/reports/[reportType]/[conversationSlugId]/[[opinionSlugId]]",
    params: {
      reportType: "opinion",
      opinionSlugId: props.commentItem.opinionSlugId,
      conversationSlugId: props.postSlugId,
    },
  });
}

function shareOpinionCallback() {
  const sharePostUrl = getOpinionShareUrl({
    conversationSlugId: props.postSlugId,
    opinionSlugId: props.commentItem.opinionSlugId,
    routeContext: props.conversationRouteContext,
  });

  shareActions.showShareActions({
    targetType: "comment",
    targetId: props.commentItem.opinionSlugId,
    targetAuthor: props.commentItem.username,
    copyLinkCallback: async () => {
      await copyToClipboard(sharePostUrl);
      notify.showCopiedToClipboard();
    },
    showShareVia: true,
    shareUrl: sharePostUrl,
    shareTitle: t("agoraOpinion"),
  });
}

async function muteUserCallback() {
  await muteUser(props.commentItem.username, "mute");
  emit("mutedComment");
}

async function moderateCommentCallback() {
  await router.push({
    name: "/moderate/conversation/[conversationSlugId]/opinion/[opinionSlugId]/",
    params: {
      conversationSlugId: props.postSlugId,
      opinionSlugId: props.commentItem.opinionSlugId,
    },
  });
}

function deleteCommentCallback() {
  deleteCommentMutation.mutate(
    {
      commentSlugId: props.commentItem.opinionSlugId,
      conversationSlugId: props.postSlugId,
      moderation: props.commentItem.moderation,
    },
    {
      onSuccess: () => {
        emit("deleted");
      },
    }
  );
}

function optionButtonClicked() {
  const editableOpinion = props.editableOpinion;
  const editing = editableOpinion?.management?.editing;
  const edit =
    editableOpinion !== undefined &&
    (editing?.allowed === true ||
      editableOpinion.management?.canDelete === true)
      ? {
          disabled:
            editing?.allowed !== true ||
            props.editingOpinionSlugId !== undefined,
          description:
            editing?.allowed === false
              ? editT(
                  editing.reason === "has_votes" ? "hasVotes" : "unavailable"
                )
              : undefined,
          handler: () => emit("editOpinion", editableOpinion),
        }
      : undefined;
  // Show comment actions using the new system
  commentActions.showCommentActions({
    targetId: props.commentItem.opinionSlugId,
    targetAuthor: props.commentItem.username,
    conversationAuthorUsername: props.conversationAuthorUsername,
    conversationOrganizationName: props.conversationOrganizationName,
    callbacks: {
      deleteCommentCallback,
      reportCommentCallback: () => {
        void reportContentCallback();
      },
      openUserReportsCallback,
      muteUserCallback,
      moderateCommentCallback,
      shareOpinionCallback,
      edit,
      canDelete: props.commentItem.management?.canDelete === true,
    },
  });
}

/**
 * Handle action selection
 */
async function handleActionSelected(action: ContentAction) {
  if (
    action.id === "edit" &&
    (props.editableOpinion?.management?.editing.allowed !== true ||
      props.editingOpinionSlugId !== undefined)
  ) {
    commentActions.closeDialog();
    return;
  }
  await commentActions.executeAction(action);
}

watch(
  [
    () => props.commentItem.management,
    () => props.editableOpinion?.management,
    () => props.editingOpinionSlugId,
  ],
  () => {
    if (commentActions.dialogState.value.isVisible) optionButtonClicked();
  }
);

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
  commentActions.closeDialog();
}
</script>

<style scoped lang="scss"></style>
