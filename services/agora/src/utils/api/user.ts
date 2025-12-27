import {
  type ApiV1UserConversationFetchPostRequest,
  type ApiV1UserOpinionFetchPostRequest,
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
} from "src/api";
import type { GetUserProfileResponse } from "src/shared/types/dto";
import { Dto } from "src/shared/types/dto";
import type {
  ExtendedConversation,
  ExtendedOpinion,
} from "src/shared/types/zod";

import { buildAuthorizationHeader } from "../crypto/ucan/operation";
import { useNotify } from "../ui/notify";
import { api } from "./client";
import { useCommonApi } from "./common";
import { useBackendPostApi } from "./post/post";

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

      // The DTO already contains fully parsed ExtendedOpinion objects with Date objects
      return Dto.fetchUserOpinionsResponse.parse(response.data);
    } catch (e) {
      console.error(e);
      showNotifyMessage("Failed to fetch user's personal comments.");
      return null;
    }
  }

  return { fetchUserProfile, fetchUserPosts, fetchUserComments };
}
