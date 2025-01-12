<template>
  <ZKButton
    flat
    text-color="color-text-weak"
    icon="mdi-dots-horizontal"
    size="0.8rem"
    @click.stop.prevent="optionButtonClicked()"
  />

  <q-dialog v-model="showReportDialog">
    <ReportContentDialog
      :slug-id="props.commentItem.commentSlugId"
      report-type="opinion"
      @close="showReportDialog = false"
    />
  </q-dialog>
</template>

<script setup lang="ts">
import ReportContentDialog from "src/components/report/ReportContentDialog.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import type { CommentItem } from "src/shared/types/zod";
import { useBackendUserMuteApi } from "src/utils/api/muteUser";
import { useBottomSheet } from "src/utils/ui/bottomSheet";
import { ref } from "vue";
import { useRouter } from "vue-router";

const emit = defineEmits(["deleted", "mutedComment"]);

const props = defineProps<{
  commentItem: CommentItem;
}>();

const { showCommentOptionSelector } = useBottomSheet();

const showReportDialog = ref(false);

const router = useRouter();

const { muteUser } = useBackendUserMuteApi();

function reportContentCallback() {
  showReportDialog.value = true;
}

async function openUserReportsCallback() {
  await router.push({
    name: "/user-reports/[reportType]/[slugId]/",
    params: { reportType: "comment", slugId: props.commentItem.commentSlugId },
  });
}

async function muteUserCallback() {
  await muteUser(props.commentItem.username, "mute");
  emit("mutedComment");
}

async function optionButtonClicked() {
  const deleteCommentCallback = (deleted: boolean) => {
    if (deleted) {
      emit("deleted");
    }
  };

  await showCommentOptionSelector(
    props.commentItem.commentSlugId,
    props.commentItem.username,
    deleteCommentCallback,
    reportContentCallback,
    openUserReportsCallback,
    muteUserCallback
  );
}
</script>

<style scoped lang="scss"></style>
