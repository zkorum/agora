import {
  type ApiV1ModerationConversationCreatePostRequest,
  type ApiV1ModerationConversationWithdrawPostRequest,
  type ApiV1ModerationOpinionCreatePostRequest,
  type ApiV1ModerationOpinionWithdrawPostRequest,
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
} from "src/api";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { Dto } from "src/shared/types/dto";
import type {
  ConversationModerationAction,
  ConversationModerationProperties,
  ModerationReason,
  OpinionModerationAction,
  OpinionModerationProperties,
} from "src/shared/types/zod";

import { buildAuthorizationHeader } from "../crypto/ucan/operation";
import { useNotify } from "../ui/notify";
import { api } from "./client";
import { useCommonApi } from "./common";
import {
  type ModerationApiTranslations,
  moderationApiTranslations,
} from "./moderation.i18n";

export function useBackendModerateApi() {
  const { buildEncodedUcan } = useCommonApi();

  const { showNotifyMessage } = useNotify();
  const { t } = useComponentI18n<ModerationApiTranslations>(
    moderationApiTranslations
  );

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
      showNotifyMessage(t("moderationDecisionCompleted"));
      return true;
    } catch (e) {
      console.error(
        "Error while submitting moderation decision on conversation",
        e
      );
      showNotifyMessage(t("failedToSubmitModerationDecision"));
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
      showNotifyMessage(t("moderationDecisionCompleted"));
      return true;
    } catch (e) {
      console.error("Error while submitting moderation decision on opinion", e);
      showNotifyMessage(t("failedToSubmitModerationDecision"));
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

      return Dto.getConversationModerationStatusResponse.parse(response.data);
    } catch (e) {
      console.error(e);
      showNotifyMessage(t("failedToFetchPostModerationDetails"));
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

      return Dto.getOpinionModerationStatusResponse.parse(response.data);
    } catch (e) {
      console.error(e);
      showNotifyMessage(t("failedToFetchCommentModerationDetails"));
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
      showNotifyMessage(t("moderationDecisionWithdrawn"));
      return true;
    } catch (e) {
      console.error(
        "Error while withdrawing moderation decision on conversation",
        e
      );
      showNotifyMessage(t("failedToWithdrawModerationDecision"));
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
      showNotifyMessage(t("moderationDecisionWithdrawn"));
      return true;
    } catch (e) {
      console.error(
        "Error while withdrawing moderation decision on opinion",
        e
      );
      showNotifyMessage(t("failedToWithdrawModerationDecision"));
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
