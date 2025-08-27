import { defineStore } from "pinia";
import type { PossibleCommentRankingActions } from "./homeFeed";
import type { OpinionItem } from "src/shared/types/zod";

export interface UserCommentHistoryitem {
  commentItem: OpinionItem;
  postSlugId: string;
  title: string;
  authorName: string;
  createdAt: Date;
  isRanked: boolean;
  rankedAction: PossibleCommentRankingActions;
}

export const useProfileStore = defineStore("profile", () => {
  const commentList: UserCommentHistoryitem[] = [];

  return { commentList };
});
