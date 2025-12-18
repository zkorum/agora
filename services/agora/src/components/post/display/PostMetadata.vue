<template>
  <div>
    <div class="container">
      <div>
        <UserIdentityCard
          :author-verified="authorVerified"
          :created-at="createdAt"
          :user-identity="
            props.organizationName == ''
              ? posterUserName
              : props.organizationName
          "
          :show-verified-text="false"
          :organization-image-url="props.organizationUrl"
          :is-guest-participation-allowed="!props.isLoginRequired"
        />
      </div>

      <div>
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

  <PreLoginIntentionDialog
    v-model="showLoginDialog"
    :ok-callback="() => onLoginConfirmationOk()"
    :active-intention="'reportUserContent'"
  />

  <!-- Action Dialog -->
  <ZKActionDialog
    v-model="postActions.dialogState.value.isVisible"
    :actions="postActions.dialogState.value.actions"
    @action-selected="handleActionSelected"
    @dialog-closed="handleDialogClosed"
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
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import PreLoginIntentionDialog from "src/components/authentication/intention/PreLoginIntentionDialog.vue";
import UserIdentityCard from "src/components/features/user/UserIdentityCard.vue";
import ReportContentDialog from "src/components/report/ReportContentDialog.vue";
import ZKActionDialog from "src/components/ui-library/ZKActionDialog.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ZKConfirmDialog from "src/components/ui-library/ZKConfirmDialog.vue";
import { useConversationLoginIntentions } from "src/composables/auth/useConversationLoginIntentions";
import { useAuthenticationStore } from "src/stores/authentication";
import { useHomeFeedStore } from "src/stores/homeFeed";
import type { ContentAction } from "src/utils/actions/core/types";
import { useContentActions } from "src/utils/actions/definitions/content-actions";
import { useBackendUserMuteApi } from "src/utils/api/muteUser";
import { useWebShare } from "src/utils/share/WebShare";
import { useConversationUrl } from "src/utils/url/conversationUrl";
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";

const props = defineProps<{
  authorVerified: boolean;
  posterUserName: string;
  createdAt: Date;
  postSlugId: string;
  organizationUrl: string;
  organizationName: string;
  isLoginRequired: boolean;
}>();

const emit = defineEmits<{
  openModerationHistory: [];
}>();

const router = useRouter();
const route = useRoute();

// Use the new content actions system
const postActions = useContentActions();

const { isLoggedIn } = storeToRefs(useAuthenticationStore());

const { muteUser } = useBackendUserMuteApi();
const { loadPostData } = useHomeFeedStore();

const showReportDialog = ref(false);

const showLoginDialog = ref(false);

const { setReportIntention } = useConversationLoginIntentions();

const webShare = useWebShare();
const { getEmbedUrl } = useConversationUrl();

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
    await loadPostData();
  }
}

async function moderatePostCallback() {
  await router.push({
    name: "/moderate/conversation/[conversationSlugId]/",
    params: { conversationSlugId: props.postSlugId },
  });
}

async function moderationHistoryCallback() {
  if (
    route.name == "/conversation/[postSlugId]" ||
    route.name == "/conversation/[postSlugId].embed"
  ) {
    emit("openModerationHistory");
  } else {
    await router.push({
      name: "/conversation/[postSlugId]",
      params: { postSlugId: props.postSlugId },
      query: { filter: "moderated" },
    });
  }
}

async function copyEmbedLinkCallback() {
  const embedUrl = getEmbedUrl(props.postSlugId);
  await webShare.share("Embed: Agora Conversation", embedUrl);
}

async function exportConversationCallback() {
  await router.push({
    name: "/conversation/[conversationSlugId]/export",
    params: { conversationSlugId: props.postSlugId },
  });
}

function clickedMoreIcon() {
  // Show post actions using the new system
  postActions.showPostActions(props.postSlugId, props.posterUserName, {
    reportPostCallback: reportContentCallback,
    openUserReportsCallback,
    muteUserCallback,
    moderatePostCallback,
    moderationHistoryCallback,
    copyEmbedLinkCallback,
    exportConversationCallback,
  });
}

/**
 * Handle action selection
 */
async function handleActionSelected(action: ContentAction) {
  console.log("Action selected:", action.id);
  await postActions.executeAction(action);
}

/**
 * Handle dialog close
 */
function handleDialogClosed() {
  postActions.closeDialog();
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
</style>
