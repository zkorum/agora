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
import { useBottomSheet } from "src/utils/ui/bottomSheet";
import { ref } from "vue";

const emit = defineEmits(["deleted"]);

const props = defineProps<{
  commentItem: CommentItem;
}>();

const { showCommentOptionSelector } = useBottomSheet();

const showReportDialog = ref(false);

function selectedReportOption() {
  showReportDialog.value = true;
}

function optionButtonClicked() {
  const deleteCommentCallback = (deleted: boolean) => {
    if (deleted) {
      emit("deleted");
    }
  };

  showCommentOptionSelector(
    props.commentItem.commentSlugId,
    props.commentItem.username,
    deleteCommentCallback,
    selectedReportOption
  );
}
</script>

<style scoped lang="scss"></style>
