<template>
  <ZKButton
    flat
    text-color="color-text-weak"
    icon="mdi-dots-horizontal"
    size="0.8rem"
    @click.stop.prevent="optionButtonClicked()"
  />
</template>

<script setup lang="ts">
import ZKButton from "src/components/ui-library/ZKButton.vue";
import type { CommentItem } from "src/shared/types/zod";
import { useBottomSheet } from "src/utils/ui/bottomSheet";

const emit = defineEmits(["deleted"]);

const props = defineProps<{
  commentItem: CommentItem;
}>();

const bottomSheet = useBottomSheet();

function optionButtonClicked() {
  const deleteCommentCallback = (deleted: boolean) => {
    if (deleted) {
      emit("deleted");
    }
  };

  bottomSheet.showCommentOptionSelector(
    props.commentItem.commentSlugId,
    props.commentItem.username,
    deleteCommentCallback
  );
}
</script>

<style scoped lang="scss"></style>
