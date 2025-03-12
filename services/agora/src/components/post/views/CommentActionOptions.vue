<template>
  <ZKButton
    :use-extra-padding="false"
    flat
    text-color="color-text-weak"
    icon="mdi-dots-horizontal"
    size="0.6rem"
    @click.stop.prevent="optionButtonClicked()"
  />

  <q-dialog v-model="showReportDialog">
    <ReportContentDialog
      :slug-id="props.commentItem.opinionSlugId"
      report-type="opinion"
      @close="showReportDialog = false"
    />
  </q-dialog>
</template>

<script setup lang="ts">
import ReportContentDialog from "src/components/report/ReportContentDialog.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import type { OpinionItem } from "src/shared/types/zod";
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

const webShare = useWebShare();

const { showNotifyMessage } = useNotify();

const { showCommentOptionSelector } = useBottomSheet();

const showReportDialog = ref(false);

const router = useRouter();

const { muteUser } = useBackendUserMuteApi();
const { deleteCommentBySlugId } = useBackendCommentApi();

function reportContentCallback() {
  showReportDialog.value = true;
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
