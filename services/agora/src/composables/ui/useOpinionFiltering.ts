import type { OpinionItem } from "src/shared/types/zod";
import type { CommentFilterOptions } from "src/utils/component/opinion";

export function useOpinionFiltering() {
  function findOpinionFilter(
    opinionSlugId: string,
    newOpinions: OpinionItem[],
    discoverOpinions: OpinionItem[],
    moderatedOpinions: OpinionItem[],
    hiddenOpinions: OpinionItem[],
    isLoggedIn: boolean,
    isModerator: boolean
  ): CommentFilterOptions | "not_found" | "removed_by_moderators" {
    // Check discover list first
    for (const opinion of discoverOpinions) {
      if (opinion.opinionSlugId === opinionSlugId) {
        return "discover";
      }
    }

    // Check new list
    for (const opinion of newOpinions) {
      if (opinion.opinionSlugId === opinionSlugId) {
        return "new";
      }
    }

    // Check moderated list
    for (const opinion of moderatedOpinions) {
      if (opinion.opinionSlugId === opinionSlugId) {
        return "moderated";
      }
    }

    // Handle hidden opinions - only accessible to moderators
    if (isLoggedIn && isModerator) {
      for (const opinion of hiddenOpinions) {
        if (opinion.opinionSlugId === opinionSlugId) {
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

  return {
    findOpinionFilter,
  };
}
