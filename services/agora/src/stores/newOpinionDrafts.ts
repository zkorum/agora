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

  function saveOpinionDraft(opinionSlugId: string, opinionBody: string) {
    const draft = getOpinionDraft(opinionSlugId);
    if (draft == undefined) {
      opinionDraftMap.value.set(opinionSlugId, {
        body: opinionBody,
        editedAt: new Date(),
      });
    } else {
      draft.body = opinionBody;
    }
  }

  return { getOpinionDraft, saveOpinionDraft, clearOpinionDrafts };
});
