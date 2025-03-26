import { useStorage } from "@vueuse/core";

export interface NewConversationDraft {
  postTitle: string;
  postBody: string;
  enablePolling: boolean;
  pollingOptionList: string[];
}

export const emptyConversationDraft: NewConversationDraft = {
  postTitle: "",
  postBody: "",
  enablePolling: false,
  pollingOptionList: ["", ""],
};

export const useNewPostDraftsStore = () => {
  const postDraft = useStorage("postDraft", emptyConversationDraft);

  function isPostEdited() {
    if (
      emptyConversationDraft.postTitle === postDraft.value.postTitle &&
      emptyConversationDraft.postBody === postDraft.value.postBody &&
      emptyConversationDraft.enablePolling === postDraft.value.enablePolling &&
      emptyConversationDraft.pollingOptionList.toString() ===
        postDraft.value.pollingOptionList.toString()
    ) {
      return false;
    } else {
      console.log("edited");
      return true;
    }
  }

  return { postDraft, isPostEdited };
};
