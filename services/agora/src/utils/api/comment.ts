import { api } from "boot/axios";
import { buildAuthorizationHeader } from "../crypto/ucan/operation";
import {
  type ApiV1CommentCreatePostRequest,
  type ApiV1CommentFetchCommentsByPostSlugIdPostRequest,
  type ApiV1CommentFetchHiddenCommentsPostRequest,
  type ApiV1ModerationCommentWithdrawPostRequest,
  type ApiV1UserFetchUserCommentsPost200ResponseInnerCommentItem,
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
} from "src/api";
import { useCommonApi } from "./common";
import {
  type CommentFeedFilter,
  type CommentItem,
  type moderationStatusOptionsType,
} from "src/shared/types/zod";
import { useNotify } from "../ui/notify";

export function useBackendCommentApi() {
  const { buildEncodedUcan } = useCommonApi();

  const { showNotifyMessage } = useNotify();

  function createLocalCommentObject(
    webCommentItemList: ApiV1UserFetchUserCommentsPost200ResponseInnerCommentItem[]
  ): CommentItem[] {
    const parsedCommentItemList: CommentItem[] = [];

    webCommentItemList.forEach((item) => {
      const moderationStatus = item.moderation
        .moderationStatus as moderationStatusOptionsType;

      parsedCommentItemList.push({
        comment: item.comment,
        commentSlugId: item.commentSlugId,
        createdAt: new Date(item.createdAt),
        numDislikes: item.numDislikes,
        numLikes: item.numLikes,
        updatedAt: new Date(item.updatedAt),
        username: String(item.username),
        moderation: {
          moderationStatus: moderationStatus,
          moderationAction: item.moderation.moderationAction,
          moderationExplanation: item.moderation.moderationExplanation,
          moderationReason: item.moderation.moderationReason,
          createdAt: new Date(item.moderation.createdAt),
          updatedAt: new Date(item.moderation.updatedAt),
        },
      });
    });

    return parsedCommentItemList;
  }

  async function fetchHiddenCommentsForPost(
    postSlugId: string
  ): Promise<CommentItem[]> {
    try {
      const params: ApiV1CommentFetchHiddenCommentsPostRequest = {
        postSlugId: postSlugId,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1CommentFetchHiddenCommentsPost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);

      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1CommentFetchHiddenCommentsPost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });

      const postList: CommentItem[] = [];
      response.data.forEach((item) => {
        const moderationStatus = item.moderation
          .moderationStatus as moderationStatusOptionsType;

        postList.push({
          comment: item.comment,
          commentSlugId: item.commentSlugId,
          createdAt: new Date(item.createdAt),
          numDislikes: item.numDislikes,
          numLikes: item.numLikes,
          updatedAt: new Date(item.updatedAt),
          username: String(item.username),
          moderation: {
            moderationStatus: moderationStatus,
            moderationAction: item.moderation.moderationAction,
            moderationExplanation: item.moderation.moderationExplanation,
            moderationReason: item.moderation.moderationReason,
            createdAt: new Date(item.moderation.createdAt),
            updatedAt: new Date(item.moderation.updatedAt),
          },
        });
      });

      return postList;
    } catch (e) {
      console.error(e);
      showNotifyMessage("Failed to fetch comments for post: " + postSlugId);
      return null;
    }
  }

  async function fetchCommentsForPost(
    postSlugId: string,
    filter: CommentFeedFilter
  ): Promise<CommentItem[]> {
    try {
      const params: ApiV1CommentFetchCommentsByPostSlugIdPostRequest = {
        postSlugId: postSlugId,
        filter: filter,
      };

      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1CommentFetchCommentsByPostSlugIdPost(params, {});

      return createLocalCommentObject(response.data);
    } catch (e) {
      console.error(e);
      showNotifyMessage("Failed to fetch comments for post: " + postSlugId);
      return null;
    }
  }

  async function createNewComment(commentBody: string, postSlugId: string) {
    try {
      const params: ApiV1CommentCreatePostRequest = {
        commentBody: commentBody,
        postSlugId: postSlugId,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1CommentCreatePost(params);
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1CommentCreatePost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });

      return response.data;
    } catch (e) {
      console.error(e);
      showNotifyMessage("Failed to add comment to post.");
      return null;
    }
  }

  async function deleteCommentBySlugId(commentSlugId: string) {
    try {
      const params: ApiV1ModerationCommentWithdrawPostRequest = {
        commentSlugId: commentSlugId,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1CommentDeletePost(params);
      const encodedUcan = await buildEncodedUcan(url, options);
      await DefaultApiFactory(undefined, undefined, api).apiV1CommentDeletePost(
        params,
        {
          headers: {
            ...buildAuthorizationHeader(encodedUcan),
          },
        }
      );
      return true;
    } catch (e) {
      console.error(e);
      showNotifyMessage("Failed to delete comment: " + commentSlugId);
      return false;
    }
  }

  return {
    createNewComment,
    fetchCommentsForPost,
    fetchHiddenCommentsForPost,
    deleteCommentBySlugId,
  };
}
