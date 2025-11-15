import { useStorage } from "@vueuse/core";
import { defineStore } from "pinia";
import { z } from "zod";

// ============================================================================
// Zod Schemas for Draft Validation
// ============================================================================

/**
 * Zod schema for validating a single conversation draft item
 */
const zodConversationDraftItem = z.object({
  body: z.string(),
  editedAt: z.iso.datetime(), // Validates ISO 8601 datetime format
});

/**
 * Zod schema for validating the entire opinion draft map
 */
const zodOpinionDraftMap = z.record(z.string(), zodConversationDraftItem);

/**
 * Type inference from zod schema - replaces the ConversationDraftItem interface
 */
type ConversationDraftItem = z.infer<typeof zodConversationDraftItem>;

export const useNewOpinionDraftsStore = defineStore("newOpinionDrafts", () => {
  // Use plain object instead of Map for localStorage compatibility
  const defaultDraftMap: Record<string, ConversationDraftItem> = {};

  /**
   * Parses and validates stored draft map using zod schema
   * Returns parsed map if valid, empty object otherwise
   */
  function parseStoredDraftMap(
    data: unknown
  ): Record<string, ConversationDraftItem> {
    const result = zodOpinionDraftMap.safeParse(data);

    if (!result.success) {
      console.warn(
        "Invalid opinion draft map found in storage:",
        result.error.format()
      );
      return {};
    }

    return result.data;
  }

  const opinionDraftMap = useStorage(
    "opinionDraft",
    defaultDraftMap,
    localStorage,
    {
      serializer: {
        read: (v: string): Record<string, ConversationDraftItem> => {
          try {
            const parsed = JSON.parse(v);
            const validatedMap = parseStoredDraftMap(parsed);
            return validatedMap;
          } catch (error) {
            console.error(
              "Failed to parse opinion draft map from storage:",
              error
            );
            return {};
          }
        },
        write: (v: Record<string, ConversationDraftItem>): string =>
          JSON.stringify(v),
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
        const typedDraftItem = draftItem;
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
