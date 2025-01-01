import {
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
  type ApiV1UserFetchUserCommentsPostRequest,
  type ApiV1UserFetchUserPostsPostRequest,
} from "src/api";
import { api } from "boot/axios";
import { buildAuthorizationHeader } from "../crypto/ucan/operation";
import { useCommonApi } from "./common";
import type {
  ExtendedComment,
  ExtendedPost,
  moderationStatusOptionsType,
} from "src/shared/types/zod";
import { useBackendPostApi } from "./post";
import { useNotify } from "../ui/notify";

export function useBackendUserApi() {
  const { buildEncodedUcan } = useCommonApi();
  const { createInternalPostData } = useBackendPostApi();

  const { showNotifyMessage } = useNotify();

  async function fetchUserProfile() {
    try {
      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1UserFetchUserProfilePost();
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1UserFetchUserProfilePost({
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });

      return response.data;
    } catch (e) {
      console.error(e);
      showNotifyMessage("Failed to fetch user's personal profile.");
      return undefined;
    }
  }

  async function fetchUserPosts(
    lastPostSlugId: string | undefined
  ): Promise<ExtendedPost[] | null> {
    try {
      const params: ApiV1UserFetchUserPostsPostRequest = {
        lastPostSlugId: lastPostSlugId,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1UserFetchUserPostsPost(params);
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1UserFetchUserPostsPost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });

      const internalPostList: ExtendedPost[] = response.data.map(
        (postElement) => {
          const dataItem: ExtendedPost = createInternalPostData(postElement);
          return dataItem;
        }
      );

      return internalPostList;
    } catch (e) {
      console.error(e);
      showNotifyMessage("Failed to fetch user's personal posts.");
      return null;
    }
  }

  async function fetchUserComments(
    lastCommentSlugId: string | undefined
  ): Promise<ExtendedComment[] | null> {
    try {
      const params: ApiV1UserFetchUserCommentsPostRequest = {
        lastCommentSlugId: lastCommentSlugId,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1UserFetchUserCommentsPost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1UserFetchUserCommentsPost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });

      const extendedCommentList: ExtendedComment[] = [];
      response.data.forEach((responseItem) => {
        // Patch OpenAPI bug on discriminatedUnion
        const moderationStatus = responseItem.commentItem.moderation
          .status as moderationStatusOptionsType;

        const extendedComment: ExtendedComment = {
          postData: createInternalPostData(responseItem.postData),
          commentItem: {
            comment: responseItem.commentItem.comment,
            commentSlugId: responseItem.commentItem.commentSlugId,
            createdAt: new Date(responseItem.commentItem.createdAt),
            numDislikes: responseItem.commentItem.numDislikes,
            numLikes: responseItem.commentItem.numLikes,
            updatedAt: new Date(responseItem.commentItem.updatedAt),
            username: String(responseItem.commentItem.username),
            moderation: {
              status: moderationStatus,
              action: responseItem.commentItem.moderation.action,
              explanation: responseItem.commentItem.moderation.explanation,
              reason: responseItem.commentItem.moderation.reason,
              createdAt: new Date(
                responseItem.commentItem.moderation.createdAt
              ),
              updatedAt: new Date(
                responseItem.commentItem.moderation.updatedAt
              ),
            },
          },
        };
        extendedCommentList.push(extendedComment);
      });

      return extendedCommentList;
    } catch (e) {
      console.error(e);
      showNotifyMessage("Failed to fetch user's personal comments.");
      return null;
    }
  }

  return { fetchUserProfile, fetchUserPosts, fetchUserComments };
}
