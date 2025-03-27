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

  function deleteExcessiveOpinionDrafts() {
    const numOpinions = opinionDraftMap.value.size;
    if (numOpinions >= 10) {
      let oldestDraftSlugId = "";
      let oldestDraftDate = new Date();

      for (const [
        conversationSlugId,
        draftItem,
      ] of opinionDraftMap.value.entries()) {
        if (draftItem.editedAt.getTime() < oldestDraftDate.getTime()) {
          oldestDraftSlugId = conversationSlugId;
          oldestDraftDate = draftItem.editedAt;
        }
      }

      deleteOpinionDraft(oldestDraftSlugId);
    }
  }

  function saveOpinionDraft(opinionSlugId: string, opinionBody: string) {
    const draft = getOpinionDraft(opinionSlugId);
    if (draft == undefined) {
      deleteExcessiveOpinionDrafts();

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
