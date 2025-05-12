import { defineStore } from "pinia";
import {
  type DummyCommentFormat,
  type PossibleCommentRankingActions,
} from "./homeFeed";

export interface UserCommentHistoryitem {
  commentItem: DummyCommentFormat;
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
