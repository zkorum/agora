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
    zodModerationReason,
    zodModerationExplanation,
    zodModerationActionPosts,
    zodModerationActionComments,
    zodModerationPropertiesPosts,
    zodModerationPropertiesComments,
    zodCommentFeedFilter,
    zodUserReportReason,
    zodUserReportExplanation,
    zodUserReportItem,
    zodUserMuteAction,
    zodUserMuteItem,
} from "./zod.js";
import { zodRarimoStatusAttributes } from "./zod.js";

export class Dto {
    static checkLoginStatusResponse = z
        .object({ isLoggedIn: z.boolean() })
        .strict();
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
    static authenticate200 = z.discriminatedUnion("success", [
        z
            .object({
                success: z.literal(true),
                codeExpiry: z.date(),
                nextCodeSoonestTime: z.date(),
            })
            .strict(),
        z.object({
            success: z.literal(false),
            reason: z.enum([
                "already_logged_in",
                "associated_with_another_user",
                "throttled",
            ]),
        }),
    ]);
    static verifyOtp200 = z.discriminatedUnion("success", [
        z
            .object({
                success: z.literal(true),
            })
            .strict(),
        z
            .object({
                success: z.literal(false),
                reason: z.enum([
                    "expired_code",
                    "wrong_guess",
                    "too_many_wrong_guess",
                    "already_logged_in",
                    "associated_with_another_user",
                ]),
            })
            .strict(),
    ]);
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
            filter: zodCommentFeedFilter,
            isAuthenticatedRequest: z.boolean(),
        })
        .strict();
    static fetchCommentFeedResponse = z.array(zodCommentItem);
    static fetchHiddenCommentRequest = z
        .object({
            postSlugId: zodSlugId, // z.object() does not exist :(
            createdAt: z.string().datetime().optional(),
        })
        .strict();
    static fetchHiddenCommentResponse = z.array(zodCommentItem);
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
    static createCommentResponse = z.discriminatedUnion("success", [
        z
            .object({
                success: z.literal(true),
                commentSlugId: z.string(),
            })
            .strict(),
        z
            .object({
                success: z.literal(false),
                reason: z.enum(["post_locked"]),
            })
            .strict(),
    ]);
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
    static castVoteForCommentResponse = z.boolean();
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
    static generateVerificationLink200 = z.discriminatedUnion("success", [
        z
            .object({
                success: z.literal(true),
                verificationLink: z.string().url(),
            })
            .strict(),
        z.object({
            success: z.literal(false),
            reason: z.enum([
                "already_logged_in",
                "associated_with_another_user",
            ]),
        }),
    ]);
    static submitUsernameChangeRequest = z
        .object({
            username: zodUsername,
        })
        .strict();

    static muteUserByUsernameRequest = z
        .object({
            targetUsername: zodUsername,
            action: zodUserMuteAction,
        })
        .strict();
    static fetchUserMutePreferencesResponse = z.array(zodUserMuteItem);

    static moderateReportPostRequest = z
        .object({
            postSlugId: zodSlugId,
            moderationReason: zodModerationReason,
            moderationAction: zodModerationActionPosts,
            moderationExplanation: zodModerationExplanation,
        })
        .strict();
    static moderateReportCommentRequest = z
        .object({
            commentSlugId: zodSlugId,
            moderationReason: zodModerationReason,
            moderationAction: zodModerationActionComments,
            moderationExplanation: zodModerationExplanation,
        })
        .strict();
    static moderateCancelPostReportRequest = z
        .object({
            postSlugId: zodSlugId,
        })
        .strict();
    static moderateCancelCommentReportRequest = z
        .object({
            commentSlugId: zodSlugId,
        })
        .strict();
    static fetchPostModerationRequest = z.object({
        postSlugId: zodSlugId,
    });
    static fetchPostModerationResponse = zodModerationPropertiesPosts;
    static fetchCommentModerationRequest = z.object({
        commentSlugId: zodSlugId,
    });
    static fetchCommentModerationResponse = zodModerationPropertiesComments;
    static submitUserReportByPostSlugIdRequest = z.object({
        postSlugId: zodSlugId,
        reportReason: zodUserReportReason,
        reportExplanation: zodUserReportExplanation,
    });
    static submitUserReportByCommentSlugIdRequest = z.object({
        commentSlugId: zodSlugId,
        reportReason: zodUserReportReason,
        reportExplanation: zodUserReportExplanation,
    });
    static fetchUserReportsByPostSlugIdRequest = z.object({
        postSlugId: zodSlugId,
    });
    static fetchUserReportsByPostSlugIdResponse = z.array(zodUserReportItem);
    static fetchUserReportsByCommentSlugIdRequest = z.object({
        commentSlugId: zodSlugId,
    });
    static fetchUserReportsByCommentSlugIdResponse = z.array(zodUserReportItem);
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
    static verifyUserStatusAndAuthenticate200 = z.discriminatedUnion(
        "success",
        [
            z
                .object({
                    success: z.literal(true),
                    rarimoStatus: zodRarimoStatusAttributes,
                })
                .strict(),
            z.object({
                success: z.literal(false),
                reason: z.enum([
                    "already_logged_in",
                    "associated_with_another_user",
                ]),
            }),
        ],
    );
}

export type AuthenticateRequestBody = z.infer<
    typeof Dto.authenticateRequestBody
>;
export type AuthenticateResponse = z.infer<typeof Dto.authenticate200>;
export type VerifyOtp200 = z.infer<typeof Dto.verifyOtp200>;
export type VerifyOtpReqBody = z.infer<typeof Dto.verifyOtpReqBody>;
export type IsLoggedInResponse = z.infer<typeof Dto.isLoggedInResponse>;
export type GetDeviceStatusResp = z.infer<typeof Dto.getDeviceStatusResp>;
export type PostFetch200 = z.infer<typeof Dto.postFetch200>;
export type CreateNewPostRequest = z.infer<typeof Dto.createNewPostRequest>;
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
export type GenerateVerificationLink200 = z.infer<
    typeof Dto.generateVerificationLink200
>;
export type VerifyUserStatusAndAuthenticate200 = z.infer<
    typeof Dto.verifyUserStatusAndAuthenticate200
>;
export type FetchUserReportsByPostSlugIdResponse = z.infer<
    typeof Dto.fetchUserReportsByPostSlugIdResponse
>;
export type FetchUserReportsByCommentSlugIdResponse = z.infer<
    typeof Dto.fetchUserReportsByCommentSlugIdResponse
>;
export type MuteUserRequest = z.infer<
    typeof Dto.fetchUserMutePreferencesResponse
>;
export type FetchUserMutePreferencesResponse = z.infer<
    typeof Dto.fetchUserMutePreferencesResponse
>;
