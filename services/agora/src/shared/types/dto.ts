/** **** WARNING: GENERATED FROM SHARED DIRECTORY, DO NOT MOFIFY THIS FILE DIRECTLY! **** **/
/* eslint-disable @typescript-eslint/no-extraneous-class */
import { z } from "zod";
import {
    zodExtendedPostData,
    zodCode,
    zodUserId,
    zodSlugId,
    zodCommentItem,
    zodPollOptionTitle,
    zodPostTitle,
    zodPostBody,
    zodVotingOption,
    zodVotingAction,
    zodUsername,
    zodPollResponse,
    zodPhoneNumber,
    zodExtendedCommentData,
    zodModerationAction,
    zodModerationReason,
    zodModerationExplanation,
    zodModerationProperties,
} from "./zod.js";
import { zodRarimoStatusAttributes } from "./zod.js";

export class Dto {
    static authenticateCheckLoginStatus = z.object({}).strict();
    static authenticateRequestBody = z
        .object({
            phoneNumber: zodPhoneNumber,
            defaultCallingCode: z.string(),
            isRequestingNewCode: z.boolean(),
        })
        .strict();
    static verifyOtpReqBody = z.object({
        code: zodCode,
    });
    static authenticateResponse = z
        .object({
            codeExpiry: z.date(),
            nextCodeSoonestTime: z.date(),
        })
        .strict();
    static verifyOtp200 = z.discriminatedUnion("success", [
        z
            .object({
                success: z.literal(true),
                userId: zodUserId,
                sessionExpiry: z.date(),
            })
            .strict(),
        z
            .object({
                success: z.literal(false),
                reason: z.enum([
                    "expired_code",
                    "wrong_guess",
                    "too_many_wrong_guess",
                ]),
            })
            .strict(),
    ]);
    // !WARNING: when changing 409s - also change expected type in the frontend and backend services manually!
    static auth409 = z.discriminatedUnion("reason", [
        z
            .object({
                reason: z.literal("already_logged_in"),
                userId: zodUserId,
                sessionExpiry: z.date(),
            })
            .strict(),
        z
            .object({
                reason: z.literal("associated_with_another_user"),
            })
            .strict(),
    ]);
    // !WARNING: when changing 409s - also change expected type in the frontend and backend services manually!
    static alreadyLoggedIn409 = z
        .object({
            reason: z.literal("already_logged_in"),
            userId: zodUserId,
            sessionExpiry: z.date(),
        })
        .strict();
    static isLoggedInResponse = z.discriminatedUnion("isLoggedIn", [
        z.object({ isLoggedIn: z.literal(true), userId: zodUserId }).strict(),
        z
            .object({
                isLoggedIn: z.literal(false),
            })
            .strict(),
    ]);
    static getDeviceStatusResp = z
        .object({
            userId: zodUserId,
            isLoggedIn: z.boolean(),
            sessionExpiry: z.date(),
        })
        .strict()
        .optional();
    static fetchFeedRequest = z
        .object({
            showHidden: z.boolean(),
            lastSlugId: z.string().optional(),
            isAuthenticatedRequest: z.boolean(),
        })
        .strict();
    static fetchFeedResponse = z.object({
        postDataList: z.array(zodExtendedPostData),
        reachedEndOfFeed: z.boolean(),
    });
    static postFetchRequest = z
        .object({
            postSlugId: zodSlugId, // z.object() does not exist :(
        })
        .strict();
    static postFetch200 = z
        .object({
            post: zodExtendedPostData, // z.object() does not exist :(
            comments: z.array(zodCommentItem),
        })
        .strict();
    static fetchCommentFeedRequest = z
        .object({
            postSlugId: zodSlugId, // z.object() does not exist :(
            createdAt: z.string().datetime().optional(),
            showModeratedComments: z.boolean(),
        })
        .strict();
    static fetchCommentFeedResponse = z.array(zodCommentItem);
    static createNewPostRequest = z
        .object({
            postTitle: zodPostTitle,
            postBody: zodPostBody,
            pollingOptionList: zodPollOptionTitle.array().optional(),
        })
        .strict();
    static createNewPostResponse = z
        .object({ postSlugId: z.string() })
        .strict();
    static fetchPostBySlugIdRequest = z
        .object({
            postSlugId: zodSlugId,
            isAuthenticatedRequest: z.boolean(),
        })
        .strict();
    static fetchPostBySlugIdResponse = z
        .object({
            postData: zodExtendedPostData,
        })
        .strict();
    static createCommentRequest = z
        .object({
            postSlugId: z.string(),
            commentBody: z.string(),
        })
        .strict();
    static createCommentResponse = z
        .object({ commentSlugId: z.string() })
        .strict();
    static submitPollResponseRequest = z
        .object({
            voteOptionChoice: z.number(),
            postSlugId: z.string(),
        })
        .strict();
    static fetchUserPollResponseRequest = z.array(z.string());
    static fetchUserPollResponseResponse = z.array(zodPollResponse);
    static fetchUserVotesForPostSlugIdRequest = z
        .object({
            postSlugIdList: z.array(z.string()),
        })
        .strict();
    static fetchUserVotesForPostSlugIdsResponse = z.array(
        z
            .object({
                commentSlugId: z.string(),
                votingAction: zodVotingOption,
            })
            .strict(),
    );
    static castVoteForCommentRequest = z
        .object({
            commentSlugId: z.string(),
            chosenOption: zodVotingAction,
        })
        .strict();
    static fetchUserProfileResponse = z
        .object({
            activePostCount: z.number().gte(0),
            createdAt: z.date(),
            username: zodUsername,
            isModerator: z.boolean(),
        })
        .strict();
    static fetchUserPostsRequest = z
        .object({
            lastPostSlugId: zodSlugId.optional(),
        })
        .strict();
    static fetchUserPostsResponse = z.array(zodExtendedPostData);
    static fetchUserCommentsRequest = z
        .object({
            lastCommentSlugId: zodSlugId.optional(),
        })
        .strict();
    static fetchUserCommentsResponse = z.array(zodExtendedCommentData);
    static deletePostBySlugIdRequest = z
        .object({
            postSlugId: zodSlugId,
        })
        .strict();
    static deleteCommentBySlugIdRequest = z
        .object({
            commentSlugId: zodSlugId,
        })
        .strict();
    static generateVerificationLink200 = z.object({
        verificationLink: z.string().url(),
    });
    static submitUsernameChangeRequest = z
        .object({
            username: zodUsername,
        })
        .strict();
    static moderateReportPostRequest = z
        .object({
            postSlugId: zodSlugId,
            moderationReason: zodModerationReason,
            moderationAction: zodModerationAction,
            moderationExplanation: zodModerationExplanation,
        })
        .strict();
    static moderateReportCommentRequest = z
        .object({
            commentSlugId: zodSlugId,
            moderationReason: zodModerationReason,
            moderationAction: zodModerationAction,
            moderationExplanation: zodModerationExplanation,
        })
        .strict();
    static fetchPostModerationRequest = z.object({
        postSlugId: zodSlugId,
    });
    static fetchPostModerationResponse = zodModerationProperties;
    static fetchCommentModerationRequest = z.object({
        commentSlugId: zodSlugId,
    });
    static fetchCommentModerationResponse = zodModerationProperties;
    static checkUsernameInUseRequest = z
        .object({
            username: zodUsername,
        })
        .strict();
    static checkUsernameInUseResponse = z.boolean();
    static isUsernameInUseResponse = z.boolean();
    static generateUnusedRandomUsernameResponse = z.string();
    // this generates enum with openapigenerator without the verified state...
    // static verifyUserStatusAndAuthenticate200 = z.discriminatedUnion(
    //     "rarimoStatus",
    //     [
    //         z
    //             .object({
    //                 rarimoStatus: z.literal("verified"),
    //                 nullifier: z.string(),
    //             })
    //             .strict(),
    //         z
    //             .object({
    //                 rarimoStatus: zodRarimoStatusAttributes.exclude([
    //                     "verified",
    //                 ]),
    //             })
    //             .strict(),
    //     ],
    // );
    static verifyUserStatusAndAuthenticate200 = z
        .object({
            rarimoStatus: zodRarimoStatusAttributes,
        })
        .strict();
}

export type AuthenticateRequestBody = z.infer<
    typeof Dto.authenticateRequestBody
>;
export type VerifyOtp200 = z.infer<typeof Dto.verifyOtp200>;
export type VerifyOtpReqBody = z.infer<typeof Dto.verifyOtpReqBody>;
export type Auth409 = z.infer<typeof Dto.auth409>;
export type AlreadyLoggedIn409 = z.infer<typeof Dto.alreadyLoggedIn409>;
export type IsLoggedInResponse = z.infer<typeof Dto.isLoggedInResponse>;
export type GetDeviceStatusResp = z.infer<typeof Dto.getDeviceStatusResp>;
export type PostFetch200 = z.infer<typeof Dto.postFetch200>;
export type CreateNewPostResponse = z.infer<typeof Dto.createNewPostResponse>;
export type FetchPostBySlugIdResponse = z.infer<
    typeof Dto.fetchPostBySlugIdResponse
>;
export type CreateCommentResponse = z.infer<typeof Dto.createCommentResponse>;
export type FetchUserPollResponseResponse = z.infer<
    typeof Dto.fetchUserPollResponseResponse
>;
export type FetchUserVotesForPostSlugIdsResponse = z.infer<
    typeof Dto.fetchUserVotesForPostSlugIdsResponse
>;
export type FetchCommentFeedResponse = z.infer<
    typeof Dto.fetchCommentFeedResponse
>;
export type FetchFeedResponse = z.infer<typeof Dto.fetchFeedResponse>;
export type FetchUserProfileResponse = z.infer<
    typeof Dto.fetchUserProfileResponse
>;
export type FetchUserPostsResponse = z.infer<typeof Dto.fetchUserPostsResponse>;
export type VerifyUserStatusAndAuthenticate200 = z.infer<
    typeof Dto.verifyUserStatusAndAuthenticate200
>;
