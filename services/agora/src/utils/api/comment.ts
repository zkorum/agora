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
import { useAuthenticationStore } from "src/stores/authentication";
import { storeToRefs } from "pinia";

export function useBackendCommentApi() {
  const { buildEncodedUcan } = useCommonApi();
  const { isAuthenticated } = storeToRefs(useAuthenticationStore());

  const { showNotifyMessage } = useNotify();

  function createLocalCommentObject(
    webCommentItemList: ApiV1UserFetchUserCommentsPost200ResponseInnerCommentItem[]
  ): CommentItem[] {
    const parsedCommentItemList: CommentItem[] = [];

    webCommentItemList.forEach((item) => {
      const moderationStatus = item.moderation
        .status as moderationStatusOptionsType;

      parsedCommentItemList.push({
        comment: item.comment,
        commentSlugId: item.commentSlugId,
        createdAt: new Date(item.createdAt),
        numDislikes: item.numDislikes,
        numLikes: item.numLikes,
        updatedAt: new Date(item.updatedAt),
        username: String(item.username),
        moderation: {
          status: moderationStatus,
          action: item.moderation.action,
          explanation: item.moderation.explanation,
          reason: item.moderation.reason,
          createdAt: new Date(item.moderation.createdAt),
          updatedAt: new Date(item.moderation.updatedAt),
        },
      });
    });

    return parsedCommentItemList;
  }

  async function fetchHiddenCommentsForPost(postSlugId: string) {
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
          .status as moderationStatusOptionsType;

        postList.push({
          comment: item.comment,
          commentSlugId: item.commentSlugId,
          createdAt: new Date(item.createdAt),
          numDislikes: item.numDislikes,
          numLikes: item.numLikes,
          updatedAt: new Date(item.updatedAt),
          username: String(item.username),
          moderation: {
            status: moderationStatus,
            action: item.moderation.action,
            explanation: item.moderation.explanation,
            reason: item.moderation.reason,
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
  ) {
    try {
      const params: ApiV1CommentFetchCommentsByPostSlugIdPostRequest = {
        postSlugId: postSlugId,
        filter: filter,
        isAuthenticatedRequest: isAuthenticated.value,
      };

      if (isAuthenticated.value) {
        const { url, options } =
          await DefaultApiAxiosParamCreator().apiV1CommentFetchCommentsByPostSlugIdPost(
            params
          );
        const encodedUcan = await buildEncodedUcan(url, options);
        const response = await DefaultApiFactory(
          undefined,
          undefined,
          api
        ).apiV1CommentFetchCommentsByPostSlugIdPost(params, {
          headers: {
            ...buildAuthorizationHeader(encodedUcan),
          },
        });
        return createLocalCommentObject(response.data);
      } else {
        const response = await DefaultApiFactory(
          undefined,
          undefined,
          api
        ).apiV1CommentFetchCommentsByPostSlugIdPost(params, {});
        return createLocalCommentObject(response.data);
      }
    } catch (e) {
      console.error(e);
      showNotifyMessage("Failed to fetch comments for post: " + postSlugId);
      return null;
    }
  }

  async function createNewComment(
    commentBody: string,
    postSlugId: string
  ): Promise<boolean> {
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

      if (response.data.success) {
        return true;
      } else {
        if (response.data.reason == "post_locked") {
          showNotifyMessage("Cannot create comment because post is locked");
        }

        return false;
      }
    } catch (e) {
      console.error(e);
      showNotifyMessage("Failed to add opinion to post.");
      return false;
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
