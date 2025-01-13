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
import { useBackendUserMuteApi } from "src/utils/api/muteUser";
import { useBottomSheet } from "src/utils/ui/bottomSheet";
import { ref } from "vue";
import { useRouter } from "vue-router";

const emit = defineEmits(["deleted", "mutedComment"]);

const props = defineProps<{
  postSlugId: string;
  commentItem: OpinionItem;
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
    params: { reportType: "comment", slugId: props.commentItem.opinionSlugId },
  });
}

async function muteUserCallback() {
  await muteUser(props.commentItem.username, "mute");
  emit("mutedComment");
}

async function moderateCommentCallback() {
  await router.push({
    name: "/moderate/opinion/[postSlugId]/[commentSlugId]/",
    params: {
      postSlugId: props.postSlugId,
      commentSlugId: props.commentItem.opinionSlugId,
    },
  });
}

async function optionButtonClicked() {
  const deleteCommentCallback = (deleted: boolean) => {
    if (deleted) {
      emit("deleted");
    }
  };

  await showCommentOptionSelector(
    props.commentItem.opinionSlugId,
    props.commentItem.username,
    deleteCommentCallback,
    reportContentCallback,
    openUserReportsCallback,
    muteUserCallback,
    moderateCommentCallback
  );
}
</script>

<style scoped lang="scss"></style>
