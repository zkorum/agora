import {
  type ApiV1ModerationConversationWithdrawPostRequest,
  type ApiV1ModerationOpinionWithdrawPostRequest,
  type ApiV1ReportConversationCreatePostRequest,
  type ApiV1ReportConversationFetchPost200ResponseInner,
  type ApiV1ReportOpinionCreatePostRequest,
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
} from "src/api";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type {
  FetchUserReportsByCommentSlugIdResponse,
  FetchUserReportsByPostSlugIdResponse,
} from "src/shared/types/dto";
import type {
  UserReportExplanation,
  UserReportItem,
  UserReportReason,
} from "src/shared/types/zod";

import { buildAuthorizationHeader } from "../crypto/ucan/operation";
import { useNotify } from "../ui/notify";
import { api } from "./client";
import { useCommonApi } from "./common";
import {
  type ReportApiTranslations,
  reportApiTranslations,
} from "./report.i18n";

export function useBackendReportApi() {
  const { buildEncodedUcan } = useCommonApi();

  const { showNotifyMessage } = useNotify();
  const { t } = useComponentI18n<ReportApiTranslations>(
    reportApiTranslations
  );

  async function createUserReportByPostSlugId(
    postSlugId: string,
    userReportReason: UserReportReason,
    userReportExplanation: UserReportExplanation
  ) {
    try {
      const params: ApiV1ReportConversationCreatePostRequest = {
        conversationSlugId: postSlugId,
        reportReason: userReportReason,
        reportExplanation:
          userReportExplanation?.length == 0
            ? undefined
            : userReportExplanation,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1ReportConversationCreatePost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1ReportConversationCreatePost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });
      showNotifyMessage(t("submittedReport"));
      return true;
    } catch (e) {
      console.error(e);
      showNotifyMessage(t("failedToSubmitPostReport"));
      return false;
    }
  }

  async function createUserReportByCommentSlugId(
    commentSlugId: string,
    userReportReason: UserReportReason,
    userReportExplanation: UserReportExplanation
  ) {
    try {
      const params: ApiV1ReportOpinionCreatePostRequest = {
        opinionSlugId: commentSlugId,
        reportReason: userReportReason,
        reportExplanation:
          userReportExplanation?.length == 0
            ? undefined
            : userReportExplanation,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1ReportOpinionCreatePost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1ReportOpinionCreatePost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });
      showNotifyMessage(t("submittedReport"));
      return true;
    } catch (e) {
      console.error(e);
      showNotifyMessage(t("failedToSubmitCommentReport"));
      return false;
    }
  }

  function createInternalUserReportObjectList(
    unparsedUserReportList: ApiV1ReportConversationFetchPost200ResponseInner[]
  ): UserReportItem[] {
    const reportList: UserReportItem[] = [];
    unparsedUserReportList.forEach((report) => {
      const parsedReport: UserReportItem = {
        username: report.username,
        reason: report.reason,
        explanation: report.explanation,
        createdAt: new Date(report.createdAt),
        id: report.id,
      };
      reportList.push(parsedReport);
    });
    return reportList;
  }

  async function fetchUserReportsByPostSlugId(
    postSlugId: string
  ): Promise<FetchUserReportsByPostSlugIdResponse> {
    try {
      const params: ApiV1ModerationConversationWithdrawPostRequest = {
        conversationSlugId: postSlugId,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1ReportConversationFetchPost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1ReportConversationFetchPost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });

      return createInternalUserReportObjectList(response.data);
    } catch (e) {
      console.error(e);
      showNotifyMessage(t("failedToFetchPostReports"));
      return [];
    }
  }

  async function fetchUserReportsByCommentSlugId(
    commentSlugId: string
  ): Promise<FetchUserReportsByCommentSlugIdResponse> {
    try {
      const params: ApiV1ModerationOpinionWithdrawPostRequest = {
        opinionSlugId: commentSlugId,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1ReportOpinionFetchPost(params);
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1ReportOpinionFetchPost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });

      return createInternalUserReportObjectList(response.data);
    } catch (e) {
      console.error(e);
      showNotifyMessage(t("failedToFetchPostReports"));
      return [];
    }
  }

  return {
    createUserReportByPostSlugId,
    createUserReportByCommentSlugId,
    fetchUserReportsByPostSlugId,
    fetchUserReportsByCommentSlugId,
  };
}
