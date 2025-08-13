import type { OpinionItem } from "src/shared/types/zod";
import type { CommentFilterOptions } from "src/utils/component/opinion";

export function useOpinionFiltering() {
  function detectOpinionFilterBySlugId(
    commentSlugId: string,
    commentItemsNew: OpinionItem[],
    commentItemsDiscover: OpinionItem[],
    commentItemsModerated: OpinionItem[],
    commentItemsHidden: OpinionItem[],
    isLoggedIn: boolean,
    isModerator: boolean
  ): CommentFilterOptions | "not_found" | "removed_by_moderators" {
    // Check discover list first
    for (const commentItem of commentItemsDiscover) {
      if (commentItem.opinionSlugId === commentSlugId) {
        return "discover";
      }
    }

    // Check new list
    for (const commentItem of commentItemsNew) {
      if (commentItem.opinionSlugId === commentSlugId) {
        return "new";
      }
    }

    // Check moderated list
    for (const commentItem of commentItemsModerated) {
      if (commentItem.opinionSlugId === commentSlugId) {
        return "moderated";
      }
    }

    // Handle hidden opinions - only accessible to moderators
    if (isLoggedIn && isModerator) {
      for (const commentItem of commentItemsHidden) {
        if (commentItem.opinionSlugId === commentSlugId) {
          return "hidden";
        }
      }
    }

    // If not found in accessible lists, opinion was likely removed by moderators
    if (!isLoggedIn) {
      return "removed_by_moderators";
    }

    return "not_found";
  }

  function findOpinionInLists(
    opinionSlugId: string,
    ...opinionLists: OpinionItem[][]
  ): OpinionItem | undefined {
    for (const list of opinionLists) {
      const found = list.find(
        (opinion) => opinion.opinionSlugId === opinionSlugId
      );
      if (found) {
        return found;
      }
    }
    return undefined;
  }

  function createOpinionIndexMap(
    opinionLists: Record<string, OpinionItem[]>
  ): Map<string, { category: string; opinion: OpinionItem }> {
    const indexMap = new Map<
      string,
      { category: string; opinion: OpinionItem }
    >();

    Object.entries(opinionLists).forEach(([category, opinions]) => {
      opinions.forEach((opinion) => {
        indexMap.set(opinion.opinionSlugId, { category, opinion });
      });
    });

    return indexMap;
  }

  return {
    detectOpinionFilterBySlugId,
    findOpinionInLists,
    createOpinionIndexMap,
  };
}
