import { useStorage } from "@vueuse/core";
import { defineStore } from "pinia";

export interface NewConversationDraft {
  postTitle: string;
  postBody: string;
  enablePolling: boolean;
  pollingOptionList: string[];
}

export const useNewPostDraftsStore = defineStore("newPostDrafts", () => {
  const postDraft = useStorage("postDraft", getEmptyConversationDraft());

  function getEmptyConversationDraft(): NewConversationDraft {
    return {
      enablePolling: false,
      pollingOptionList: ["", ""],
      postBody: "",
      postTitle: "",
    };
  }

  function isPostEdited() {
    const EMPTY_DRAFT = getEmptyConversationDraft();
    if (
      EMPTY_DRAFT.postTitle === postDraft.value.postTitle &&
      EMPTY_DRAFT.postBody === postDraft.value.postBody &&
      EMPTY_DRAFT.enablePolling === postDraft.value.enablePolling &&
      EMPTY_DRAFT.pollingOptionList.toString() ===
        postDraft.value.pollingOptionList.toString()
    ) {
      return false;
    } else {
      console.log("edited");
      return true;
    }
  }

  return { postDraft, getEmptyConversationDraft, isPostEdited };
});
