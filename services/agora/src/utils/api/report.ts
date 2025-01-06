import { api } from "boot/axios";
import { buildAuthorizationHeader } from "../crypto/ucan/operation";
import {
  type ApiV1ModerationCommentWithdrawPostRequest,
  type ApiV1ModerationPostWithdrawPostRequest,
  type ApiV1ReportFetchReportsByPostSlugIdPost200ResponseInner,
  type ApiV1ReportSubmitReportByCommentSlugIdPostRequest,
  type ApiV1ReportSubmitReportByPostSlugIdPostRequest,
  DefaultApiAxiosParamCreator,
  DefaultApiFactory,
} from "src/api";
import { useCommonApi } from "./common";
import { useNotify } from "../ui/notify";
import type {
  UserReportExplanation,
  UserReportItem,
  UserReportReason,
} from "src/shared/types/zod";
import type {
  FetchUserReportsByCommentSlugIdResponse,
  FetchUserReportsByPostSlugIdResponse,
} from "src/shared/types/dto";

export function useBackendReportApi() {
  const { buildEncodedUcan } = useCommonApi();

  const { showNotifyMessage } = useNotify();

  async function createUserReportByPostSlugId(
    postSlugId: string,
    userReportReason: UserReportReason,
    userReportExplanation: UserReportExplanation
  ) {
    try {
      const params: ApiV1ReportSubmitReportByPostSlugIdPostRequest = {
        postSlugId: postSlugId,
        reportReason: userReportReason,
        reportExplanation:
          userReportExplanation?.length == 0
            ? undefined
            : userReportExplanation,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1ReportSubmitReportByPostSlugIdPost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1ReportSubmitReportByPostSlugIdPost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });
      showNotifyMessage("Submitted report");
      return true;
    } catch (e) {
      console.error(e);
      showNotifyMessage("Failed to submit user report for post");
      return false;
    }
  }

  async function createUserReportByCommentSlugId(
    commentSlugId: string,
    userReportReason: UserReportReason,
    userReportExplanation: UserReportExplanation
  ) {
    try {
      const params: ApiV1ReportSubmitReportByCommentSlugIdPostRequest = {
        commentSlugId: commentSlugId,
        reportReason: userReportReason,
        reportExplanation:
          userReportExplanation?.length == 0
            ? undefined
            : userReportExplanation,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1ReportSubmitReportByCommentSlugIdPost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1ReportSubmitReportByCommentSlugIdPost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });
      showNotifyMessage("Submitted report");
      return true;
    } catch (e) {
      console.error(e);
      showNotifyMessage("Failed to submit user report for comment");
      return false;
    }
  }

  function createInternalUserReportObjectList(
    unparsedUserReportList: ApiV1ReportFetchReportsByPostSlugIdPost200ResponseInner[]
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
      const params: ApiV1ModerationPostWithdrawPostRequest = {
        postSlugId: postSlugId,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1ReportFetchReportsByPostSlugIdPost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1ReportFetchReportsByPostSlugIdPost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });

      return createInternalUserReportObjectList(response.data);
    } catch (e) {
      console.error(e);
      showNotifyMessage("Failed to fetch post reports");
      return [];
    }
  }

  async function fetchUserReportsByCommentSlugId(
    commentSlugId: string
  ): Promise<FetchUserReportsByCommentSlugIdResponse> {
    try {
      const params: ApiV1ModerationCommentWithdrawPostRequest = {
        commentSlugId: commentSlugId,
      };

      const { url, options } =
        await DefaultApiAxiosParamCreator().apiV1ReportFetchReportsByCommentSlugIdPost(
          params
        );
      const encodedUcan = await buildEncodedUcan(url, options);
      const response = await DefaultApiFactory(
        undefined,
        undefined,
        api
      ).apiV1ReportFetchReportsByCommentSlugIdPost(params, {
        headers: {
          ...buildAuthorizationHeader(encodedUcan),
        },
      });

      return createInternalUserReportObjectList(response.data);
    } catch (e) {
      console.error(e);
      showNotifyMessage("Failed to fetch post reports");
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
