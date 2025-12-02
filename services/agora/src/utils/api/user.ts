import {
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
  type ApiV1UserOpinionFetchPostRequest,
  type ApiV1UserConversationFetchPostRequest,
} from "src/api";
import { api } from "./client";
import { buildAuthorizationHeader } from "../crypto/ucan/operation";
import { useCommonApi } from "./common";
import type {
  ExtendedOpinion,
  ExtendedConversation,
  moderationStatusOptionsType,
} from "src/shared/types/zod";
import { useBackendPostApi } from "./post/post";
import { useNotify } from "../ui/notify";
import type { GetUserProfileResponse } from "src/shared/types/dto";

export function useBackendUserApi() {
  const { buildEncodedUcan } = useCommonApi();
  const { createInternalPostData } = useBackendPostApi();

  const { showNotifyMessage } = useNotify();

  async function fetchUserProfile(): Promise<
    GetUserProfileResponse | undefined
  > {
    try {
      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1UserProfileGetPost();
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1UserProfileGetPost({
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });

      return {
        activePostCount: response.data.activePostCount,
        createdAt: new Date(response.data.createdAt),
        isModerator: response.data.isModerator,
        username: response.data.username,
        organizationList: response.data.organizationList,
        verifiedEventTickets: response.data.verifiedEventTickets || [],
      };
    } catch (e) {
      console.error(e);
      showNotifyMessage("Failed to fetch user's personal profile.");
      return undefined;
    }
  }

  async function fetchUserPosts(
    lastPostSlugId: string | undefined
  ): Promise<ExtendedConversation[] | null> {
    try {
      const params: ApiV1UserConversationFetchPostRequest = {
        lastConversationSlugId: lastPostSlugId,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1UserConversationFetchPost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1UserConversationFetchPost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });

      const internalPostList: ExtendedConversation[] = response.data.map(
        (postElement) => {
          const dataItem: ExtendedConversation =
            createInternalPostData(postElement);
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
  ): Promise<ExtendedOpinion[] | null> {
    try {
      const params: ApiV1UserOpinionFetchPostRequest = {
        lastOpinionSlugId: lastCommentSlugId,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1UserOpinionFetchPost(params);
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1UserOpinionFetchPost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });

      const extendedCommentList: ExtendedOpinion[] = [];
      response.data.forEach((responseItem) => {
        // Patch OpenAPI bug on discriminatedUnion
        const moderationStatus = responseItem.opinionItem.moderation
          .status as moderationStatusOptionsType;

        const extendedComment: ExtendedOpinion = {
          conversationData: createInternalPostData(
            responseItem.conversationData
          ),
          opinionItem: {
            opinion: responseItem.opinionItem.opinion,
            opinionSlugId: responseItem.opinionItem.opinionSlugId,
            createdAt: new Date(responseItem.opinionItem.createdAt),
            numParticipants: responseItem.opinionItem.numParticipants,
            numDisagrees: responseItem.opinionItem.numDisagrees,
            numAgrees: responseItem.opinionItem.numAgrees,
            numPasses: responseItem.opinionItem.numPasses,
            updatedAt: new Date(responseItem.opinionItem.updatedAt),
            username: String(responseItem.opinionItem.username),
            isSeed: responseItem.opinionItem.isSeed,
            moderation: {
              status: moderationStatus,
              action: responseItem.opinionItem.moderation.action,
              explanation: responseItem.opinionItem.moderation.explanation,
              reason: responseItem.opinionItem.moderation.reason,
              createdAt: new Date(
                responseItem.opinionItem.moderation.createdAt
              ),
              updatedAt: new Date(
                responseItem.opinionItem.moderation.updatedAt
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
