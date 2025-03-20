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

    <LoginConfirmationDialog
      v-model="showLoginDialog"
      :ok-callback="() => {}"
      :active-intention="'reportUserContent'"
    />
  </div>

  <q-dialog v-model="showReportDialog">
    <ReportContentDialog
      :slug-id="props.commentItem.opinionSlugId"
      report-type="opinion"
      @close="showReportDialog = false"
    />
  </q-dialog>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import LoginConfirmationDialog from "src/components/authentication/LoginConfirmationDialog.vue";
import ReportContentDialog from "src/components/report/ReportContentDialog.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ZKIcon from "src/components/ui-library/ZKIcon.vue";
import type { OpinionItem } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { useBackendCommentApi } from "src/utils/api/comment";
import { useBackendUserMuteApi } from "src/utils/api/muteUser";
import { useWebShare } from "src/utils/share/WebShare";
import { useBottomSheet } from "src/utils/ui/bottomSheet";
import { useNotify } from "src/utils/ui/notify";
import { ref } from "vue";
import { useRouter } from "vue-router";

const emit = defineEmits(["deleted", "mutedComment"]);

const props = defineProps<{
  postSlugId: string;
  commentItem: OpinionItem;
}>();

const { isAuthenticated } = storeToRefs(useAuthenticationStore());

const webShare = useWebShare();

const { showNotifyMessage } = useNotify();

const { showCommentOptionSelector } = useBottomSheet();

const showReportDialog = ref(false);

const router = useRouter();

const { muteUser } = useBackendUserMuteApi();
const { deleteCommentBySlugId } = useBackendCommentApi();

const showLoginDialog = ref(false);

function reportContentCallback() {
  if (isAuthenticated.value) {
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
  await webShare.share("Agora Opinion", sharePostUrl);
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

async function deleteCommentCallback() {
  const response = await deleteCommentBySlugId(props.commentItem.opinionSlugId);
  if (response) {
    showNotifyMessage("Opinion deleted");
    emit("deleted");
  } else {
    showNotifyMessage("Failed to delete opinion");
  }
}

async function optionButtonClicked() {
  await showCommentOptionSelector(
    props.commentItem.username,
    deleteCommentCallback,
    reportContentCallback,
    openUserReportsCallback,
    muteUserCallback,
    moderateCommentCallback,
    shareOpinionCallback
  );
}
</script>

<style scoped lang="scss"></style>
