/** **** WARNING: GENERATED FROM SHARED DIRECTORY, DO NOT MOFIFY THIS FILE DIRECTLY! **** **/
import { z } from "zod";
import {
    zodExtendedConversationData,
    zodCode,
    zodUserId,
    zodSlugId,
    zodOpinionItem,
    zodPollOptionTitle,
    zodConversationTitle,
    zodConversationBody,
    zodVotingOption,
    zodVotingAction,
    zodUsername,
    zodPollResponse,
    zodPhoneNumber,
    zodExtendedOpinionData,
    zodModerationReason,
    zodModerationExplanation,
    zodConversationModerationAction,
    zodOpinionModerationAction,
    zodConversationModerationProperties,
    zodOpinionModerationProperties,
    zodCommentFeedFilter,
    zodUserReportReason,
    zodUserReportExplanation,
    zodUserReportItem,
    zodUserMuteAction,
    zodUserMuteItem,
    zodNotificationItem,
    zodPolisKey,
    zodSupportedCountryCallingCode,
    zodOrganization,
    zodDeviceLoginStatus,
    zodTopicObject,
    zodFeedSortAlgorithm,
} from "./zod.js";
import { zodRarimoStatusAttributes } from "./zod.js";

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class Dto {
    static checkLoginStatusResponse = z
        .object({
            loggedInStatus: zodDeviceLoginStatus,
        })
        .strict();
    static authenticateRequestBody = z
        .object({
            phoneNumber: zodPhoneNumber,
            defaultCallingCode: zodSupportedCountryCallingCode,
            isRequestingNewCode: z.boolean(),
        })
        .strict();
    static verifyOtpReqBody = z.object({
        code: zodCode,
        phoneNumber: zodPhoneNumber,
        defaultCallingCode: zodSupportedCountryCallingCode,
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
                "invalid_phone_number",
                "restricted_phone_type",
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
    static fetchFeedRequest = z
        .object({
            sortAlgorithm: zodFeedSortAlgorithm,
        })
        .strict();
    static fetchFeedResponse = z.object({
        conversationDataList: z.array(zodExtendedConversationData),
        topConversationSlugIdList: z.array(zodSlugId), // used to determine if the feed is stale
    });
    static postFetchRequest = z
        .object({
            postSlugId: zodSlugId, // z.object() does not exist :(
        })
        .strict();
    static postFetch200 = z
        .object({
            post: zodExtendedConversationData, // z.object() does not exist :(
            comments: z.array(zodOpinionItem),
        })
        .strict();
    static fetchOpinionsRequest = z
        .object({
            conversationSlugId: zodSlugId, // z.object() does not exist :(
            filter: zodCommentFeedFilter,
            clusterKey: zodPolisKey.optional(),
        })
        .strict();
    static fetchOpinionsResponse = z.array(zodOpinionItem);
    static fetchHiddenOpinionsRequest = z
        .object({
            conversationSlugId: zodSlugId, // z.object() does not exist :(
            createdAt: z.string().datetime().optional(),
        })
        .strict();
    static fetchHiddenOpinionsResponse = z.array(zodOpinionItem);
    static createNewConversationRequest = z
        .object({
            conversationTitle: zodConversationTitle,
            conversationBody: zodConversationBody,
            postAsOrganization: z.string().optional(),
            indexConversationAt: z.string().datetime().optional(),
            isIndexed: z.boolean(),
            isLoginRequired: z.boolean(),
            pollingOptionList: zodPollOptionTitle.array().optional(),
        })
        .strict();
    static createNewConversationResponse = z
        .object({ conversationSlugId: z.string() })
        .strict();
    static getConversationRequest = z
        .object({
            conversationSlugId: zodSlugId,
        })
        .strict();
    static getConversationResponse = z
        .object({
            conversationData: zodExtendedConversationData,
        })
        .strict();
    static createOpinionRequest = z
        .object({
            conversationSlugId: z.string(),
            opinionBody: z.string(),
        })
        .strict();
    static createOpinionResponse = z.discriminatedUnion("success", [
        z
            .object({
                success: z.literal(true),
                opinionSlugId: z.string(),
            })
            .strict(),
        z
            .object({
                success: z.literal(false),
                reason: z.enum(["conversation_locked"]),
            })
            .strict(),
    ]);
    static pollRespondRequest = z
        .object({
            voteOptionChoice: z.number(),
            conversationSlugId: z.string(),
        })
        .strict();
    static getUserPollResponseByConversationsRequest = z.array(z.string());
    static getUserPollResponseByConversationsResponse =
        z.array(zodPollResponse);
    static getUserVotesByConversationsRequest = z
        .object({
            conversationSlugIdList: z.array(z.string()),
        })
        .strict();
    static getUserVotesByConversationsResponse = z.array(
        z
            .object({
                opinionSlugId: z.string(),
                votingAction: zodVotingOption,
            })
            .strict(),
    );
    static castVoteRequest = z
        .object({
            opinionSlugId: z.string(),
            chosenOption: zodVotingAction,
        })
        .strict();
    static castVoteResponse = z.boolean();
    static getUserProfileResponse = z
        .object({
            activePostCount: z.number().gte(0),
            createdAt: z.date(),
            username: zodUsername,
            isModerator: z.boolean(),
            organizationList: z.array(z.string()),
        })
        .strict();
    static fetchUserConversationsRequest = z
        .object({
            lastConversationSlugId: zodSlugId.optional(),
        })
        .strict();
    static fetchUserConversationsResponse = z.array(
        zodExtendedConversationData,
    );
    static fetchUserOpinionsRequest = z
        .object({
            lastOpinionSlugId: zodSlugId.optional(),
        })
        .strict();
    static fetchUserOpinionsResponse = z.array(zodExtendedOpinionData);
    static deleteConversationRequest = z
        .object({
            conversationSlugId: zodSlugId,
        })
        .strict();
    static deleteOpinionRequest = z
        .object({
            opinionSlugId: zodSlugId,
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
    static updateUsernameRequest = z
        .object({
            username: zodUsername,
        })
        .strict();

    static muteUserByUsernameRequest = z
        .object({
            targetUsername: z.string(),
            action: zodUserMuteAction,
        })
        .strict();
    static getMutedUsersResponse = z.array(zodUserMuteItem);

    static moderateReportPostRequest = z
        .object({
            conversationSlugId: zodSlugId,
            moderationReason: zodModerationReason,
            moderationAction: zodConversationModerationAction,
            moderationExplanation: zodModerationExplanation,
        })
        .strict();
    static moderateReportCommentRequest = z
        .object({
            opinionSlugId: zodSlugId,
            moderationReason: zodModerationReason,
            moderationAction: zodOpinionModerationAction,
            moderationExplanation: zodModerationExplanation,
        })
        .strict();
    static moderateCancelConversationReportRequest = z
        .object({
            conversationSlugId: zodSlugId,
        })
        .strict();
    static moderateCancelOpinionReportRequest = z
        .object({
            opinionSlugId: zodSlugId,
        })
        .strict();
    static getConversationModerationStatusRequest = z.object({
        conversationSlugId: zodSlugId,
    });
    static getConversationModerationStatusResponse =
        zodConversationModerationProperties;
    static getOpinionBySlugIdListRequest = z
        .object({
            opinionSlugIdList: z.array(zodSlugId),
        })
        .strict();
    static getOpinionBySlugIdListResponse = z.array(zodOpinionItem);
    static getOpinionModerationStatusRequest = z
        .object({
            opinionSlugId: zodSlugId,
        })
        .strict();
    static getOpinionModerationStatusResponse = zodOpinionModerationProperties;
    static createConversationReportRequest = z
        .object({
            conversationSlugId: zodSlugId,
            reportReason: zodUserReportReason,
            reportExplanation: zodUserReportExplanation,
        })
        .strict();
    static createOpinionReportRequest = z
        .object({
            opinionSlugId: zodSlugId,
            reportReason: zodUserReportReason,
            reportExplanation: zodUserReportExplanation,
        })
        .strict();
    static fetchConversationReportsRequest = z
        .object({
            conversationSlugId: zodSlugId,
        })
        .strict();
    static fetchConversationReportsResponse = z.array(zodUserReportItem);
    static fetchOpinionReportsRequest = z
        .object({
            opinionSlugId: zodSlugId,
        })
        .strict();
    static fetchOpinionReportsResponse = z.array(zodUserReportItem);
    static checkUsernameInUseRequest = z
        .object({
            username: zodUsername,
        })
        .strict();
    static checkUsernameInUseResponse = z.boolean();
    static isUsernameInUseResponse = z.boolean();
    static generateUnusedRandomUsernameResponse = z.string();
    static fetchNotificationsRequest = z
        .object({
            lastSlugId: zodSlugId.optional(),
        })
        .strict();
    static fetchNotificationsResponse = z
        .object({
            numNewNotifications: z.number(),
            notificationList: z.array(zodNotificationItem),
        })
        .strict();
    static createOrganizationRequest = z
        .object({
            organizationName: z.string(),
            imagePath: z.string(),
            isFullImagePath: z.boolean(),
            websiteUrl: z.string().url(),
            description: z.string(),
        })
        .strict();
    static deleteOrganizationRequest = z
        .object({
            organizationName: z.string(),
        })
        .strict();
    static getOrganizationNamesByUsernameRequest = z
        .object({
            username: zodUsername,
        })
        .strict();
    static getOrganizationNamesByUsernameResponse = z
        .object({
            organizationNameList: z.array(z.string()),
        })
        .strict();
    static getAllOrganizationsResponse = z
        .object({
            organizationList: z.array(zodOrganization),
        })
        .strict();
    static addUserOrganizationMappingRequest = z
        .object({
            username: zodUsername,
            organizationName: z.string(),
        })
        .strict();
    static removeUserOrganizationMappingRequest = z
        .object({
            username: zodUsername,
            organizationName: z.string(),
        })
        .strict();
    static getAllTopicsResponse = z
        .object({
            topicList: z.array(zodTopicObject),
        })
        .strict();
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
export type PostFetch200 = z.infer<typeof Dto.postFetch200>;
export type CreateNewConversationRequest = z.infer<
    typeof Dto.createNewConversationRequest
>;
export type CreateNewConversationResponse = z.infer<
    typeof Dto.createNewConversationResponse
>;
export type GetConversationResponse = z.infer<
    typeof Dto.getConversationResponse
>;
export type CreateCommentResponse = z.infer<typeof Dto.createOpinionResponse>;
export type GetUserPollResponseByConversations200 = z.infer<
    typeof Dto.getUserPollResponseByConversationsResponse
>;
export type FetchUserVotesForPostSlugIdsResponse = z.infer<
    typeof Dto.getUserVotesByConversationsResponse
>;
export type FetchCommentFeedResponse = z.infer<
    typeof Dto.fetchOpinionsResponse
>;
export type FetchFeedResponse = z.infer<typeof Dto.fetchFeedResponse>;
export type GetUserProfileResponse = z.infer<typeof Dto.getUserProfileResponse>;
export type getUserConversationsResponse = z.infer<
    typeof Dto.fetchUserConversationsResponse
>;
export type GenerateVerificationLink200 = z.infer<
    typeof Dto.generateVerificationLink200
>;
export type VerifyUserStatusAndAuthenticate200 = z.infer<
    typeof Dto.verifyUserStatusAndAuthenticate200
>;
export type FetchUserReportsByPostSlugIdResponse = z.infer<
    typeof Dto.fetchConversationReportsResponse
>;
export type FetchUserReportsByCommentSlugIdResponse = z.infer<
    typeof Dto.fetchOpinionReportsResponse
>;
export type GetMutedUsersResponse = z.infer<typeof Dto.getMutedUsersResponse>;
export type GetOpinionBySlugIdListRequest = z.infer<
    typeof Dto.getOpinionBySlugIdListRequest
>;
export type GetOpinionBySlugIdListResponse = z.infer<
    typeof Dto.getOpinionBySlugIdListResponse
>;
export type FetchNotificationsResponse = z.infer<
    typeof Dto.fetchNotificationsResponse
>;
export type GetOrganizationNamesByUsernameResponse = z.infer<
    typeof Dto.getOrganizationNamesByUsernameResponse
>;
export type GetAllOrganizationsResponse = z.infer<
    typeof Dto.getAllOrganizationsResponse
>;
export type GetAllTopicsResponse = z.infer<typeof Dto.getAllTopicsResponse>;
