import { axiosInstance } from "../client";
import { buildAuthorizationHeader } from "../../crypto/ucan/operation";
import type { ApiV1ConversationCreatePost200Response } from "src/api";
import { useCommonApi } from "../common";
import { CSV_UPLOAD_FIELD_NAMES } from "src/shared-app-api/csvUpload";

export interface ImportConversationFromCsvParams {
  summaryFile: File;
  commentsFile: File;
  votesFile: File;
  postAsOrganizationName: string;
  targetIsoConvertDateString: string | undefined;
  isIndexed: boolean;
  isLoginRequired: boolean;
}

export function useBackendPostApi() {
  const { buildEncodedUcan } = useCommonApi();

  async function importConversationFromCsv(
    params: ImportConversationFromCsvParams
  ): Promise<ApiV1ConversationCreatePost200Response> {
    const formData = new FormData();

    // Add files with correct field names
    formData.append(CSV_UPLOAD_FIELD_NAMES.SUMMARY_FILE, params.summaryFile);
    formData.append(CSV_UPLOAD_FIELD_NAMES.COMMENTS_FILE, params.commentsFile);
    formData.append(CSV_UPLOAD_FIELD_NAMES.VOTES_FILE, params.votesFile);

    // Add metadata
    formData.append("postAsOrganization", params.postAsOrganizationName);
    formData.append(
      "indexConversationAt",
      params.targetIsoConvertDateString || ""
    );
    formData.append("isIndexed", String(params.isIndexed));
    formData.append("isLoginRequired", String(params.isLoginRequired));

    // Build UCAN for authorization
    const url = "/api/v1/conversation/import-csv";
    const options = {
      method: "POST",
      url,
    };
    const encodedUcan = await buildEncodedUcan(url, options);

    const response = await axiosInstance.post(url, formData, {
      headers: {
        ...buildAuthorizationHeader(encodedUcan),
        "Content-Type": "multipart/form-data",
      },
      timeout: 300000, // 5 minutes for large file upload
    });

    return response.data;
  }

  return {
    importConversationFromCsv,
  };
}
