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

    <PreLoginIntentionDialog
      v-model="showLoginDialog"
      :ok-callback="onLoginConfirmationOk"
      :active-intention="'reportUserContent'"
    />
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

  <!-- Confirmation Dialog -->
  <ZKConfirmDialog
    v-model="commentActions.confirmationState.value.isVisible"
    :message="commentActions.confirmationState.value.message"
    :confirm-text="commentActions.confirmationState.value.confirmText"
    :cancel-text="commentActions.confirmationState.value.cancelText"
    :variant="commentActions.confirmationState.value.variant"
    @confirm="commentActions.handleConfirmation"
    @cancel="commentActions.handleConfirmationCancel"
  />
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import PreLoginIntentionDialog from "src/components/authentication/intention/PreLoginIntentionDialog.vue";
import ReportContentDialog from "src/components/report/ReportContentDialog.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ZKIcon from "src/components/ui-library/ZKIcon.vue";
import ZKActionDialog from "src/components/ui-library/ZKActionDialog.vue";
import ZKConfirmDialog from "src/components/ui-library/ZKConfirmDialog.vue";
import type { OpinionItem } from "src/shared/types/zod";
import type { ContentAction } from "src/utils/actions/core/types";
import { useAuthenticationStore } from "src/stores/authentication";
import { useBackendUserMuteApi } from "src/utils/api/muteUser";
import { useDeleteCommentMutation } from "src/utils/api/comment/useCommentQueries";
import { useWebShare } from "src/utils/share/WebShare";
import { useContentActions } from "src/utils/actions/definitions/content-actions";
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useConversationLoginIntentions } from "src/composables/auth/useConversationLoginIntentions";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  commentActionOptionsTranslations,
  type CommentActionOptionsTranslations,
} from "./CommentActionOptions.i18n";

const emit = defineEmits(["deleted", "mutedComment"]);

const props = defineProps<{
  postSlugId: string;
  commentItem: OpinionItem;
}>();

const { isLoggedIn } = storeToRefs(useAuthenticationStore());

const webShare = useWebShare();

// Use the new content actions system
const commentActions = useContentActions();

const showReportDialog = ref(false);

const router = useRouter();

const { muteUser } = useBackendUserMuteApi();
const deleteCommentMutation = useDeleteCommentMutation();

const showLoginDialog = ref(false);

const { setReportIntention } = useConversationLoginIntentions();

const { t } = useComponentI18n<CommentActionOptionsTranslations>(
  commentActionOptionsTranslations
);

function onLoginConfirmationOk() {
  setReportIntention(props.commentItem.opinionSlugId);
}

function reportContentCallback() {
  if (isLoggedIn.value) {
    showReportDialog.value = true;
  } else {
    showLoginDialog.value = true;
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

async function shareOpinionCallback() {
  const sharePostUrl =
    window.location.origin +
    process.env.VITE_PUBLIC_DIR +
    "/conversation/" +
    props.postSlugId +
    "?opinion=" +
    props.commentItem.opinionSlugId;
  await webShare.share(t("agoraOpinion"), sharePostUrl);
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
  deleteCommentMutation.mutate(props.commentItem.opinionSlugId, {
    onSuccess: () => {
      emit("deleted");
    },
  });
}

function optionButtonClicked() {
  // Show comment actions using the new system
  commentActions.showCommentActions(
    props.commentItem.opinionSlugId,
    props.commentItem.username,
    {
      deleteCommentCallback,
      reportCommentCallback: reportContentCallback,
      openUserReportsCallback,
      muteUserCallback,
      moderateCommentCallback,
      shareOpinionCallback,
    }
  );
}

/**
 * Handle action selection
 */
async function handleActionSelected(action: ContentAction) {
  console.log("Action selected:", action.id);
  await commentActions.executeAction(action);
}

/**
 * Handle dialog close
 */
function handleDialogClosed() {
  commentActions.closeDialog();
}
</script>

<style scoped lang="scss"></style>
