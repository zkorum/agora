import { ref } from "vue";

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
  const postDraft = ref<NewConversationDraft>(
    structuredClone(emptyConversationDraft)
  );

  function isPostEdited() {
    const trimmedDraft = postDraft.value;
    trimmedDraft.enablePolling = false;
    if (
      JSON.stringify(emptyConversationDraft) == JSON.stringify(trimmedDraft)
    ) {
      return false;
    } else {
      return true;
    }
  }

  return { postDraft, isPostEdited };
};
