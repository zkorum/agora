import { api } from "boot/axios";
import { buildAuthorizationHeader } from "../crypto/ucan/operation";
import {
  type ApiV1ModerateFetchCommentReportPostRequest,
  type ApiV1ModerateFetchPostReportPostRequest,
  type ApiV1ModerateReportCommentPostRequest,
  type ApiV1ModerateReportPostPostRequest,
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
} from "src/api";
import { useCommonApi } from "./common";
import { useNotify } from "../ui/notify";
import type {
  ModerationAction,
  ModerationProperties,
  ModerationReason,
} from "src/shared/types/zod";

export function useBackendModerateApi() {
  const { buildEncodedUcan } = useCommonApi();

  const { showNotifyMessage } = useNotify();

  async function moderatePost(
    postSlugId: string,
    moderationAction: ModerationAction,
    moderationReason: ModerationReason,
    moderationExplanation: string
  ) {
    try {
      const params: ApiV1ModerateReportPostPostRequest = {
        postSlugId: postSlugId,
        moderationAction: moderationAction,
        moderationExplanation: moderationExplanation,
        moderationReason: moderationReason,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1ModerateReportPostPost(params);
      const encodedUcan = await buildEncodedUcan(url, options);
      await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1ModerateReportPostPost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });
      showNotifyMessage("Submitted report");
      return true;
    } catch (e) {
      console.error(e);
      showNotifyMessage("Failed to submit moderation report for post");
      return false;
    }
  }

  async function moderateComment(
    commentSlugId: string,
    moderationAction: ModerationAction,
    moderationReason: ModerationReason,
    moderationExplanation: string
  ) {
    try {
      const params: ApiV1ModerateReportCommentPostRequest = {
        commentSlugId: commentSlugId,
        moderationAction: moderationAction,
        moderationExplanation: moderationExplanation,
        moderationReason: moderationReason,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1ModerateReportCommentPost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1ModerateReportCommentPost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });
      showNotifyMessage("Submitted report");
      return true;
    } catch (e) {
      console.error(e);
      showNotifyMessage("Failed to submit moderation report for comment");
      return false;
    }
  }

  async function fetchPostModeration(
    postSlugId: string
  ): Promise<ModerationProperties> {
    try {
      const params: ApiV1ModerateFetchPostReportPostRequest = {
        postSlugId: postSlugId,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1ModerateFetchPostReportPost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1ModerateFetchPostReportPost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });
      return response.data;
    } catch (e) {
      console.error(e);
      showNotifyMessage("Failed to fetch post moderation details");
      return {
        isModerated: false,
      };
    }
  }

  async function fetchCommentModeration(
    commentSlugId: string
  ): Promise<ModerationProperties> {
    try {
      const params: ApiV1ModerateFetchCommentReportPostRequest = {
        commentSlugId: commentSlugId,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1ModerateFetchCommentReportPost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1ModerateFetchCommentReportPost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });
      return response.data;
    } catch (e) {
      console.error(e);
      showNotifyMessage("Failed to fetch comment moderation details");
      return {
        isModerated: false,
      };
    }
  }

  return {
    moderatePost,
    moderateComment,
    fetchPostModeration,
    fetchCommentModeration,
  };
}
