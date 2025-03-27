import { useStorage } from "@vueuse/core";
import { defineStore } from "pinia";

export const useNewConversationDraftsStore = defineStore(
  "newConversationDrafts",
  () => {
    interface ConversationDraftItem {
      body: string;
      editedAt: Date;
    }

    // Key: Conversation slug ID
    const draftMap = new Map<string, ConversationDraftItem>();

    const conversationDraftMap = useStorage("conversationDraft", draftMap);

    function getConversationDraft(conversationSlugId: string) {
      const draft = conversationDraftMap.value.get(conversationSlugId);
      return draft;
    }

    function saveConversationDraft(
      conversationSlugId: string,
      conversationBody: string
    ) {
      const draft = getConversationDraft(conversationSlugId);
      if (draft == undefined) {
        conversationDraftMap.value.set(conversationSlugId, {
          body: conversationBody,
          editedAt: new Date(),
        });
      } else {
        draft.body = conversationBody;
      }
    }

    return { getConversationDraft, saveConversationDraft };
  }
);
