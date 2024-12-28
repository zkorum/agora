import { api } from "boot/axios";
import { buildAuthorizationHeader } from "../crypto/ucan/operation";
import {
  type ApiV1ModerateCancelCommentReportPostRequest,
  type ApiV1ModerateCancelPostReportPostRequest,
  type ApiV1ModerateReportCommentPostRequest,
  type ApiV1ModerateReportPostPostRequest,
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
} from "src/api";
import { useCommonApi } from "./common";
import { useNotify } from "../ui/notify";
import type {
  ModerationActionComments,
  ModerationActionPosts,
  ModerationPropertiesPosts,
  ModerationReason,
  zodModerationPropertiesComments,
} from "src/shared/types/zod";

export function useBackendModerateApi() {
  const { buildEncodedUcan } = useCommonApi();

  const { showNotifyMessage } = useNotify();

  async function moderatePost(
    postSlugId: string,
    moderationAction: ModerationActionPosts,
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
    moderationAction: ModerationActionComments,
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
  ): Promise<ModerationPropertiesPosts> {
    try {
      const params: ApiV1ModerateCancelPostReportPostRequest = {
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
      return {
        isModerated: response.data.isModerated,
        moderationAction: response.data.moderationAction,
        moderationExplanation: response.data.moderationExplanation,
        moderationReason: response.data.moderationReason,
        createdAt: new Date(response.data.createdAt),
        updatedAt: new Date(response.data.updatedAt),
      };
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
  ): Promise<zodModerationPropertiesComments> {
    try {
      const params: ApiV1ModerateCancelCommentReportPostRequest = {
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
      return {
        isModerated: response.data.isModerated,
        moderationAction: response.data.moderationAction,
        moderationExplanation: response.data.moderationExplanation,
        moderationReason: response.data.moderationReason,
        createdAt: new Date(response.data.createdAt),
        updatedAt: new Date(response.data.updatedAt),
      };
    } catch (e) {
      console.error(e);
      showNotifyMessage("Failed to fetch comment moderation details");
      return {
        isModerated: false,
      };
    }
  }

  async function cancelModerationPostReport(
    postSlugId: string
  ): Promise<boolean> {
    try {
      const params: ApiV1ModerateCancelPostReportPostRequest = {
        postSlugId: postSlugId,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1ModerateCancelPostReportPost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1ModerateCancelPostReportPost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });
      return true;
    } catch (e) {
      console.error(e);
      showNotifyMessage("Failed to fetch comment moderation details");
      return false;
    }
  }

  async function cancelModerationCommentReport(
    commentSlugId: string
  ): Promise<boolean> {
    try {
      const params: ApiV1ModerateCancelCommentReportPostRequest = {
        commentSlugId: commentSlugId,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1ModerateCancelCommentReportPost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1ModerateCancelCommentReportPost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });
      return true;
    } catch (e) {
      console.error(e);
      showNotifyMessage("Failed to fetch comment moderation details");
      return false;
    }
  }

  return {
    moderatePost,
    moderateComment,
    fetchPostModeration,
    fetchCommentModeration,
    cancelModerationPostReport,
    cancelModerationCommentReport,
  };
}
