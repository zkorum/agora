import {
  type ApiV1ModerationConversationCreatePostRequest,
  type ApiV1ModerationConversationWithdrawPostRequest,
  type ApiV1ModerationOpinionCreatePostRequest,
  type ApiV1ModerationOpinionWithdrawPostRequest,
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
} from "src/api";
import type {
  ConversationModerationAction,
  ConversationModerationProperties,
  ModerationReason,
  moderationStatusOptionsType,
  OpinionModerationAction,
  OpinionModerationProperties,
} from "src/shared/types/zod";

import { buildAuthorizationHeader } from "../crypto/ucan/operation";
import { useNotify } from "../ui/notify";
import { api } from "./client";
import { useCommonApi } from "./common";

export function useBackendModerateApi() {
  const { buildEncodedUcan } = useCommonApi();

  const { showNotifyMessage } = useNotify();

  async function moderatePost(
    postSlugId: string,
    moderationAction: ConversationModerationAction,
    moderationReason: ModerationReason,
    moderationExplanation: string
  ) {
    try {
      const params: ApiV1ModerationConversationCreatePostRequest = {
        conversationSlugId: postSlugId,
        moderationAction: moderationAction,
        moderationExplanation: moderationExplanation,
        moderationReason: moderationReason,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1ModerationConversationCreatePost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1ModerationConversationCreatePost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });
      showNotifyMessage("Moderation decision completed");
      return true;
    } catch (e) {
      console.error(
        "Error while submitting moderation decision on conversation",
        e
      );
      showNotifyMessage("Failed to submit moderation decision");
      return false;
    }
  }

  async function moderateComment(
    commentSlugId: string,
    moderationAction: OpinionModerationAction,
    moderationReason: ModerationReason,
    moderationExplanation: string
  ) {
    try {
      const params: ApiV1ModerationOpinionCreatePostRequest = {
        opinionSlugId: commentSlugId,
        moderationAction: moderationAction,
        moderationExplanation: moderationExplanation,
        moderationReason: moderationReason,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1ModerationOpinionCreatePost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1ModerationOpinionCreatePost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });
      showNotifyMessage("Moderation decision completed");
      return true;
    } catch (e) {
      console.error("Error while submitting moderation decision on opinion", e);
      showNotifyMessage("Failed to submit moderation decision");
      return false;
    }
  }

  async function getConversationModerationStatus(
    postSlugId: string
  ): Promise<ConversationModerationProperties> {
    try {
      const params: ApiV1ModerationConversationWithdrawPostRequest = {
        conversationSlugId: postSlugId,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1ModerationConversationGetPost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1ModerationConversationGetPost(params, {
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

  async function getOpinionModerationStatus(
    commentSlugId: string
  ): Promise<OpinionModerationProperties> {
    try {
      const params: ApiV1ModerationOpinionWithdrawPostRequest = {
        opinionSlugId: commentSlugId,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1ModerationOpinionGetPost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1ModerationOpinionGetPost(params, {
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
      const params: ApiV1ModerationConversationWithdrawPostRequest = {
        conversationSlugId: postSlugId,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1ModerationConversationWithdrawPost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1ModerationConversationWithdrawPost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });
      showNotifyMessage("Moderation decision withdrawn");
      return true;
    } catch (e) {
      console.error(
        "Error while withdrawing moderation decision on conversation",
        e
      );
      showNotifyMessage("Failed to withdraw moderation decision");
      return false;
    }
  }

  async function cancelModerationCommentReport(
    commentSlugId: string
  ): Promise<boolean> {
    try {
      const params: ApiV1ModerationOpinionWithdrawPostRequest = {
        opinionSlugId: commentSlugId,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1ModerationOpinionWithdrawPost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1ModerationOpinionWithdrawPost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });
      showNotifyMessage("Moderation decision withdrawn");
      return true;
    } catch (e) {
      console.error(
        "Error while withdrawing moderation decision on opinion",
        e
      );
      showNotifyMessage("Failed to withdraw moderation decision");
      return false;
    }
  }

  return {
    moderatePost,
    moderateComment,
    getConversationModerationStatus,
    getOpinionModerationStatus,
    cancelModerationPostReport,
    cancelModerationCommentReport,
  };
}
