import { api } from "../client";
import {
  type ApiV1OpinionCreatePostRequest,
  type ApiV1OpinionFetchByConversationPostRequest,
  type ApiV1OpinionFetchHiddenByConversationPostRequest,
  type ApiV1OpinionFetchBySlugIdListPostRequest,
  type ApiV1UserOpinionFetchPost200ResponseInnerOpinionItem,
  type ApiV1OpinionFetchAnalysisByConversationPost200Response,
  type ApiV1OpinionFetchAnalysisByConversationPost200ResponseClusters0,
  type ApiV1OpinionFetchAnalysisByConversationPost200ResponseConsensusInner,
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
} from "src/api";
import { useCommonApi } from "../common";
import type {
  PolisKey,
  OpinionItem,
  AnalysisOpinionItem,
  PolisClusters,
  moderationStatusOptionsType,
} from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { storeToRefs } from "pinia";
import { useBackendAuthApi } from "../auth";

export type CommentTabFilters = "new" | "moderated" | "discover" | "hidden";

export function useBackendCommentApi() {
  const { buildEncodedUcan, createRawAxiosRequestConfig } = useCommonApi();
  const { isGuestOrLoggedIn } = storeToRefs(useAuthenticationStore());
  const { updateAuthState } = useBackendAuthApi();

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
      });
    });

    return parsedCommentItemList;
  }

  async function fetchHiddenCommentsForPost(
    postSlugId: string
  ): Promise<OpinionItem[]> {
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

    return createLocalCommentObject(response.data);
  }

  async function fetchCommentsForPost(
    postSlugId: string,
    filter: CommentTabFilters,
    clusterKey: PolisKey | undefined
  ): Promise<OpinionItem[]> {
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
  }

  async function createNewComment(
    commentBody: string,
    postSlugId: string
  ): Promise<{ success: boolean; opinionSlugId?: string; reason?: string }> {
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
      return {
        success: true,
        opinionSlugId: response.data.opinionSlugId,
      };
    } else {
      return {
        success: false,
        reason: response.data.reason,
      };
    }
  }

  async function deleteCommentBySlugId(commentSlugId: string): Promise<void> {
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

    const opinionItemList: OpinionItem[] = [];
    for (const item of response.data) {
      opinionItemList.push(createLocalCommentObject([item])[0]);
    }

    return opinionItemList;
  }

  async function fetchAnalysisData(params: {
    conversationSlugId: string;
  }): Promise<{
    consensus: AnalysisOpinionItem[];
    controversial: AnalysisOpinionItem[];
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
        const representative: Array<ApiV1OpinionFetchAnalysisByConversationPost200ResponseConsensusInner> =
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

    const opinionConsensusItem: AnalysisOpinionItem[] = data.consensus.map(
      (val) => {
        return {
          ...val,
          createdAt: new Date(val.createdAt),
          updatedAt: new Date(val.updatedAt),
        };
      }
    );

    const opinionControversialItem: AnalysisOpinionItem[] =
      data.controversial.map((val) => {
        return {
          ...val,
          createdAt: new Date(val.createdAt),
          updatedAt: new Date(val.updatedAt),
        };
      });

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
