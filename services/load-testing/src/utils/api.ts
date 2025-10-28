/**
 * API utilities for interacting with Agora backend
 * Uses the generated OpenAPI client from services/load-testing/src/api
 * Pattern follows services/agora/src/utils/api/vote.ts and comment/comment.ts
 */

import http from "k6/http";
import { buildUcan, buildAuthorizationHeader } from "../crypto/ucan/operation.js";

// API base URL from environment or default to local dev server
const API_BASE_URL = __ENV.API_BASE_URL || "http://127.0.0.1:8084";

// Frontend base URL for simulating full page loads
const FRONTEND_BASE_URL = __ENV.FRONTEND_BASE_URL || "http://127.0.0.1:9000";

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

export interface FetchOpinionsResponse {
    success: boolean;
    opinions: { opinionSlugId: string }[];
    responseTime: number;
    error?: string;
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

/**
 * Fetch all opinions in a conversation (public/unauthenticated endpoint)
 * Uses the fetch-by-conversation endpoint with "new" filter to get all opinions
 */
export async function fetchOpinions(
    params: FetchOpinionsParams,
): Promise<FetchOpinionsResponse> {
    const { conversationSlugId } = params;

    const url = `${API_BASE_URL}/api/v1/opinion/fetch-by-conversation`;

    const requestBody = {
        conversationSlugId,
        filter: "new", // Fetch all opinions using the "new" filter
    };

    try {
        // Make unauthenticated request (no authorization header)
        const startTime = Date.now();

        const response = http.post(url, JSON.stringify(requestBody), {
            headers: {
                "Content-Type": "application/json",
                // No authorization header - this is a public endpoint
            },
            timeout: "30s",
        });

        const responseTime = Date.now() - startTime;

        if (response.status === 200) {
            const responseData = JSON.parse(response.body as string) as Array<{
                opinionSlugId: string;
            }>;
            return {
                success: true,
                opinions: responseData.map((item) => ({
                    opinionSlugId: item.opinionSlugId,
                })),
                responseTime,
            };
        } else {
            return {
                success: false,
                opinions: [],
                responseTime,
                error: `HTTP ${response.status}: ${response.body}`,
            };
        }
    } catch (error) {
        return {
            success: false,
            opinions: [],
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
    const { conversationSlugId, opinionText, did, prefixedKey, backendDid } = params;

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
                reason: `HTTP ${response.status}: ${response.body}`,
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
    const { commentSlugId, votingAction, did, prefixedKey, backendDid } = params;

    const url = `${API_BASE_URL}/api/v1/vote/cast`;
    const pathname = "/api/v1/vote/cast";

    const requestBody = {
        opinionSlugId: commentSlugId,
        chosenOption: votingAction,
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
            success: response.status === 200 || response.status === 201,
            responseTime,
            error:
                response.status >= 400
                    ? (response.body as string)
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
                response.status >= 400
                    ? (response.body as string)
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
                response.status >= 400
                    ? (response.body as string)
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
 * Fetch conversation page (simulates loading the entire frontend conversation page)
 * This triggers the frontend to make multiple API calls:
 * - Fetch conversation metadata
 * - Fetch all opinions
 * - Fetch clusters/analysis
 * - Fetch user interactions (if authenticated)
 * All of these hit the read replica and cause CPU load
 */
export async function fetchConversationPage(
    params: FetchConversationPageParams,
): Promise<FetchConversationPageResponse> {
    const { conversationSlugId } = params;

    const url = `${FRONTEND_BASE_URL}/c/${conversationSlugId}`;

    try {
        const startTime = Date.now();

        const response = http.get(url, {
            timeout: "30s",
        });

        const responseTime = Date.now() - startTime;

        return {
            success: response.status === 200,
            responseTime,
            error: response.status >= 400 ? `HTTP ${response.status}` : undefined,
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
 * Fetch main page feed (simulates loading the entire frontend home page)
 * This triggers the frontend to make multiple API calls:
 * - Fetch recent conversations
 * - Fetch trending/top conversations
 * - Fetch user data (if authenticated)
 * All of these hit the read replica
 */
export async function fetchMainPage(): Promise<FetchMainPageResponse> {
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
            error: response.status >= 400 ? `HTTP ${response.status}` : undefined,
        };
    } catch (error) {
        return {
            success: false,
            responseTime: 0,
            error: String(error),
        };
    }
}
