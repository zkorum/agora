import { z } from "zod";
import {
    zodExtendedConversationData,
    zodCode,
    zodUserId,
    zodSlugId,
    zodOpinionItem,
    zodAnalysisOpinionItem,
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
    zodLinkType,
    zodPolisUrl,
    zodLanguagePreferences,
    zodPolisClusters,
    zodEventSlug,
    zodExportStatus,
    zodExportFileInfo,
    zodDateTimeFlexible,
} from "./zod.js";
import { zodPolisVoteRecord } from "./polis.js";
import {
    ZodSupportedSpokenLanguageCodes,
    ZodSupportedDisplayLanguageCodes,
} from "../languages.js";

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
                accountMerged: z.boolean(), // true when guest merged into verified, false otherwise
                userId: z.string(), // User ID (for tracking account merges in frontend)
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
                    "auth_state_changed", // Added: auth type changed during OTP flow
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
    static fetchAnalysisRequest = z
        .object({
            conversationSlugId: zodSlugId, // z.object() does not exist :(
        })
        .strict();
    static fetchAnalysisResponse = z
        .object({
            polisContentId: z.number().int().nonnegative().optional(), // for logging/debugging purpose, undefined if no polis calculated
            consensus: z.array(zodAnalysisOpinionItem),
            controversial: z.array(zodAnalysisOpinionItem),
            clusters: zodPolisClusters,
        })
        .strict();
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
            seedOpinionList: z.array(z.string()),
            requiresEventTicket: zodEventSlug.optional(),
        })
        .strict();
    static createNewConversationResponse = z
        .object({ conversationSlugId: z.string() })
        .strict();
    static importConversationRequest = z
        .object({
            polisUrl: zodPolisUrl,
            postAsOrganization: z.string().optional(),
            indexConversationAt: z.string().datetime().optional(),
            isIndexed: z.boolean(),
            isLoginRequired: z.boolean(),
            requiresEventTicket: zodEventSlug.optional(),
        })
        .strict();
    static importConversationResponse = z
        .object({
            conversationSlugId: z.string(),
        })
        .strict();
    static importCsvConversationRequest = z
        .object({
            postAsOrganization: z.string().optional(),
            indexConversationAt: z.string().datetime().optional(),
            isIndexed: z.boolean(),
            isLoginRequired: z.boolean(),
        })
        .strict();
    static importCsvConversationFormRequest = z
        .object({
            postAsOrganization: z.preprocess(
                (val) => (val === "" || val === undefined ? undefined : val),
                z.string().optional(),
            ),
            indexConversationAt: z.preprocess(
                (val) => (val === "" || val === undefined ? undefined : val),
                z.string().datetime().optional(),
            ),
            isIndexed: z.preprocess(
                (val) => val === "true" || val === true,
                z.boolean(),
            ),
            isLoginRequired: z.preprocess(
                (val) => val === "true" || val === true,
                z.boolean(),
            ),
            requiresEventTicket: z.preprocess(
                (val) => (val === "" || val === undefined ? undefined : val),
                zodEventSlug.optional(),
            ),
        })
        .strict();
    static importCsvConversationResponse = z
        .object({
            importSlugId: z.string(),
        })
        .strict();
    static getActiveImportResponse = z.discriminatedUnion("hasActiveImport", [
        z
            .object({
                hasActiveImport: z.literal(true),
                importSlugId: zodSlugId,
                createdAt: zodDateTimeFlexible,
            })
            .strict(),
        z
            .object({
                hasActiveImport: z.literal(false),
            })
            .strict(),
    ]);
    static getActiveExportResponse = z.discriminatedUnion("hasActiveExport", [
        z
            .object({
                hasActiveExport: z.literal(true),
                exportSlugId: zodSlugId,
                createdAt: zodDateTimeFlexible,
            })
            .strict(),
        z
            .object({
                hasActiveExport: z.literal(false),
            })
            .strict(),
    ]);
    static getConversationImportStatusRequest = z
        .object({
            importSlugId: zodSlugId,
        })
        .strict();
    static getConversationImportStatusResponse = z.discriminatedUnion(
        "status",
        [
            // Processing - no conversation yet
            z
                .object({
                    status: z.literal("processing"),
                    importSlugId: zodSlugId,
                    createdAt: zodDateTimeFlexible,
                    updatedAt: zodDateTimeFlexible,
                })
                .strict(),
            // Completed - has conversationSlugId
            z
                .object({
                    status: z.literal("completed"),
                    importSlugId: zodSlugId,
                    conversationSlugId: zodSlugId,
                    createdAt: zodDateTimeFlexible,
                    updatedAt: zodDateTimeFlexible,
                })
                .strict(),
            // Failed - has error message
            z
                .object({
                    status: z.literal("failed"),
                    importSlugId: zodSlugId,
                    errorMessage: z.string().optional(),
                    createdAt: zodDateTimeFlexible,
                    updatedAt: zodDateTimeFlexible,
                })
                .strict(),
        ],
    );
    static validateCsvRequest = z.object({}).strict();
    static validateCsvResponse = z
        .object({
            summaryFile: z
                .object({
                    isValid: z.boolean(),
                    error: z.string().optional(),
                })
                .optional(),
            commentsFile: z
                .object({
                    isValid: z.boolean(),
                    error: z.string().optional(),
                })
                .optional(),
            votesFile: z
                .object({
                    isValid: z.boolean(),
                    error: z.string().optional(),
                })
                .optional(),
        })
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
                reason: z.enum([
                    "conversation_locked",
                    "event_ticket_required",
                ]),
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
    static castVoteResponse = z.discriminatedUnion("success", [
        z
            .object({
                success: z.literal(true),
            })
            .strict(),
        z
            .object({
                success: z.literal(false),
                reason: z.enum(["event_ticket_required"]),
            })
            .strict(),
    ]);
    static getUserProfileResponse = z
        .object({
            activePostCount: z.number().gte(0),
            createdAt: z.date(),
            username: zodUsername,
            isModerator: z.boolean(),
            organizationList: z.array(zodOrganization),
            verifiedEventTickets: z.array(zodEventSlug), // User's verified event tickets (always returned by backend)
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
    static generateVerificationLinkRequest = z.object({
        linkType: zodLinkType,
    });
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
    static notificationStreamQuerystring = z
        .object({
            auth: z.string(),
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
    static getOrganizationsByUsernameRequest = z
        .object({
            username: zodUsername,
        })
        .strict();
    static getOrganizationsByUsernameResponse = z
        .object({
            organizationList: z.array(zodOrganization),
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
    static getUserFollowedTopicCodesResponse = z
        .object({
            followedTopicCodeList: z.array(z.string()),
        })
        .strict();
    static userFollowTopicCodeRequest = z
        .object({
            topicCode: z.string(),
        })
        .strict();
    static userUnfollowTopicCodeRequest = z
        .object({
            topicCode: z.string(),
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
    static verifyUserStatusAndAuthenticate200 = z.union([
        // Success case: verified - includes userId and accountMerged
        z
            .object({
                success: z.literal(true),
                rarimoStatus: z.literal("verified"),
                accountMerged: z.boolean(), // true when guest merged into verified, false otherwise
                userId: z.string(), // User ID (for tracking account merges in frontend)
            })
            .strict(),
        // Success case: not verified - no userId or accountMerged needed
        z
            .object({
                success: z.literal(true),
                rarimoStatus: z.enum([
                    "not_verified",
                    "failed_verification",
                    "uniqueness_check_failed",
                ]),
            })
            .strict(),
        // Failure cases
        z.object({
            success: z.literal(false),
            reason: z.enum([
                "already_logged_in",
                "associated_with_another_user",
            ]),
        }),
    ]);

    // Zupass event ticket verification
    static verifyEventTicketRequest = z
        .object({
            proof: z.unknown(), // GPC proof data - validated by @pcd/gpc library at runtime
            eventSlug: zodEventSlug, // Which event to verify for
        })
        .strict();
    static verifyEventTicket200 = z.discriminatedUnion("success", [
        z
            .object({
                success: z.literal(true),
                accountMerged: z.boolean(), // true when guest merged into verified, false otherwise
                userId: z.string(), // User ID (for tracking account merges in frontend)
            })
            .strict(),
        z.object({
            success: z.literal(false),
            reason: z.enum([
                "deserialization_error",
                "invalid_proof",
                "invalid_signer",
                "wrong_event",
                "ticket_already_used",
            ]),
        }),
    ]);

    static zodGetMathRequest = z.object({
        conversation_slug_id: z.string(),
        conversation_id: z.number(),
        votes: z.array(zodPolisVoteRecord),
    });

    // Language preferences
    static getLanguagePreferencesRequest = z
        .object({
            currentDisplayLanguage: ZodSupportedDisplayLanguageCodes,
        })
        .strict();

    static getLanguagePreferencesResponse = zodLanguagePreferences;

    static updateLanguagePreferencesRequest = z
        .object({
            spokenLanguages: z
                .array(ZodSupportedSpokenLanguageCodes)
                .min(1)
                .optional(),
            displayLanguage: ZodSupportedDisplayLanguageCodes.optional(),
        })
        .strict();

    // Conversation export
    static requestConversationExportRequest = z
        .object({
            conversationSlugId: zodSlugId,
        })
        .strict();
    static requestConversationExportResponse = z.discriminatedUnion("status", [
        z
            .object({
                status: z.literal("queued"),
                exportSlugId: zodSlugId,
            })
            .strict(),
        z
            .object({
                status: z.literal("cooldown_active"),
                cooldownEndsAt: zodDateTimeFlexible,
            })
            .strict(),
    ]);
    static getConversationExportStatusRequest = z
        .object({
            exportSlugId: zodSlugId,
        })
        .strict();
    static getConversationExportStatusResponse = z.discriminatedUnion(
        "status",
        [
            // Processing - no files yet
            z
                .object({
                    status: z.literal("processing"),
                    exportSlugId: zodSlugId,
                    conversationSlugId: zodSlugId,
                    createdAt: zodDateTimeFlexible,
                    expiresAt: zodDateTimeFlexible,
                })
                .strict(),
            // Completed - always has files
            z
                .object({
                    status: z.literal("completed"),
                    exportSlugId: zodSlugId,
                    conversationSlugId: zodSlugId,
                    files: z.array(zodExportFileInfo),
                    createdAt: zodDateTimeFlexible,
                    expiresAt: zodDateTimeFlexible,
                })
                .strict(),
            // Failed - has error message, no files
            z
                .object({
                    status: z.literal("failed"),
                    exportSlugId: zodSlugId,
                    conversationSlugId: zodSlugId,
                    errorMessage: z.string().optional(),
                    createdAt: zodDateTimeFlexible,
                    expiresAt: zodDateTimeFlexible,
                })
                .strict(),
            // Cancelled - has cancellation reason, no files
            z
                .object({
                    status: z.literal("cancelled"),
                    exportSlugId: zodSlugId,
                    conversationSlugId: zodSlugId,
                    cancellationReason: z.string(),
                    createdAt: zodDateTimeFlexible,
                    expiresAt: zodDateTimeFlexible,
                })
                .strict(),
            // Expired - has deletedAt, no files, may have error/cancellation from original status
            z
                .object({
                    status: z.literal("expired"),
                    exportSlugId: zodSlugId,
                    conversationSlugId: zodSlugId,
                    errorMessage: z.string().optional(),
                    cancellationReason: z.string().optional(),
                    createdAt: zodDateTimeFlexible,
                    expiresAt: zodDateTimeFlexible,
                    deletedAt: zodDateTimeFlexible,
                })
                .strict(),
        ],
    );
    static getConversationExportHistoryRequest = z
        .object({
            conversationSlugId: zodSlugId,
        })
        .strict();
    static conversationExportHistoryItem = z
        .object({
            exportSlugId: zodSlugId,
            status: zodExportStatus,
            createdAt: zodDateTimeFlexible,
        })
        .strict();
    static getConversationExportHistoryResponse = z.array(
        Dto.conversationExportHistoryItem,
    );
    static deleteConversationExportRequest = z
        .object({
            exportSlugId: zodSlugId,
        })
        .strict();
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
export type ImportConversationRequest = z.infer<
    typeof Dto.importConversationRequest
>;
export type ImportConversationResponse = z.infer<
    typeof Dto.importConversationResponse
>;
export type ImportCsvConversationRequest = z.infer<
    typeof Dto.importCsvConversationRequest
>;
export type ImportCsvConversationResponse = z.infer<
    typeof Dto.importCsvConversationResponse
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
export type LinkType = z.infer<typeof Dto.generateVerificationLink200>;
export type GenerateVerificationLink200 = z.infer<
    typeof Dto.generateVerificationLink200
>;
export type VerifyUserStatusAndAuthenticate200 = z.infer<
    typeof Dto.verifyUserStatusAndAuthenticate200
>;
export type VerifyEventTicketRequest = z.infer<
    typeof Dto.verifyEventTicketRequest
>;
export type VerifyEventTicket200 = z.infer<typeof Dto.verifyEventTicket200>;
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
export type GetOrganizationsByUsernameResponse = z.infer<
    typeof Dto.getOrganizationsByUsernameResponse
>;
export type GetAllOrganizationsResponse = z.infer<
    typeof Dto.getAllOrganizationsResponse
>;
export type GetAllTopicsResponse = z.infer<typeof Dto.getAllTopicsResponse>;
export type GetUserFollowedTopicCodesResponse = z.infer<
    typeof Dto.getUserFollowedTopicCodesResponse
>;
export type UserFollowTopicCodeRequest = z.infer<
    typeof Dto.userFollowTopicCodeRequest
>;
export type UserUnfollowTopicCodeRequest = z.infer<
    typeof Dto.userUnfollowTopicCodeRequest
>;
export type GetMathRequest = z.infer<typeof Dto.zodGetMathRequest>;
export type GetLanguagePreferencesRequest = z.infer<
    typeof Dto.getLanguagePreferencesRequest
>;
export type GetLanguagePreferencesResponse = z.infer<
    typeof Dto.getLanguagePreferencesResponse
>;
export type UpdateLanguagePreferencesRequest = z.infer<
    typeof Dto.updateLanguagePreferencesRequest
>;
export type ConversationAnalysis = z.infer<typeof Dto.fetchAnalysisResponse>;
export type CastVoteResponse = z.infer<typeof Dto.castVoteResponse>;
export type ValidateCsvResponse = z.infer<typeof Dto.validateCsvResponse>;
export type GetActiveImportResponse = z.infer<
    typeof Dto.getActiveImportResponse
>;
export type GetActiveExportResponse = z.infer<
    typeof Dto.getActiveExportResponse
>;
export type GetConversationImportStatusRequest = z.infer<
    typeof Dto.getConversationImportStatusRequest
>;
export type GetConversationImportStatusResponse = z.infer<
    typeof Dto.getConversationImportStatusResponse
>;
export type RequestConversationExportRequest = z.infer<
    typeof Dto.requestConversationExportRequest
>;
export type RequestConversationExportResponse = z.infer<
    typeof Dto.requestConversationExportResponse
>;
export type GetConversationExportStatusRequest = z.infer<
    typeof Dto.getConversationExportStatusRequest
>;
export type GetConversationExportStatusResponse = z.infer<
    typeof Dto.getConversationExportStatusResponse
>;
export type GetConversationExportHistoryRequest = z.infer<
    typeof Dto.getConversationExportHistoryRequest
>;
export type GetConversationExportHistoryResponse = z.infer<
    typeof Dto.getConversationExportHistoryResponse
>;
export type DeleteConversationExportRequest = z.infer<
    typeof Dto.deleteConversationExportRequest
>;
export type ConversationExportHistoryItem = z.infer<
    typeof Dto.conversationExportHistoryItem
>;

// Export SSE types
export * from "./sse.js";
