/**
 * API utilities for interacting with Agora backend
 * Uses the generated OpenAPI client from services/load-testing/src/api
 * Pattern follows services/agora/src/utils/api/vote.ts and comment/comment.ts
 */

import http from "k6/http";
import {
    Dto,
    type FetchOpinionPageResponse,
    type SurveyAnswerSaveRequest,
    type SurveyAnswerSaveResponse,
    type SurveyFormFetchResponse,
} from "../shared/types/dto.js";
import type { SurveyQuestionFormItem } from "../shared/types/zod.js";
import {
    buildUcan,
    buildAuthorizationHeader,
} from "../crypto/ucan/operation.js";

// API base URL from environment or default to local dev server
const API_BASE_URL = __ENV.API_BASE_URL || "http://127.0.0.1:8084";

// Frontend base URL for simulating full page loads
const FRONTEND_BASE_URL = (
    __ENV.FRONTEND_BASE_URL || "http://127.0.0.1:3200"
).replace(/\/$/, "");

export interface CreateOpinionParams {
    conversationSlugId: string;
    opinionText: string;
    did: string;
    prefixedKey: string;
    backendDid: string;
}

export interface CreateOpinionResponse {
    success: boolean;
    opinionSlugId?: string;
    reason?: string;
    responseTime: number;
}

export interface VoteParams {
    commentSlugId: string;
    sourceVersion: string;
    votingAction: "agree" | "disagree" | "pass" | "cancel";
    did: string;
    prefixedKey: string;
    backendDid: string;
}

export interface VoteResponse {
    success: boolean;
    responseTime: number;
    error?: string;
}

export interface DeleteOpinionParams {
    opinionSlugId: string;
    did: string;
    prefixedKey: string;
    backendDid: string;
}

export interface DeleteOpinionResponse {
    success: boolean;
    responseTime: number;
    error?: string;
}

export interface DeleteUserParams {
    did: string;
    prefixedKey: string;
    backendDid: string;
}

export interface DeleteUserResponse {
    success: boolean;
    responseTime: number;
    error?: string;
}

export interface FetchOpinionsParams {
    conversationSlugId: string;
}

type ParticipationMode =
    | "account_required"
    | "strong_verification"
    | "email_verification"
    | "guest";

export interface FetchConversationMetadataParams {
    conversationSlugId: string;
}

export type FetchConversationMetadataResponse =
    | {
          success: true;
          participationMode: ParticipationMode;
          hasSurvey: boolean;
          responseTime: number;
      }
    | {
          success: false;
          responseTime: number;
          error: string;
      };

export interface FetchOpinionsResponse {
    success: boolean;
    opinions: { opinionSlugId: string; sourceVersion: string }[];
    responseTime: number;
    error?: string;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseParticipationMode(value: unknown): ParticipationMode | undefined {
    if (
        value === "account_required" ||
        value === "strong_verification" ||
        value === "email_verification" ||
        value === "guest"
    ) {
        return value;
    }

    return undefined;
}

function parseConversationMetadataResponse(body: unknown):
    | {
          participationMode: ParticipationMode;
          hasSurvey: boolean;
      }
    | undefined {
    if (!isObjectRecord(body)) {
        return undefined;
    }

    const conversationData = body.conversationData;
    if (!isObjectRecord(conversationData)) {
        return undefined;
    }

    const metadataRecord = conversationData.metadata;
    if (!isObjectRecord(metadataRecord)) {
        return undefined;
    }

    const participationMode = parseParticipationMode(
        metadataRecord.participationMode,
    );
    if (participationMode === undefined) {
        return undefined;
    }

    const interaction = conversationData.interaction;
    if (!isObjectRecord(interaction)) {
        return undefined;
    }
    const surveyGate = interaction.surveyGate;
    if (
        !isObjectRecord(surveyGate) ||
        typeof surveyGate.hasSurvey !== "boolean"
    ) {
        return undefined;
    }

    return {
        participationMode,
        hasSurvey: surveyGate.hasSurvey,
    };
}

export interface FetchConversationPageParams {
    conversationSlugId: string;
}

export interface FetchConversationPageResponse {
    success: boolean;
    responseTime: number;
    error?: string;
}

export interface FetchMainPageResponse {
    success: boolean;
    responseTime: number;
    error?: string;
}

export interface FetchSurveyFormParams {
    conversationSlugId: string;
    did: string;
    prefixedKey: string;
    backendDid: string;
}

export type FetchSurveyFormResponse = { responseTime: number } & (
    | (Pick<
          Extract<SurveyFormFetchResponse, { success: true }>,
          "success" | "surveyGate" | "currentRevision" | "questions"
      > & { error?: undefined })
    | {
          success: false;
          error: string;
          questions: SurveyQuestionFormItem[];
          surveyGate?: undefined;
      }
);

export type SaveSurveyAnswerParams = Pick<
    SurveyAnswerSaveRequest,
    | "conversationSlugId"
    | "questionSlugId"
    | "expectedQuestionSemanticVersion"
    | "knownSurveyRevision"
    | "answer"
> & {
    did: string;
    prefixedKey: string;
    backendDid: string;
};

export type SaveSurveyAnswerResponse = { responseTime: number } & (
    | (Pick<
          Extract<SurveyAnswerSaveResponse, { success: true }>,
          "success" | "surveyGate" | "justCompleted"
      > & { error?: undefined })
    | {
          success: false;
          error: string;
          surveyGate?: undefined;
          justCompleted?: undefined;
      }
);

export async function fetchSurveyForm(
    params: FetchSurveyFormParams,
): Promise<FetchSurveyFormResponse> {
    const { conversationSlugId, did, prefixedKey, backendDid } = params;
    const url = `${API_BASE_URL}/api/v1/survey/form/fetch`;
    const pathname = "/api/v1/survey/form/fetch";
    const requestBody = { conversationSlugId };

    try {
        const encodedUcan = await buildUcan({
            did,
            prefixedKey,
            pathname,
            method: "POST",
            backendDid,
        });
        const startTime = Date.now();
        const response = http.post(url, JSON.stringify(requestBody), {
            headers: {
                "Content-Type": "application/json",
                ...buildAuthorizationHeader(encodedUcan),
            },
            timeout: "30s",
        });
        const responseTime = Date.now() - startTime;

        const responseBody =
            typeof response.body === "string" ? response.body : "Unknown body";

        if (response.status !== 200) {
            return {
                success: false,
                responseTime,
                questions: [],
                error: `HTTP ${String(response.status)}: ${responseBody}`,
            };
        }

        const responseData = Dto.surveyFormFetchResponse.parse(
            JSON.parse(responseBody),
        );
        if (!responseData.success) {
            return {
                success: false,
                responseTime,
                questions: [],
                error: responseData.reason,
            };
        }
        return {
            success: true,
            responseTime,
            currentRevision: responseData.currentRevision,
            surveyGate: responseData.surveyGate,
            questions: responseData.questions,
        };
    } catch (error) {
        return {
            success: false,
            responseTime: 0,
            questions: [],
            error: String(error),
        };
    }
}

export async function saveSurveyAnswer(
    params: SaveSurveyAnswerParams,
): Promise<SaveSurveyAnswerResponse> {
    const {
        conversationSlugId,
        questionSlugId,
        expectedQuestionSemanticVersion,
        knownSurveyRevision,
        answer,
        did,
        prefixedKey,
        backendDid,
    } = params;
    const url = `${API_BASE_URL}/api/v1/survey/answer/save`;
    const pathname = "/api/v1/survey/answer/save";
    const requestBody = {
        conversationSlugId,
        questionSlugId,
        expectedQuestionSemanticVersion,
        knownSurveyRevision,
        answer,
    };

    try {
        const encodedUcan = await buildUcan({
            did,
            prefixedKey,
            pathname,
            method: "POST",
            backendDid,
        });
        const startTime = Date.now();
        const response = http.post(url, JSON.stringify(requestBody), {
            headers: {
                "Content-Type": "application/json",
                ...buildAuthorizationHeader(encodedUcan),
            },
            timeout: "30s",
        });
        const responseTime = Date.now() - startTime;

        if (response.status !== 200) {
            return {
                success: false,
                responseTime,
                error: `HTTP ${String(response.status)}: ${
                    typeof response.body === "string"
                        ? response.body
                        : "Unknown body"
                }`,
            };
        }

        const responseData = Dto.surveyAnswerSaveResponse.parse(
            response.json(),
        );
        if (!responseData.success) {
            return {
                success: false,
                responseTime,
                error: responseData.reason,
            };
        }

        return {
            success: true,
            responseTime,
            surveyGate: responseData.surveyGate,
            justCompleted: responseData.justCompleted,
        };
    } catch (error) {
        return {
            success: false,
            responseTime: 0,
            error: String(error),
        };
    }
}

/**
 * Fetch all visible opinions in a conversation via bounded public pages.
 */
export function fetchOpinions(
    params: FetchOpinionsParams,
): FetchOpinionsResponse {
    const { conversationSlugId } = params;

    const url = `${API_BASE_URL}/api/v1/opinion/fetch-page`;

    try {
        // Make unauthenticated request (no authorization header)
        const startTime = Date.now();

        const opinions: FetchOpinionsResponse["opinions"] = [];
        let cursor: FetchOpinionPageResponse["nextCursor"] = null;
        const seenCursors = new Set<string>();
        do {
            const response = http.post(
                url,
                JSON.stringify({ conversationSlugId, filter: "new", cursor }),
                {
                    headers: { "Content-Type": "application/json" },
                    timeout: "30s",
                },
            );
            if (response.status !== 200) {
                return {
                    success: false,
                    opinions: [],
                    responseTime: Date.now() - startTime,
                    error: `HTTP ${String(response.status)}`,
                };
            }
            const page = Dto.fetchOpinionPageResponse.parse(response.json());
            opinions.push(
                ...page.items.map((item) => ({
                    opinionSlugId: item.opinionSlugId,
                    sourceVersion: item.displayContent.sourceVersion,
                })),
            );
            cursor = page.nextCursor;
            if (cursor !== null) {
                if (seenCursors.has(cursor.opinionSlugId)) {
                    return {
                        success: false,
                        opinions: [],
                        responseTime: Date.now() - startTime,
                        error: "Repeated opinion page cursor",
                    };
                }
                seenCursors.add(cursor.opinionSlugId);
            }
        } while (cursor !== null);
        return {
            success: true,
            opinions,
            responseTime: Date.now() - startTime,
        };
    } catch (error) {
        return {
            success: false,
            opinions: [],
            responseTime: 0,
            error: String(error),
        };
    }
}

export function fetchConversationMetadata({
    conversationSlugId,
}: FetchConversationMetadataParams): FetchConversationMetadataResponse {
    const url = `${API_BASE_URL}/api/v1/conversation/get`;
    const requestBody = { conversationSlugId };

    try {
        const startTime = Date.now();
        const response = http.post(url, JSON.stringify(requestBody), {
            headers: {
                "Content-Type": "application/json",
            },
            timeout: "30s",
        });
        const responseTime = Date.now() - startTime;
        const responseBody =
            typeof response.body === "string" ? response.body : "Unknown body";

        if (response.status !== 200) {
            return {
                success: false,
                responseTime,
                error: `HTTP ${String(response.status)}: ${responseBody}`,
            };
        }

        const parsedMetadata = parseConversationMetadataResponse(
            JSON.parse(responseBody),
        );
        if (parsedMetadata === undefined) {
            return {
                success: false,
                responseTime,
                error: "Unexpected conversation metadata response shape",
            };
        }

        return {
            success: true,
            participationMode: parsedMetadata.participationMode,
            hasSurvey: parsedMetadata.hasSurvey,
            responseTime,
        };
    } catch (error) {
        return {
            success: false,
            responseTime: 0,
            error: String(error),
        };
    }
}

/**
 * Create a new opinion/comment in a conversation
 * Uses the generated OpenAPI endpoint following the agora pattern
 */
export async function createOpinion(
    params: CreateOpinionParams,
): Promise<CreateOpinionResponse> {
    const { conversationSlugId, opinionText, did, prefixedKey, backendDid } =
        params;

    const url = `${API_BASE_URL}/api/v1/opinion/create`;
    const pathname = "/api/v1/opinion/create";

    const requestBody = {
        opinionBody: opinionText,
        conversationSlugId,
    };

    try {
        // Build UCAN token
        const encodedUcan = await buildUcan({
            did,
            prefixedKey,
            pathname,
            method: "POST",
            backendDid,
        });

        // Make request with UCAN in headers
        const startTime = Date.now();

        const response = http.post(url, JSON.stringify(requestBody), {
            headers: {
                "Content-Type": "application/json",
                ...buildAuthorizationHeader(encodedUcan),
            },
            timeout: "30s",
        });

        const responseTime = Date.now() - startTime;

        if (response.status === 200 || response.status === 201) {
            const responseData = JSON.parse(response.body as string) as {
                success: boolean;
                opinionSlugId?: string;
                reason?: string;
            };
            if (responseData.success) {
                return {
                    success: true,
                    opinionSlugId: responseData.opinionSlugId,
                    responseTime,
                };
            } else {
                return {
                    success: false,
                    reason: responseData.reason,
                    responseTime,
                };
            }
        } else {
            return {
                success: false,
                reason: `HTTP ${String(response.status)}: ${
                    typeof response.body === "string"
                        ? response.body
                        : "Unknown body"
                }`,
                responseTime,
            };
        }
    } catch (error) {
        return {
            success: false,
            reason: String(error),
            responseTime: 0,
        };
    }
}

/**
 * Cast a vote on a comment/opinion
 * Uses the generated OpenAPI endpoint following the agora pattern
 */
export async function castVote(params: VoteParams): Promise<VoteResponse> {
    const {
        commentSlugId,
        sourceVersion,
        votingAction,
        did,
        prefixedKey,
        backendDid,
    } = params;

    const url = `${API_BASE_URL}/api/v1/vote/cast`;
    const pathname = "/api/v1/vote/cast";

    try {
        const requestBody = Dto.castVoteRequest.parse({
            opinionSlugId: commentSlugId,
            chosenOption: votingAction,
            sourceVersion,
        });
        // Build UCAN token
        const encodedUcan = await buildUcan({
            did,
            prefixedKey,
            pathname,
            method: "POST",
            backendDid,
        });

        // Make request with UCAN in headers
        const startTime = Date.now();

        const response = http.post(url, JSON.stringify(requestBody), {
            headers: {
                "Content-Type": "application/json",
                ...buildAuthorizationHeader(encodedUcan),
            },
            timeout: "30s",
        });

        const responseTime = Date.now() - startTime;

        if (response.status !== 200 && response.status !== 201) {
            return {
                success: false,
                responseTime,
                error:
                    typeof response.body === "string"
                        ? response.body
                        : `HTTP ${String(response.status)}`,
            };
        }
        const result = Dto.castVoteResponse.parse(response.json());
        return {
            success: result.success,
            responseTime,
            error: result.success ? undefined : result.reason,
        };
    } catch (error) {
        return {
            success: false,
            responseTime: 0,
            error: String(error),
        };
    }
}

/**
 * Delete an opinion/comment
 * Uses the generated OpenAPI endpoint for cleanup
 */
export async function deleteOpinion(
    params: DeleteOpinionParams,
): Promise<DeleteOpinionResponse> {
    const { opinionSlugId, did, prefixedKey, backendDid } = params;

    const url = `${API_BASE_URL}/api/v1/opinion/delete`;
    const pathname = "/api/v1/opinion/delete";

    const requestBody = {
        opinionSlugId,
    };

    try {
        // Build UCAN token
        const encodedUcan = await buildUcan({
            did,
            prefixedKey,
            pathname,
            method: "POST",
            backendDid,
        });

        // Make request with UCAN in headers
        const startTime = Date.now();

        const response = http.post(url, JSON.stringify(requestBody), {
            headers: {
                "Content-Type": "application/json",
                ...buildAuthorizationHeader(encodedUcan),
            },
            timeout: "30s",
        });

        const responseTime = Date.now() - startTime;

        return {
            success: response.status === 200 || response.status === 204,
            responseTime,
            error:
                response.status >= 400 ? (response.body as string) : undefined,
        };
    } catch (error) {
        return {
            success: false,
            responseTime: 0,
            error: String(error),
        };
    }
}

/**
 * Delete user account
 * Uses the generated OpenAPI endpoint for complete cleanup
 */
export async function deleteUser(
    params: DeleteUserParams,
): Promise<DeleteUserResponse> {
    const { did, prefixedKey, backendDid } = params;

    const url = `${API_BASE_URL}/api/v1/user/delete`;
    const pathname = "/api/v1/user/delete";

    try {
        // Build UCAN token
        const encodedUcan = await buildUcan({
            did,
            prefixedKey,
            pathname,
            method: "POST",
            backendDid,
        });

        // Make request with UCAN in headers
        const startTime = Date.now();

        const response = http.post(url, "{}", {
            headers: {
                "Content-Type": "application/json",
                ...buildAuthorizationHeader(encodedUcan),
            },
            timeout: "30s",
        });

        const responseTime = Date.now() - startTime;

        return {
            success: response.status === 200 || response.status === 204,
            responseTime,
            error:
                response.status >= 400 ? (response.body as string) : undefined,
        };
    } catch (error) {
        return {
            success: false,
            responseTime: 0,
            error: String(error),
        };
    }
}

/**
 * Fetch the conversation HTML shell. k6/http does not execute the SPA's
 * JavaScript; API traffic is generated separately by the scenario.
 */
export function fetchConversationPage(
    params: FetchConversationPageParams,
): FetchConversationPageResponse {
    const { conversationSlugId } = params;

    const url = `${FRONTEND_BASE_URL}/conversation/${conversationSlugId}`;

    try {
        const startTime = Date.now();

        const response = http.get(url, {
            timeout: "30s",
        });

        const responseTime = Date.now() - startTime;

        return {
            success: response.status === 200,
            responseTime,
            error:
                response.status !== 200
                    ? `HTTP ${String(response.status)}`
                    : undefined,
        };
    } catch (error) {
        return {
            success: false,
            responseTime: 0,
            error: String(error),
        };
    }
}

/**
 * Fetch the home page HTML shell without executing the SPA's JavaScript.
 */
export function fetchMainPage(): FetchMainPageResponse {
    const url = FRONTEND_BASE_URL;

    try {
        const startTime = Date.now();

        const response = http.get(url, {
            timeout: "30s",
        });

        const responseTime = Date.now() - startTime;

        return {
            success: response.status === 200,
            responseTime,
            error:
                response.status !== 200
                    ? `HTTP ${String(response.status)}`
                    : undefined,
        };
    } catch (error) {
        return {
            success: false,
            responseTime: 0,
            error: String(error),
        };
    }
}
