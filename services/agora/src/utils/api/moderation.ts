import { api } from "boot/axios";
import { buildAuthorizationHeader } from "../crypto/ucan/operation";
import {
  type ApiV1ModerationCommentCreatePostRequest,
  type ApiV1ModerationCommentWithdrawPostRequest,
  type ApiV1ModerationPostCreatePostRequest,
  type ApiV1ModerationPostWithdrawPostRequest,
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
} from "src/api";
import { useCommonApi } from "./common";
import { useNotify } from "../ui/notify";
import type {
  ModerationActionComments,
  ModerationActionPosts,
  ModerationPropertiesComments,
  ModerationPropertiesPosts,
  ModerationReason,
  moderationStatusOptionsType,
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
      const params: ApiV1ModerationPostCreatePostRequest = {
        postSlugId: postSlugId,
        moderationAction: moderationAction,
        moderationExplanation: moderationExplanation,
        moderationReason: moderationReason,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1ModerationPostCreatePost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1ModerationPostCreatePost(params, {
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
      const params: ApiV1ModerationCommentCreatePostRequest = {
        commentSlugId: commentSlugId,
        moderationAction: moderationAction,
        moderationExplanation: moderationExplanation,
        moderationReason: moderationReason,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1ModerationCommentCreatePost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1ModerationCommentCreatePost(params, {
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
      const params: ApiV1ModerationPostWithdrawPostRequest = {
        postSlugId: postSlugId,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1ModerationPostFetchReportPost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1ModerationPostFetchReportPost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });

      const moderationStatus = response.data
        .status as moderationStatusOptionsType;

      return {
        status: moderationStatus,
        action: response.data.action,
        explanation: response.data.explanation,
        reason: response.data.reason,
        createdAt: new Date(response.data.createdAt),
        updatedAt: new Date(response.data.updatedAt),
      };
    } catch (e) {
      console.error(e);
      showNotifyMessage("Failed to fetch post moderation details");
      return {
        status: "unmoderated",
      };
    }
  }

  async function fetchCommentModeration(
    commentSlugId: string
  ): Promise<ModerationPropertiesComments> {
    try {
      const params: ApiV1ModerationCommentWithdrawPostRequest = {
        commentSlugId: commentSlugId,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1ModerationCommentFetchReportPost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1ModerationCommentFetchReportPost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });

      const moderationStatus = response.data
        .status as moderationStatusOptionsType;

      return {
        status: moderationStatus,
        action: response.data.action,
        explanation: response.data.explanation,
        reason: response.data.reason,
        createdAt: new Date(response.data.createdAt),
        updatedAt: new Date(response.data.updatedAt),
      };
    } catch (e) {
      console.error(e);
      showNotifyMessage("Failed to fetch comment moderation details");
      return {
        status: "unmoderated",
      };
    }
  }

  async function cancelModerationPostReport(
    postSlugId: string
  ): Promise<boolean> {
    try {
      const params: ApiV1ModerationPostWithdrawPostRequest = {
        postSlugId: postSlugId,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1ModerationPostWithdrawPost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1ModerationPostWithdrawPost(params, {
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
      const params: ApiV1ModerationCommentWithdrawPostRequest = {
        commentSlugId: commentSlugId,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1ModerationCommentWithdrawPost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1ModerationCommentWithdrawPost(params, {
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
