import { useStorage } from "@vueuse/core";
import { defineStore } from "pinia";

export const useNewOpinionDraftsStore = defineStore("newOpinionDrafts", () => {
  interface ConversationDraftItem {
    body: string;
    editedAt: Date;
  }

  // Key: Conversation slug ID
  const draftMap = new Map<string, ConversationDraftItem>();

  const opinionDraftMap = useStorage("opinionDraft", draftMap);

  function clearOpinionDrafts() {
    draftMap.clear();
  }

  function getOpinionDraft(conversationSlugId: string) {
    const draft = opinionDraftMap.value.get(conversationSlugId);
    return draft;
  }

  function deleteOpinionDraft(opinionSlugId: string) {
    opinionDraftMap.value.delete(opinionSlugId);
  }

  function saveOpinionDraft(opinionSlugId: string, opinionBody: string) {
    /*
    const numOpinions = opinionDraftMap.value.size;
    if (numOpinions > 10) {
      array.forEach(element => {

      });
    }
    */

    const draft = getOpinionDraft(opinionSlugId);
    if (draft == undefined) {
      opinionDraftMap.value.set(opinionSlugId, {
        body: opinionBody,
        editedAt: new Date(),
      });
    } else {
      draft.body = opinionBody;
      draft.editedAt = new Date();
    }
  }

  return {
    getOpinionDraft,
    saveOpinionDraft,
    deleteOpinionDraft,
    clearOpinionDrafts,
  };
});
