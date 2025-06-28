import { useStorage } from "@vueuse/core";
import { defineStore } from "pinia";

export interface NewConversationDraft {
  postTitle: string;
  postBody: string;
  enablePolling: boolean;
  pollingOptionList: string[];
  postAsOrganization: boolean;
  selectedOrganization: string;
  isLoginRequiredToParticipate: boolean;
  isPrivatePost: boolean;
  autoConvertDate: boolean;
  targetConvertDate: Date;
}

export const useNewPostDraftsStore = defineStore("newPostDrafts", () => {
  const postDraft = useStorage("postDraft", getEmptyConversationDraft());

  function getEmptyConversationDraft(): NewConversationDraft {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      enablePolling: false,
      pollingOptionList: ["", ""],
      postBody: "",
      postTitle: "",
      postAsOrganization: false,
      selectedOrganization: "",
      isLoginRequiredToParticipate: false,
      isPrivatePost: false,
      autoConvertDate: false,
      targetConvertDate: tomorrow,
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

  function clearConversationDrafts() {
    postDraft.value = getEmptyConversationDraft();
  }

  return {
    postDraft,
    getEmptyConversationDraft,
    isPostEdited,
    clearConversationDrafts,
  };
});
