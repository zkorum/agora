import { api } from "boot/axios";
import { buildAuthorizationHeader } from "../crypto/ucan/operation";
import {
  type ApiV1OpinionCreatePostRequest,
  type ApiV1OpinionFetchByConversationPostRequest,
  type ApiV1OpinionFetchHiddenByConversationPostRequest,
  type ApiV1UserOpinionFetchPost200ResponseInnerOpinionItem,
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
} from "src/api";
import { useCommonApi } from "./common";
import {
  type CommentFeedFilter,
  type OpinionItem,
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
    webCommentItemList: ApiV1UserOpinionFetchPost200ResponseInnerOpinionItem[]
  ): OpinionItem[] {
    const parsedCommentItemList: OpinionItem[] = [];

    webCommentItemList.forEach((item) => {
      const moderationStatus = item.moderation
        .status as moderationStatusOptionsType;

      parsedCommentItemList.push({
        opinion: item.opinion,
        opinionSlugId: item.opinionSlugId,
        createdAt: new Date(item.createdAt),
        numDisagrees: item.numDisagrees,
        numAgrees: item.numAgrees,
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
      const params: ApiV1OpinionFetchHiddenByConversationPostRequest = {
        conversationSlugId: postSlugId,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1OpinionFetchHiddenByConversationPost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);

      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1OpinionFetchHiddenByConversationPost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });

      const postList: OpinionItem[] = [];
      response.data.forEach((item) => {
        const moderationStatus = item.moderation
          .status as moderationStatusOptionsType;

        postList.push({
          opinion: item.opinion,
          opinionSlugId: item.opinionSlugId,
          createdAt: new Date(item.createdAt),
          numDisagrees: item.numDisagrees,
          numAgrees: item.numAgrees,
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
      const params: ApiV1OpinionFetchByConversationPostRequest = {
        conversationSlugId: postSlugId,
        filter: filter,
        isAuthenticatedRequest: isAuthenticated.value,
      };

      if (isAuthenticated.value) {
        const { url, options } =
          await DefaultApiAxiosParamCreator().apiV1OpinionFetchByConversationPost(
            params
          );
        const encodedUcan = await buildEncodedUcan(url, options);
        const response = await DefaultApiFactory(
          undefined,
          undefined,
          api
        ).apiV1OpinionFetchByConversationPost(params, {
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
        ).apiV1OpinionFetchByConversationPost(params, {});
        return createLocalCommentObject(response.data);
      }
    } catch (e) {
      console.error(e);
      showNotifyMessage(
        "Failed to fetch opinions for conversation: " + postSlugId
      );
      return null;
    }
  }

  async function createNewComment(
    commentBody: string,
    postSlugId: string
  ): Promise<boolean> {
    try {
      const params: ApiV1OpinionCreatePostRequest = {
        opinionBody: commentBody,
        conversationSlugId: postSlugId,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1OpinionCreatePost(params);
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1OpinionCreatePost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });

      if (response.data.success) {
        return true;
      } else {
        if (response.data.reason == "conversation_locked") {
          showNotifyMessage(
            "Cannot create opinion because the conversation is locked"
          );
        }

        return false;
      }
    } catch (e) {
      console.error(e);
      showNotifyMessage("Failed to add opinion to the conversation");
      return false;
    }
  }

  async function deleteCommentBySlugId(commentSlugId: string) {
    try {
      const params = {
        opinionSlugId: commentSlugId,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1OpinionDeletePost(params);
      const encodedUcan = await buildEncodedUcan(url, options);
      await DefaultApiFactory(undefined, undefined, api).apiV1OpinionDeletePost(
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
