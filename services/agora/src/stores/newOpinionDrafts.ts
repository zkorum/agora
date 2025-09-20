import { useStorage } from "@vueuse/core";
import { defineStore } from "pinia";

export const useNewOpinionDraftsStore = defineStore("newOpinionDrafts", () => {
  interface ConversationDraftItem {
    body: string;
    editedAt: string; // Changed to string for better serialization
  }

  // Use plain object instead of Map for localStorage compatibility
  const defaultDraftMap: Record<string, ConversationDraftItem> = {};

  const opinionDraftMap = useStorage(
    "opinionDraft",
    defaultDraftMap,
    localStorage,
    {
      serializer: {
        read: (v: string) => {
          try {
            const parsed = JSON.parse(v);
            return parsed || {};
          } catch {
            return {};
          }
        },
        write: (v: Record<string, ConversationDraftItem>) => JSON.stringify(v),
      },
    }
  );

  function clearOpinionDrafts() {
    opinionDraftMap.value = {};
  }

  function getOpinionDraft(conversationSlugId: string) {
    const draft = opinionDraftMap.value[conversationSlugId];
    if (draft) {
      // Convert string back to Date for backward compatibility
      return {
        ...draft,
        editedAt: new Date(draft.editedAt),
      };
    }
    return undefined;
  }

  function deleteOpinionDraft(conversationSlugId: string) {
    // Simply delete the property - no error needed for non-existent keys
    delete opinionDraftMap.value[conversationSlugId];
  }

  function deleteExcessiveOpinionDrafts() {
    const draftEntries = Object.entries(opinionDraftMap.value);
    const numOpinions = draftEntries.length;

    if (numOpinions >= 1000) {
      let oldestDraftSlugId = "";
      let oldestDraftDate = new Date();

      for (const [conversationSlugId, draftItem] of draftEntries) {
        const typedDraftItem = draftItem as ConversationDraftItem;
        const draftDate = new Date(typedDraftItem.editedAt);
        if (draftDate.getTime() < oldestDraftDate.getTime()) {
          oldestDraftSlugId = conversationSlugId;
          oldestDraftDate = draftDate;
        }
      }

      if (oldestDraftSlugId) {
        deleteOpinionDraft(oldestDraftSlugId);
      }
    }
  }

  function saveOpinionDraft(opinionSlugId: string, opinionBody: string) {
    const draft = getOpinionDraft(opinionSlugId);
    const currentTime = new Date().toISOString();

    if (draft === undefined) {
      deleteExcessiveOpinionDrafts();

      opinionDraftMap.value[opinionSlugId] = {
        body: opinionBody,
        editedAt: currentTime,
      };
    } else {
      opinionDraftMap.value[opinionSlugId] = {
        body: opinionBody,
        editedAt: currentTime,
      };
    }
  }

  return {
    getOpinionDraft,
    saveOpinionDraft,
    deleteOpinionDraft,
    clearOpinionDrafts,
  };
});
