import { defineStore } from "pinia";
import { CommentFilterOptions } from "src/utils/component/opinion";
import { ref } from "vue";

export const useCommentSectionStore = defineStore("commentSection", () => {
  const sortAlgorithm = ref<CommentFilterOptions>("discover");
  const requestedCommentSlugId = ref("");

  return { sortAlgorithm, requestedCommentSlugId };
});
