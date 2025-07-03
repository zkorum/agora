import { api } from "boot/axios";
import { buildAuthorizationHeader } from "../crypto/ucan/operation";
import {
  ApiV1OpinionCreatePost200Response,
  type ApiV1OpinionCreatePostRequest,
  type ApiV1OpinionFetchByConversationPostRequest,
  ApiV1OpinionFetchBySlugIdListPostRequest,
  type ApiV1OpinionFetchHiddenByConversationPostRequest,
  ApiV1OpinionFetchRepresentativeByConversationPost200Response,
  type ApiV1UserOpinionFetchPost200ResponseInnerOpinionItem,
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
} from "src/api";
import {
  AxiosErrorResponse,
  AxiosSuccessResponse,
  useCommonApi,
} from "./common";
import {
  PolisKey,
  type CommentFeedFilter,
  type OpinionItem,
  type moderationStatusOptionsType,
} from "src/shared/types/zod";
import { useNotify } from "../ui/notify";
import { useAuthenticationStore } from "src/stores/authentication";
import { storeToRefs } from "pinia";
import { useBackendAuthApi } from "./auth";

export function useBackendCommentApi() {
  const {
    buildEncodedUcan,
    createRawAxiosRequestConfig,
    createAxiosErrorResponse,
  } = useCommonApi();
  const { isGuestOrLoggedIn } = storeToRefs(useAuthenticationStore());
  const { updateAuthState } = useBackendAuthApi();

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
        numParticipants: item.numParticipants,
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
        clustersStats: item.clustersStats,
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
          numParticipants: item.numParticipants,
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
          clustersStats: item.clustersStats,
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
    filter: CommentFeedFilter,
    clusterKey: PolisKey | undefined
  ) {
    try {
      const params: ApiV1OpinionFetchByConversationPostRequest = {
        conversationSlugId: postSlugId,
        filter: filter,
        clusterKey: clusterKey,
      };

      if (isGuestOrLoggedIn.value) {
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

  type CreateNewCommentSuccessResponse =
    AxiosSuccessResponse<ApiV1OpinionCreatePost200Response>;

  type CreateNewCommentResponse =
    | CreateNewCommentSuccessResponse
    | AxiosErrorResponse;

  async function createNewComment(
    commentBody: string,
    postSlugId: string
  ): Promise<CreateNewCommentResponse> {
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
      ).apiV1OpinionCreatePost(
        params,
        createRawAxiosRequestConfig({ encodedUcan: encodedUcan })
      );

      if (response.data.success) {
        // TODO: properly manage errors in backend and return login status to update to
        await updateAuthState({ partialLoginStatus: { isKnown: true } });
      }
      return {
        data: response.data,
        status: "success",
      };
    } catch (e) {
      return createAxiosErrorResponse(e);
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

  async function fetchOpinionsBySlugIdList(
    opinionSlugIdList: string[]
  ): Promise<OpinionItem[]> {
    const params: ApiV1OpinionFetchBySlugIdListPostRequest = {
      opinionSlugIdList: opinionSlugIdList,
    };

    const response = await DefaultApiFactory(
      undefined,
      undefined,
      api
    ).apiV1OpinionFetchBySlugIdListPost(params, {});

    const opnionItemList: OpinionItem[] = [];
    for (const item of response.data) {
      opnionItemList.push(createLocalCommentObject([item])[0]);
    }

    return opnionItemList;
  }

  async function fetchConsensusItemList(params: {
    conversationSlugId: string;
  }): Promise<OpinionItem[]> {
    let data: Array<ApiV1UserOpinionFetchPost200ResponseInnerOpinionItem>;
    if (isGuestOrLoggedIn.value) {
      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1OpinionFetchConsensusByConversationPost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1OpinionFetchConsensusByConversationPost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });
      data = response.data;
    } else {
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1OpinionFetchConsensusByConversationPost(params, {});
      data = response.data;
    }
    const opinionAnalysisItem: OpinionItem[] = data.map((val) => {
      return {
        ...val,
        createdAt: new Date(val.createdAt),
        updatedAt: new Date(val.updatedAt),
      };
    });
    return opinionAnalysisItem;
  }

  async function fetchMajorityItemList(params: {
    conversationSlugId: string;
  }): Promise<OpinionItem[]> {
    let data: Array<ApiV1UserOpinionFetchPost200ResponseInnerOpinionItem>;
    if (isGuestOrLoggedIn.value) {
      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1OpinionFetchMajorityByConversationPost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1OpinionFetchMajorityByConversationPost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });
      data = response.data;
    } else {
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1OpinionFetchMajorityByConversationPost(params, {});
      data = response.data;
    }
    const opinionAnalysisItem: OpinionItem[] = data.map((val) => {
      return {
        ...val,
        createdAt: new Date(val.createdAt),
        updatedAt: new Date(val.updatedAt),
      };
    });
    return opinionAnalysisItem;
  }

  async function fetchControversialItemList(params: {
    conversationSlugId: string;
  }): Promise<OpinionItem[]> {
    let data: Array<ApiV1UserOpinionFetchPost200ResponseInnerOpinionItem>;
    if (isGuestOrLoggedIn.value) {
      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1OpinionFetchControversialByConversationPost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1OpinionFetchControversialByConversationPost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });
      data = response.data;
    } else {
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1OpinionFetchControversialByConversationPost(params, {});
      data = response.data;
    }
    const opinionAnalysisItem: OpinionItem[] = data.map((val) => {
      return {
        ...val,
        createdAt: new Date(val.createdAt),
        updatedAt: new Date(val.updatedAt),
      };
    });
    return opinionAnalysisItem;
  }

  async function fetchAllRepresentativeItemLists(params: {
    conversationSlugId: string;
  }): Promise<Partial<Record<PolisKey, OpinionItem[]>>> {
    let data: ApiV1OpinionFetchRepresentativeByConversationPost200Response;
    if (isGuestOrLoggedIn.value) {
      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1OpinionFetchRepresentativeByConversationPost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1OpinionFetchRepresentativeByConversationPost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });
      data = response.data;
    } else {
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1OpinionFetchRepresentativeByConversationPost(params, {});
      data = response.data;
    }
    const opinionAnalysisItems: Partial<Record<PolisKey, OpinionItem[]>> = {};

    Object.entries(data).forEach(
      ([key, val]: [
        PolisKey,
        Array<ApiV1UserOpinionFetchPost200ResponseInnerOpinionItem>,
      ]) => {
        opinionAnalysisItems[key] = val.map((item) => ({
          ...item,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
        }));
      }
    );
    return opinionAnalysisItems;
  }

  return {
    createNewComment,
    fetchCommentsForPost,
    fetchHiddenCommentsForPost,
    deleteCommentBySlugId,
    fetchOpinionsBySlugIdList,
    fetchConsensusItemList,
    fetchMajorityItemList,
    fetchControversialItemList,
    fetchAllRepresentativeItemLists,
  };
}
