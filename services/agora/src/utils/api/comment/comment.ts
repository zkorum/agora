import { api } from "boot/axios";
import type {
  ApiV1OpinionCreatePost200Response,
  ApiV1OpinionFetchAnalysisByConversationPost200Response,
  ApiV1OpinionFetchAnalysisByConversationPost200ResponseClusters0,
  ApiV1OpinionFetchBySlugIdListPostRequest,
} from "src/api";
import {
  type ApiV1OpinionCreatePostRequest,
  type ApiV1OpinionFetchByConversationPostRequest,
  type ApiV1OpinionFetchHiddenByConversationPostRequest,
  type ApiV1UserOpinionFetchPost200ResponseInnerOpinionItem,
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
} from "src/api";
import type { AxiosErrorResponse, AxiosSuccessResponse } from "../common";
import { useCommonApi } from "../common";
import type { PolisClusters, PolisKey } from "src/shared/types/zod";
import {
  type OpinionItem,
  type moderationStatusOptionsType,
} from "src/shared/types/zod";
import { useNotify } from "../../ui/notify";
import { useAuthenticationStore } from "src/stores/authentication";
import { storeToRefs } from "pinia";
import { useBackendAuthApi } from "../auth";

export type CommentTabFilters = "new" | "moderated" | "discover" | "hidden";

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
        numPasses: item.numPasses,
        updatedAt: new Date(item.updatedAt),
        username: String(item.username),
        isSeed: item.isSeed,
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
      ).apiV1OpinionFetchHiddenByConversationPost(
        params,
        createRawAxiosRequestConfig({
          encodedUcan: encodedUcan,
          timeoutProfile: "extended",
        })
      );

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
          numPasses: item.numPasses,
          updatedAt: new Date(item.updatedAt),
          username: String(item.username),
          isSeed: item.isSeed,
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
    filter: CommentTabFilters,
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
        ).apiV1OpinionFetchByConversationPost(
          params,
          createRawAxiosRequestConfig({
            encodedUcan: encodedUcan,
            timeoutProfile: "extended",
          })
        );
        return createLocalCommentObject(response.data);
      } else {
        const response = await DefaultApiFactory(
          undefined,
          undefined,
          api
        ).apiV1OpinionFetchByConversationPost(
          params,
          createRawAxiosRequestConfig({ timeoutProfile: "extended" })
        );
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
        createRawAxiosRequestConfig({
          encodedUcan: encodedUcan,
          timeoutProfile: "standard",
        })
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
    ).apiV1OpinionFetchBySlugIdListPost(
      params,
      createRawAxiosRequestConfig({})
    );

    const opnionItemList: OpinionItem[] = [];
    for (const item of response.data) {
      opnionItemList.push(createLocalCommentObject([item])[0]);
    }

    return opnionItemList;
  }

  async function fetchAnalysisData(params: {
    conversationSlugId: string;
  }): Promise<{
    consensus: OpinionItem[];
    controversial: OpinionItem[];
    polisClusters: Partial<PolisClusters>;
  }> {
    let data: ApiV1OpinionFetchAnalysisByConversationPost200Response;
    if (isGuestOrLoggedIn.value) {
      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1OpinionFetchAnalysisByConversationPost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1OpinionFetchAnalysisByConversationPost(
        params,
        createRawAxiosRequestConfig({
          encodedUcan: encodedUcan,
          timeoutProfile: "extended",
        })
      );
      data = response.data;
    } else {
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1OpinionFetchAnalysisByConversationPost(
        params,
        createRawAxiosRequestConfig({ timeoutProfile: "extended" })
      );
      data = response.data;
    }
    const clusters: Partial<PolisClusters> = {};

    Object.entries(data.clusters).forEach(
      ([key, val]: [
        PolisKey,
        ApiV1OpinionFetchAnalysisByConversationPost200ResponseClusters0,
      ]) => {
        const representative: Array<ApiV1UserOpinionFetchPost200ResponseInnerOpinionItem> =
          val.representative;
        const representativeItems = representative.map((item) => ({
          ...item,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
        }));
        clusters[key] = {
          ...val,
          representative: representativeItems,
        };
      }
    );

    const opinionConsensusItem: OpinionItem[] = data.consensus.map((val) => {
      return {
        ...val,
        createdAt: new Date(val.createdAt),
        updatedAt: new Date(val.updatedAt),
      };
    });

    const opinionControversialItem: OpinionItem[] = data.controversial.map(
      (val) => {
        return {
          ...val,
          createdAt: new Date(val.createdAt),
          updatedAt: new Date(val.updatedAt),
        };
      }
    );

    return {
      consensus: opinionConsensusItem,
      controversial: opinionControversialItem,
      polisClusters: clusters,
    };
  }

  return {
    createNewComment,
    fetchCommentsForPost,
    fetchHiddenCommentsForPost,
    deleteCommentBySlugId,
    fetchOpinionsBySlugIdList,
    fetchAnalysisData,
  };
}
