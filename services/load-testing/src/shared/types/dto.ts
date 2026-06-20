/** **** WARNING: GENERATED FROM SHARED DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
import { z } from "zod";
import {
    zodExtendedConversationData,
    zodSlugId,
    zodOpinionItem,
    zodAnalysisOpinionItem,
    zodConversationTitle,
    zodConversationBodyInput,
    zodConversationBodyPlainTextInput,
    zodConversationBodyOutput,
    zodOpinionContentInput,
    zodVotingOption,
    zodVotingAction,
    zodUsername,
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
    zodAnalysisView,
    zodOrganization,
    zodOrganizationSlug,
    zodTopicObject,
    zodFeedSortAlgorithm,
    zodLinkType,
    zodPolisUrl,
    zodLanguagePreferences,
    zodEventSlug,
    zodExportStatus,
    zodExportFileInfo,
    zodExportBundleInfo,
    zodDateTimeFlexible,
    zodExportFailureReason,
    zodImportFailureReason,
    zodParticipationMode,
    zodParticipationBlockedReason,
    zodRichTextValidationFailureReason,
    zodMaxdiffComparison,
    zodConversationType,
    zodConversationLanguageSettingInput,
    zodConversationLanguageSettingOutput,
    zodConversationMultilingualSetting,
    zodConversationViewSnapshotCheckpointReason,
    zodMaxdiffLifecycleStatus,
    zodExternalSourceConfig,
    zodSurveyConfig,
    zodSurveyAggregateRow,
    zodSurveyCompletionCounts,
    zodSurveyQuestionFormItem,
    zodSurveyGateSummary,
    zodSurveyResultsAccessLevel,
    zodSurveyRouteResolution,
    zodSurveyAnswerSubmission,
    zodGrantablePremiumFeature,
    zodPremiumFeature,
    zodUserId,
    zodPreferredOpinionGroupCount,
    zodContentTranslationSubject,
    zodLocalizedConversationContent,
    zodLocalizedOpinionContent,
    zodLocalizedSurveyQuestionContent,
} from "./zod.js";
import { zodPolisVoteRecord } from "./polis.js";
import {
    ZodSupportedSpokenLanguageCodes,
    ZodSupportedDisplayLanguageCodes,
} from "../languages.js";

const zodConversationEditPermissions = z
    .object({
        canEditNormalSettings: z.boolean(),
        canEditConversationContent: z.boolean(),
        canEditSurvey: z.boolean(),
        canDeleteSurvey: z.boolean(),
        canAddEventTicket: z.boolean(),
        canChangeEventTicket: z.boolean(),
        canRemoveEventTicket: z.boolean(),
        canUseAnalysisVariantsPreference: z.boolean(),
        canUseDynamicTranslation: z.boolean(),
        restrictedPremiumFeatures: z.array(zodPremiumFeature),
        premiumEditAccessEndsAt: zodDateTimeFlexible.optional(),
    })
    .strict();

const zodAnalysisViewOptionBase = z
    .object({
        view: zodAnalysisView,
        resolvesToView: zodAnalysisView.optional(),
    })
    .strict();
const zodAnalysisViewOptionCandidate = z
    .object({
        candidateId: z.number().int().positive(),
        groupCount: z.number().int().min(2).max(6),
        assessment: z
            .object({
                selectionScore: z.number(),
                silhouetteScore: z.number().nullable(),
                balanceScore: z.number().nullable(),
            })
            .strict(),
    })
    .strict();
const zodRecommendedAnalysisViewOption = zodAnalysisViewOptionBase.extend({
    status: z.literal("recommended"),
    candidate: zodAnalysisViewOptionCandidate,
});
const zodAvailableAnalysisViewOption = zodAnalysisViewOptionBase.extend({
    status: z.literal("available"),
    candidate: zodAnalysisViewOptionCandidate,
});
const zodDiscouragedAnalysisViewOption = zodAnalysisViewOptionBase.extend({
    status: z.literal("discouraged"),
    candidate: zodAnalysisViewOptionCandidate,
});
const zodLockedAnalysisViewOption = zodAnalysisViewOptionBase.extend({
    status: z.literal("locked"),
    reason: z.literal("analysis_variants_not_available"),
});
const zodFixedGroupCountUnavailableAnalysisViewOption =
    zodAnalysisViewOptionBase.extend({
        status: z.literal("unavailable"),
        reason: z.literal("fixed_group_count_unavailable"),
        groupCount: z.number().int().min(2).max(6),
    });
const zodRecommendedDefaultUnavailableAnalysisViewOption =
    zodAnalysisViewOptionBase.extend({
        status: z.literal("unavailable"),
        reason: z.literal("recommended_default_unavailable"),
    });
const zodAnalysisFrameOpinionListKind = z.enum([
    "agreements",
    "disagreements",
    "divisive",
]);

const zodContentTranslationConversationResponse = z
    .object({
        success: z.literal(true),
        subject: z
            .object({
                kind: z.literal("conversation"),
                conversationSlugId: zodSlugId,
            })
            .strict(),
        content: zodLocalizedConversationContent,
    })
    .strict();

const zodContentTranslationOpinionResponse = z
    .object({
        success: z.literal(true),
        subject: z
            .object({
                kind: z.literal("opinion"),
                conversationSlugId: zodSlugId,
                opinionSlugId: zodSlugId,
            })
            .strict(),
        content: zodLocalizedOpinionContent,
    })
    .strict();

const zodContentTranslationSurveyQuestionResponse = z
    .object({
        success: z.literal(true),
        subject: z
            .object({
                kind: z.literal("survey_question"),
                conversationSlugId: zodSlugId,
                questionSlugId: zodSlugId,
            })
            .strict(),
        content: zodLocalizedSurveyQuestionContent,
    })
    .strict();

const zodContentTranslationResponse = z.union([
    zodContentTranslationConversationResponse,
    zodContentTranslationOpinionResponse,
    zodContentTranslationSurveyQuestionResponse,
    z
        .object({
            success: z.literal(false),
            reason: z.literal("content_translation_not_enabled"),
            multilingualSetting: zodConversationMultilingualSetting,
        })
        .strict(),
    z
        .object({
            success: z.literal(false),
            reason: z.literal("participation_blocked"),
            blockedReason: zodParticipationBlockedReason,
        })
        .strict(),
]);

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class Dto {
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
    static fetchCommentStatsRequest = z
        .object({
            conversationSlugId: zodSlugId,
        })
        .strict();
    static fetchCommentStatsResponse = z
        .object({
            conversationViewSnapshotId: z.number().int().positive(),
            opinionCount: z.number().int().nonnegative(),
            voteCount: z.number().int().nonnegative(),
            participantCount: z.number().int().nonnegative(),
            totalOpinionCount: z.number().int().nonnegative(),
            totalVoteCount: z.number().int().nonnegative(),
            totalParticipantCount: z.number().int().nonnegative(),
            moderatedOpinionCount: z.number().int().nonnegative(),
            hiddenOpinionCount: z.number().int().nonnegative(),
            isClosed: z.boolean(),
        })
        .strict();
    static analysisFreshnessRequest = z
        .object({
            enablePrimaryFallback: z.boolean(),
            minimumConversationViewSnapshotId: z
                .number()
                .int()
                .positive()
                .nullable(),
            expectedDescriptionLocales: z.array(ZodSupportedDisplayLanguageCodes),
        })
        .strict();
    static analysisFrameKey = z
        .object({
            conversationViewSnapshotId: z.number().int().positive(),
            analysisSnapshotId: z.number().int().positive(),
            candidateId: z.number().int().positive(),
        })
        .strict();
    static analysisFrameCounters = z
        .object({
            opinionCount: z.number().int().nonnegative(),
            voteCount: z.number().int().nonnegative(),
            participantCount: z.number().int().nonnegative(),
            totalOpinionCount: z.number().int().nonnegative(),
            totalVoteCount: z.number().int().nonnegative(),
            totalParticipantCount: z.number().int().nonnegative(),
            moderatedOpinionCount: z.number().int().nonnegative(),
            hiddenOpinionCount: z.number().int().nonnegative(),
            isClosed: z.boolean(),
        })
        .strict();
    static groupDescriptionDisplay = z
        .object({
            displayedLocale: ZodSupportedDisplayLanguageCodes.nullable(),
        })
        .strict();
    static fetchAnalysisFrameManifestRequest = z
        .object({
            conversationSlugId: zodSlugId,
            analysisView: zodAnalysisView.optional(),
            checkpointViewSnapshotId: z.number().int().positive().optional(),
            freshness: Dto.analysisFreshnessRequest.nullable().default(null),
        })
        .strict();
    static fetchAnalysisFrameSectionRequest = z
        .object({
            conversationSlugId: zodSlugId,
            frameKey: Dto.analysisFrameKey,
            freshness: Dto.analysisFreshnessRequest.nullable().default(null),
        })
        .strict();
    static fetchAnalysisFrameOpinionListRequest =
        Dto.fetchAnalysisFrameSectionRequest.extend({
            kind: zodAnalysisFrameOpinionListKind,
        }).strict();
    static analysisViewOption = z.union([
        zodRecommendedAnalysisViewOption,
        zodAvailableAnalysisViewOption,
        zodDiscouragedAnalysisViewOption,
        zodLockedAnalysisViewOption,
        zodFixedGroupCountUnavailableAnalysisViewOption,
        zodRecommendedDefaultUnavailableAnalysisViewOption,
    ]);
    static analysisViewState = z
        .object({
            requestedView: zodAnalysisView,
            canonicalView: zodAnalysisView,
            resolvedGroupCount: z.number().int().min(2).max(6).nullable(),
            resolvedCandidateId: z.number().int().positive().nullable(),
            resolvedBy: z.enum([
                "auto",
                "facilitator_preference",
                "facilitator_fallback",
                "fixed_count",
                "locked_fallback",
                "unavailable_fixed_count",
                "no_analysis",
            ]),
            variantsEnabled: z.boolean(),
            options: z.array(Dto.analysisViewOption),
        })
        .strict();
    static analysisViewResolution = Dto.analysisViewState;
    static analysisConversationViewSnapshot = z
        .object({
            conversationViewSnapshotId: z.number().int().positive(),
            analysisSnapshotId: z.number().int().positive(),
            opinionCount: z.number().int().nonnegative(),
            voteCount: z.number().int().nonnegative(),
            participantCount: z.number().int().nonnegative(),
            totalOpinionCount: z.number().int().nonnegative(),
            totalVoteCount: z.number().int().nonnegative(),
            totalParticipantCount: z.number().int().nonnegative(),
            moderatedOpinionCount: z.number().int().nonnegative(),
            hiddenOpinionCount: z.number().int().nonnegative(),
            isClosed: z.boolean(),
        })
        .strict();
    static analysisFrameManifest = z
        .object({
            frameKey: Dto.analysisFrameKey.optional(),
            conversationViewSnapshot:
                Dto.analysisConversationViewSnapshot.optional(),
            counters: Dto.analysisFrameCounters.optional(),
            emptyReason: z.string().optional(),
            analysisViewResolution: Dto.analysisViewResolution,
            aiLabelsExpected: z.boolean(),
            hasVotedOnAllAvailableOpinions: z.boolean().optional(),
        })
        .strict();
    static analysisFrameGroup = z
        .object({
            key: zodPolisKey,
            numUsers: z.number().int().nonnegative(),
            isUserInCluster: z.boolean(),
            representative: z.array(zodAnalysisOpinionItem),
        })
        .strict();
    static analysisFrameGroups = z
        .object({
            frameKey: Dto.analysisFrameKey,
            clusters: z.partialRecord(zodPolisKey, Dto.analysisFrameGroup),
        })
        .strict();
    static analysisFrameGroupLabel = z
        .object({
            key: zodPolisKey,
            aiLabel: z.string(),
            aiSummary: z.string(),
        })
        .strict();
    static analysisFrameGroupLabels = z
        .object({
            frameKey: Dto.analysisFrameKey,
            groupDescriptionDisplay: Dto.groupDescriptionDisplay,
            labels: z.partialRecord(zodPolisKey, Dto.analysisFrameGroupLabel),
        })
        .strict();
    static analysisFrameOpinionListKind = zodAnalysisFrameOpinionListKind;
    static analysisFrameOpinionList = z
        .object({
            frameKey: Dto.analysisFrameKey,
            kind: Dto.analysisFrameOpinionListKind,
            items: z.array(zodAnalysisOpinionItem),
        })
        .strict();
    static fetchAnalysisCheckpointsRequest = z
        .object({
            conversationSlugId: zodSlugId,
        })
        .strict();
    static analysisCheckpointReason = z
        .object({
            reason: zodConversationViewSnapshotCheckpointReason,
            groupCount: z.number().int().min(2).max(6).nullable(),
            previousGroupCount: z.number().int().min(2).max(6).nullable(),
            participantCount: z.number().int().nonnegative().nullable(),
            participantMilestone: z.number().int().positive().nullable(),
            voteCount: z.number().int().nonnegative().nullable(),
            voteMilestone: z.number().int().positive().nullable(),
        })
        .strict();
    static analysisCheckpoint = z
        .object({
            conversationViewSnapshotId: z.number().int().positive(),
            createdAt: zodDateTimeFlexible,
            activatedAt: zodDateTimeFlexible,
            opinionCount: z.number().int().nonnegative(),
            voteCount: z.number().int().nonnegative(),
            participantCount: z.number().int().nonnegative(),
            totalOpinionCount: z.number().int().nonnegative(),
            totalVoteCount: z.number().int().nonnegative(),
            totalParticipantCount: z.number().int().nonnegative(),
            moderatedOpinionCount: z.number().int().nonnegative(),
            hiddenOpinionCount: z.number().int().nonnegative(),
            isClosed: z.boolean(),
            reasons: z.array(Dto.analysisCheckpointReason),
        })
        .strict();
    static fetchAnalysisCheckpointsResponse = z.array(Dto.analysisCheckpoint);
    static fetchHiddenOpinionsRequest = z
        .object({
            conversationSlugId: zodSlugId, // z.object() does not exist :(
            createdAt: z.iso.datetime().optional(),
        })
        .strict();
    static fetchHiddenOpinionsResponse = z.array(zodOpinionItem);
    static createNewConversationRequest = z
        .object({
            conversationTitle: zodConversationTitle,
            conversationBody: zodConversationBodyInput,
            conversationBodyPlainText: zodConversationBodyPlainTextInput,
            postAsOrganization: z.preprocess(
                (val) => (val === "" || val === undefined ? undefined : val),
                zodOrganizationSlug.optional(),
            ),
            isIndexed: z.boolean(),
            participationMode: zodParticipationMode,
            conversationType: zodConversationType,
            languageSetting: zodConversationLanguageSettingInput,
            multilingualSetting: zodConversationMultilingualSetting,
            seedOpinionList: z.array(zodOpinionContentInput).max(50),
            requiresEventTicket: zodEventSlug.optional(),
            aiLabelingEnabled: z.boolean().default(true),
            preferredOpinionGroupCount:
                zodPreferredOpinionGroupCount.default(null),
            externalSourceConfig: zodExternalSourceConfig.nullable().optional(),
            surveyConfig: zodSurveyConfig.nullable().optional(),
        })
        .strict();
    static createNewConversationResponse = z.discriminatedUnion("success", [
        z
            .object({
                success: z.literal(true),
                conversationSlugId: z.string(),
            })
            .strict(),
        z
            .object({
                success: z.literal(false),
                reason: zodRichTextValidationFailureReason,
            })
            .strict(),
    ]);
    static importConversationRequest = z
        .object({
            polisUrl: zodPolisUrl,
            postAsOrganization: z.preprocess(
                (val) => (val === "" || val === undefined ? undefined : val),
                zodOrganizationSlug.optional(),
            ),
            isIndexed: z.boolean(),
            participationMode: zodParticipationMode,
            languageSetting: zodConversationLanguageSettingInput.default({
                mode: "auto",
            }),
            multilingualSetting: zodConversationMultilingualSetting.default({
                additionalLanguageCodes: [],
                dynamicTranslationEnabled: false,
            }),
            requiresEventTicket: zodEventSlug.optional(),
            aiLabelingEnabled: z.boolean().default(true),
            preferredOpinionGroupCount:
                zodPreferredOpinionGroupCount.default(null),
        })
        .strict();
    static importConversationResponse = z
        .object({
            importSlugId: z.string(),
        })
        .strict();
    static importCsvConversationRequest = z
        .object({
            postAsOrganization: z.preprocess(
                (val) => (val === "" || val === undefined ? undefined : val),
                zodOrganizationSlug.optional(),
            ),
            isIndexed: z.boolean(),
            participationMode: zodParticipationMode,
        })
        .strict();
    static importCsvConversationFormRequest = z
        .object({
            postAsOrganization: z.preprocess(
                (val) => (val === "" || val === undefined ? undefined : val),
                zodOrganizationSlug.optional(),
            ),
            isIndexed: z.preprocess(
                (val) => val === "true" || val === true,
                z.boolean(),
            ),
            participationMode: z.preprocess((val) => {
                // Handle form submission where value comes as string
                if (val === "true" || val === true)
                    return "strong_verification";
                if (val === "false" || val === false) return "guest";
                return val; // Already a valid participation mode string
            }, zodParticipationMode),
            languageSetting: z.preprocess((val) => {
                if (val === "" || val === undefined || val === null) {
                    return { mode: "auto" };
                }
                if (typeof val === "string") {
                    const parsed: unknown = JSON.parse(val);
                    return parsed;
                }
                return val;
            }, zodConversationLanguageSettingInput.default({ mode: "auto" })),
            multilingualSetting: z.preprocess((val) => {
                if (val === "" || val === undefined || val === null) {
                    return {
                        additionalLanguageCodes: [],
                        dynamicTranslationEnabled: false,
                    };
                }
                if (typeof val === "string") {
                    const parsed: unknown = JSON.parse(val);
                    return parsed;
                }
                return val;
            }, zodConversationMultilingualSetting.default({
                additionalLanguageCodes: [],
                dynamicTranslationEnabled: false,
            })),
            requiresEventTicket: z.preprocess(
                (val) => (val === "" || val === undefined ? undefined : val),
                zodEventSlug.optional(),
            ),
            aiLabelingEnabled: z.preprocess(
                (val) => val === "true" || val === true,
                z.boolean().default(true),
            ),
            preferredOpinionGroupCount: z.preprocess((val) => {
                if (val === "" || val === undefined || val === null) {
                    return null;
                }
                if (typeof val === "string") {
                    return Number(val);
                }
                return val;
            }, zodPreferredOpinionGroupCount.default(null)),
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
    static getExportReadinessResponse = z.discriminatedUnion("status", [
        // User has an active export processing
        z
            .object({
                status: z.literal("active"),
                exportSlugId: zodSlugId,
                createdAt: zodDateTimeFlexible,
            })
            .strict(),
        // No active export, but cooldown is active - cannot export yet
        z
            .object({
                status: z.literal("cooldown"),
                cooldownEndsAt: zodDateTimeFlexible,
                lastExportSlugId: zodSlugId,
            })
            .strict(),
        // No active export, no cooldown - ready to export
        z
            .object({
                status: z.literal("ready"),
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
            // Failed - has failure reason
            z
                .object({
                    status: z.literal("failed"),
                    importSlugId: zodSlugId,
                    failureReason: zodImportFailureReason.optional(),
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
    static getConversationForEditRequest = z
        .object({
            conversationSlugId: zodSlugId,
        })
        .strict();
    static getConversationForEditResponse = z.discriminatedUnion("success", [
        z
            .object({
                success: z.literal(true),
                conversationSlugId: zodSlugId,
                conversationTitle: zodConversationTitle,
                conversationBody: zodConversationBodyOutput,
                languageSetting: zodConversationLanguageSettingOutput,
                multilingualSetting: zodConversationMultilingualSetting,
                isIndexed: z.boolean(),
                participationMode: zodParticipationMode,
                requiresEventTicket: zodEventSlug.optional(),
                aiLabelingEnabled: z.boolean(),
                preferredOpinionGroupCount: zodPreferredOpinionGroupCount,
                postAsOrganizationName: z.string().optional(),
                surveyConfig: zodSurveyConfig.nullable().optional(),
                createdAt: zodDateTimeFlexible,
                updatedAt: zodDateTimeFlexible,
                isLocked: z.boolean(),
                editPermissions: zodConversationEditPermissions,
            })
            .strict(),
        z
            .object({
                success: z.literal(false),
                reason: z.enum(["not_found", "not_author"]),
            })
            .strict(),
    ]);
    static updateConversationRequest = z
        .object({
            conversationSlugId: zodSlugId,
            conversationTitle: zodConversationTitle,
            conversationBody: zodConversationBodyInput,
            conversationBodyPlainText: zodConversationBodyPlainTextInput,
            isIndexed: z.boolean(),
            participationMode: zodParticipationMode,
            languageSetting: zodConversationLanguageSettingInput,
            multilingualSetting: zodConversationMultilingualSetting,
            requiresEventTicket: zodEventSlug.optional(),
            aiLabelingEnabled: z.boolean().optional(),
            preferredOpinionGroupCount:
                zodPreferredOpinionGroupCount.optional(),
            surveyConfig: zodSurveyConfig.nullable().optional(),
        })
        .strict();
    static updateConversationResponse = z.discriminatedUnion("success", [
        z
            .object({
                success: z.literal(true),
            })
            .strict(),
        z
            .object({
                success: z.literal(false),
                reason: z.enum([
                    "not_found",
                    "not_author",
                    "conversation_locked",
                    "invalid_access_settings",
                    "premium_access_expired",
                    "premium_access_required",
                    "plain_text_too_long",
                    "html_too_long",
                ]),
            })
            .strict(),
    ]);

    static checkPremiumFeatureAccessRequest = z
        .object({
            postAsOrganization: z.preprocess(
                (val) => (val === "" || val === undefined ? undefined : val),
                zodOrganizationSlug.optional(),
            ),
            feature: zodGrantablePremiumFeature,
        })
        .strict();
    static checkPremiumFeatureAccessResponse = z
        .object({
            hasAccess: z.boolean(),
        })
        .strict();
    static contentTranslationRequest = z
        .object({
            subject: zodContentTranslationSubject,
            targetLanguageCode: ZodSupportedDisplayLanguageCodes,
            requestMode: z.enum(["read_existing", "queue_if_missing"]),
        })
        .strict();
    static contentTranslationResponse = zodContentTranslationResponse;
    static surveyFormFetchRequest = z
        .object({
            conversationSlugId: zodSlugId,
        })
        .strict();
    static surveyFormFetchResponse = z
        .object({
            currentRevision: z.number().int().positive(),
            questions: z.array(zodSurveyQuestionFormItem),
            surveyGate: zodSurveyGateSummary,
        })
        .strict();
    static surveyStatusCheckRequest = z
        .object({
            conversationSlugId: zodSlugId,
        })
        .strict();
    static surveyStatusCheckResponse = z
        .object({
            surveyGate: zodSurveyGateSummary,
            routeResolution: zodSurveyRouteResolution,
        })
        .strict();
    static surveyAnswerSaveRequest = z
        .object({
            conversationSlugId: zodSlugId,
            questionSlugId: zodSlugId,
            answer: zodSurveyAnswerSubmission.nullable(),
        })
        .strict();
    static surveyAnswerSaveResponse = z.discriminatedUnion("success", [
        z
            .object({
                success: z.literal(true),
                surveyGate: zodSurveyGateSummary,
                justCompleted: z.boolean(),
            })
            .strict(),
        z
            .object({
                success: z.literal(false),
                reason: zodParticipationBlockedReason,
            })
            .strict(),
    ]);
    static surveyResponseWithdrawRequest = z
        .object({
            conversationSlugId: zodSlugId,
        })
        .strict();
    static surveyResponseWithdrawResponse = z.discriminatedUnion("success", [
        z
            .object({
                success: z.literal(true),
                surveyGate: zodSurveyGateSummary,
            })
            .strict(),
        z
            .object({
                success: z.literal(false),
                reason: zodParticipationBlockedReason,
            })
            .strict(),
    ]);
    static surveyResultsAggregatedRequest = z
        .object({
            conversationSlugId: zodSlugId,
            analysisView: zodAnalysisView.optional(),
            checkpointViewSnapshotId: z.number().int().positive().optional(),
        })
        .strict();
    static surveyResultsAggregatedResponse = z
        .object({
            hasSurvey: z.boolean(),
            accessLevel: zodSurveyResultsAccessLevel,
            suppressionThreshold: z.number().int().positive(),
            suppressedRows: z.array(zodSurveyAggregateRow),
            fullRows: z.array(zodSurveyAggregateRow).optional(),
        })
        .strict();
    static surveyCompletionCountsRequest = z
        .object({
            conversationSlugId: zodSlugId,
        })
        .strict();
    static surveyCompletionCountsResponse = z
        .object({
            hasSurvey: z.boolean(),
            counts: zodSurveyCompletionCounts,
        })
        .strict();
    static surveyConfigUpdateRequest = z
        .object({
            conversationSlugId: zodSlugId,
            surveyConfig: zodSurveyConfig,
        })
        .strict();
    static surveyConfigUpdateResponse = z
        .object({
            currentRevision: z.number().int().positive(),
            surveyGate: zodSurveyGateSummary.optional(),
        })
        .strict();
    static surveyConfigDeleteRequest = z
        .object({
            conversationSlugId: zodSlugId,
        })
        .strict();
    static surveyConfigDeleteResponse = z
        .object({
            success: z.literal(true),
        })
        .strict();
    static createOpinionRequest = z
        .object({
            conversationSlugId: z.string(),
            opinionBody: zodOpinionContentInput,
            opinionPlainText: z.string(),
        })
        .strict();
    static createOpinionResponse = z.discriminatedUnion("success", [
        z
            .object({
                success: z.literal(true),
                opinionSlugId: z.string(),
                opinionItem: zodOpinionItem,
            })
            .strict(),
        z
            .object({
                success: z.literal(false),
                reason: z.union([
                    zodParticipationBlockedReason,
                    zodRichTextValidationFailureReason,
                ]),
            })
            .strict(),
    ]);
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
            returnIsUserClustered: z.boolean().optional(),
        })
        .strict();
    static castVoteResponse = z.discriminatedUnion("success", [
        z
            .object({
                success: z.literal(true),
                userIsClustered: z.boolean().optional(),
            })
            .strict(),
        z
            .object({
                success: z.literal(false),
                reason: zodParticipationBlockedReason,
            })
            .strict(),
    ]);
    static getUserProfileResponse = z
        .object({
            activePostCount: z.number().gte(0),
            createdAt: z.date(),
            username: zodUsername,
            isSiteModerator: z.boolean(),
            isSiteOrgAdmin: z.boolean(),
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
    static closeConversationRequest = z
        .object({
            conversationSlugId: zodSlugId,
        })
        .strict();
    static closeConversationResponse = z.discriminatedUnion("success", [
        z
            .object({
                success: z.literal(true),
            })
            .strict(),
        z
            .object({
                success: z.literal(false),
                reason: z.enum(["not_allowed", "already_closed"]),
            })
            .strict(),
    ]);
    static openConversationRequest = z
        .object({
            conversationSlugId: zodSlugId,
        })
        .strict();
    static openConversationResponse = z.discriminatedUnion("success", [
        z
            .object({
                success: z.literal(true),
            })
            .strict(),
        z
            .object({
                success: z.literal(false),
                reason: z.enum(["not_allowed", "already_open"]),
            })
            .strict(),
    ]);
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
                verificationLink: z.url(),
            })
            .strict(),
        z.object({
            success: z.literal(false),
            reason: z.enum([
                "already_has_credential",
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
            organizationSlug: zodOrganizationSlug,
            imagePath: z.string(),
            isFullImagePath: z.boolean(),
            websiteUrl: z.url().optional(),
            description: z.string(),
        })
        .strict();
    static deleteOrganizationRequest = z
        .object({
            organizationName: zodOrganizationSlug,
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
            organizationName: zodOrganizationSlug,
        })
        .strict();
    static removeUserOrganizationMappingRequest = z
        .object({
            username: zodUsername,
            organizationName: zodOrganizationSlug,
        })
        .strict();
    static premiumFeatureEntitlementSubjectRequest = z
        .object({
            username: zodUsername.optional(),
            organizationName: zodOrganizationSlug.optional(),
        })
        .strict()
        .refine(
            ({ username, organizationName }) =>
                (username !== undefined && organizationName === undefined) ||
                (username === undefined && organizationName !== undefined),
            {
                message:
                    "Exactly one of username or organizationName is required",
            },
        );
    static premiumFeatureEntitlementItem = z
        .object({
            id: z.number().int().positive(),
            userId: zodUserId.optional(),
            username: zodUsername.optional(),
            organizationId: z.number().int().positive().optional(),
            organizationName: z.string().optional(),
            feature: zodPremiumFeature,
            startsAt: zodDateTimeFlexible,
            expiresAt: zodDateTimeFlexible.optional(),
            revokedAt: zodDateTimeFlexible.optional(),
            adminNote: z.string().optional(),
            createdAt: zodDateTimeFlexible,
            updatedAt: zodDateTimeFlexible,
        })
        .strict();
    static listPremiumFeatureEntitlementsRequest = z.object({}).strict();
    static listPremiumFeatureEntitlementsResponse = z
        .object({
            entitlements: z.array(Dto.premiumFeatureEntitlementItem),
        })
        .strict();
    static createPremiumFeatureEntitlementRequest = z
        .object({
            subject: Dto.premiumFeatureEntitlementSubjectRequest,
            features: z.array(zodGrantablePremiumFeature).min(1),
            startsAt: z.iso.datetime(),
            expiresAt: z.iso.datetime().optional(),
            adminNote: z.string().max(1000).optional(),
        })
        .strict();
    static updatePremiumFeatureEntitlementRequest = z
        .object({
            entitlementId: z.number().int().positive(),
            startsAt: z.iso.datetime(),
            expiresAt: z.iso.datetime().optional(),
            revokedAt: z.iso.datetime().nullable().optional(),
            adminNote: z.string().max(1000).optional(),
        })
        .strict();
    static revokePremiumFeatureEntitlementRequest = z
        .object({
            entitlementId: z.number().int().positive(),
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
                "already_has_credential",
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

    static updateLanguagePreferencesResponse = z
        .object({
            success: z.literal(true),
        })
        .strict();

    // Conversation export
    static requestConversationExportRequest = z
        .object({
            conversationSlugId: zodSlugId,
        })
        .strict();
    static requestConversationExportResponse = z.union([
        // Success case: queued
        z
            .object({
                success: z.literal(true),
                status: z.literal("queued"),
                exportSlugId: zodSlugId,
            })
            .strict(),
        // Success case: cooldown active
        z
            .object({
                success: z.literal(true),
                status: z.literal("cooldown_active"),
                cooldownEndsAt: zodDateTimeFlexible,
            })
            .strict(),
        // Failure cases
        z
            .object({
                success: z.literal(false),
                reason: z.enum([
                    "active_export_in_progress",
                    "conversation_not_found",
                    "no_opinions",
                ]),
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
                    bundle: zodExportBundleInfo.optional(),
                    createdAt: zodDateTimeFlexible,
                    expiresAt: zodDateTimeFlexible,
                })
                .strict(),
            // Failed - has failure reason, no files
            z
                .object({
                    status: z.literal("failed"),
                    exportSlugId: zodSlugId,
                    conversationSlugId: zodSlugId,
                    failureReason: zodExportFailureReason.optional(),
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
            // Expired - has deletedAt, no files, may have failure reason/cancellation from original status
            z
                .object({
                    status: z.literal("expired"),
                    exportSlugId: zodSlugId,
                    conversationSlugId: zodSlugId,
                    failureReason: zodExportFailureReason.optional(),
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

    // MaxDiff (Best-Worst Scaling)
    static maxdiffSaveRequest = z
        .object({
            conversationSlugId: z.string(),
            ranking: z.array(z.string()).nullable(),
            comparisons: z.array(zodMaxdiffComparison),
            isComplete: z.boolean(),
        })
        .strict();
    static maxdiffSaveResponse = z.discriminatedUnion("success", [
        z
            .object({
                success: z.literal(true),
                candidateSets: z.array(z.array(z.string())),
            })
            .strict(),
        z
            .object({
                success: z.literal(false),
                reason: zodParticipationBlockedReason,
            })
            .strict(),
    ]);
    static maxdiffLoadRequest = z
        .object({
            conversationSlugId: z.string(),
        })
        .strict();
    static maxdiffLoadResponse = z.object({
        ranking: z.array(z.string()).nullable(),
        comparisons: z.array(zodMaxdiffComparison).nullable(),
        isComplete: z.boolean(),
        candidateSets: z.array(z.array(z.string())),
        perUserScores: z
            .array(
                z.object({
                    entitySlugId: z.string(),
                    score: z.number(),
                }),
            )
            .nullable(),
    });
    static maxdiffResultsRequest = z
        .object({
            conversationSlugId: z.string(),
            lifecycleFilter: zodMaxdiffLifecycleStatus
                .or(z.literal("all"))
                .optional()
                .default("active"),
        })
        .strict();
    static maxdiffResultItem = z.object({
        itemSlugId: z.string(),
        title: z.string(),
        body: z.string().nullable(),
        avgRank: z.number().nullable(),
        score: z.number().nullable(),
        participantCount: z.number(),
        lifecycleStatus: zodMaxdiffLifecycleStatus,
        externalUrl: z.string().nullable(),
    });
    static maxdiffResultsResponse = z.object({
        rankings: z.array(Dto.maxdiffResultItem),
    });
    // MaxDiff item CRUD
    static maxdiffItemsFetchRequest = z
        .object({
            conversationSlugId: z.string(),
            lifecycleFilter: zodMaxdiffLifecycleStatus
                .or(z.literal("all"))
                .optional()
                .default("active"),
        })
        .strict();
    static maxdiffItem = z.object({
        slugId: z.string(),
        title: z.string(),
        body: z.string().nullable(),
        lifecycleStatus: zodMaxdiffLifecycleStatus,
        externalUrl: z.string().nullable(),
        snapshotScore: z.number().nullable(),
        snapshotRank: z.number().nullable(),
        snapshotParticipantCount: z.number().nullable(),
        createdAt: z.string(),
    });
    static maxdiffItemsFetchResponse = z.object({
        items: z.array(Dto.maxdiffItem),
    });

    // MaxDiff item lifecycle update
    static maxdiffItemLifecycleUpdateRequest = z
        .object({
            conversationSlugId: z.string(),
            itemSlugId: z.string(),
            newStatus: zodMaxdiffLifecycleStatus,
        })
        .strict();

    // MaxDiff external source sync
    static maxdiffSyncRequest = z
        .object({
            conversationSlugId: z.string(),
        })
        .strict();
    static maxdiffSyncResponse = z.object({
        created: z.number(),
        updated: z.number(),
    });

    // MaxDiff GitHub preview (before conversation creation)
    static maxdiffGitHubPreviewRequest = z
        .object({
            repository: z.string(), // "owner/repo"
            label: z.string(),
        })
        .strict();
    static maxdiffGitHubPreviewItem = z.object({
        number: z.number(),
        title: z.string(),
        body: z.string().nullable(),
        state: z.enum(["open", "closed"]),
        htmlUrl: z.string(),
    });
    static maxdiffGitHubPreviewResponse = z.object({
        issues: z.array(Dto.maxdiffGitHubPreviewItem),
    });
}

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
export type GetConversationForEditRequest = z.infer<
    typeof Dto.getConversationForEditRequest
>;
export type GetConversationForEditResponse = z.infer<
    typeof Dto.getConversationForEditResponse
>;
export type UpdateConversationRequest = z.infer<
    typeof Dto.updateConversationRequest
>;
export type UpdateConversationResponse = z.infer<
    typeof Dto.updateConversationResponse
>;
export type CheckPremiumFeatureAccessRequest = z.infer<
    typeof Dto.checkPremiumFeatureAccessRequest
>;
export type CheckPremiumFeatureAccessResponse = z.infer<
    typeof Dto.checkPremiumFeatureAccessResponse
>;
export type CreateCommentResponse = z.infer<typeof Dto.createOpinionResponse>;
export type CreateOpinionRequest = z.infer<typeof Dto.createOpinionRequest>;
export type FetchUserVotesForPostSlugIdsResponse = z.infer<
    typeof Dto.getUserVotesByConversationsResponse
>;
export type FetchCommentFeedResponse = z.infer<
    typeof Dto.fetchOpinionsResponse
>;
export type FetchCommentStatsResponse = z.infer<
    typeof Dto.fetchCommentStatsResponse
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
export type PremiumFeatureEntitlementItem = z.infer<
    typeof Dto.premiumFeatureEntitlementItem
>;
export type ListPremiumFeatureEntitlementsResponse = z.infer<
    typeof Dto.listPremiumFeatureEntitlementsResponse
>;
export type CreatePremiumFeatureEntitlementRequest = z.infer<
    typeof Dto.createPremiumFeatureEntitlementRequest
>;
export type UpdatePremiumFeatureEntitlementRequest = z.infer<
    typeof Dto.updatePremiumFeatureEntitlementRequest
>;
export type RevokePremiumFeatureEntitlementRequest = z.infer<
    typeof Dto.revokePremiumFeatureEntitlementRequest
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
export type AnalysisFrameKey = z.infer<typeof Dto.analysisFrameKey>;
export type AnalysisFrameManifest = z.infer<typeof Dto.analysisFrameManifest>;
export type AnalysisFrameGroups = z.infer<typeof Dto.analysisFrameGroups>;
export type AnalysisFrameGroupLabels = z.infer<
    typeof Dto.analysisFrameGroupLabels
>;
export type AnalysisFrameOpinionListKind = z.infer<
    typeof Dto.analysisFrameOpinionListKind
>;
export type AnalysisFrameOpinionList = z.infer<
    typeof Dto.analysisFrameOpinionList
>;
export type GroupDescriptionDisplay = z.infer<
    typeof Dto.groupDescriptionDisplay
>;
export type AnalysisViewOptionCandidate = z.infer<
    typeof zodAnalysisViewOptionCandidate
>;
export type AnalysisViewOption = z.infer<typeof Dto.analysisViewOption>;
export type AnalysisViewState = z.infer<typeof Dto.analysisViewState>;
export type AnalysisViewResolution = z.infer<
    typeof Dto.analysisViewResolution
>;
export type AnalysisConversationViewSnapshot = z.infer<
    typeof Dto.analysisConversationViewSnapshot
>;
export type AnalysisFreshnessRequest = z.infer<
    typeof Dto.analysisFreshnessRequest
>;
export type AnalysisCheckpoint = z.infer<typeof Dto.analysisCheckpoint>;
export type FetchAnalysisCheckpointsResponse = z.infer<
    typeof Dto.fetchAnalysisCheckpointsResponse
>;
export type CastVoteResponse = z.infer<typeof Dto.castVoteResponse>;
export type CloseConversationResponse = z.infer<
    typeof Dto.closeConversationResponse
>;
export type OpenConversationResponse = z.infer<
    typeof Dto.openConversationResponse
>;
export type ValidateCsvResponse = z.infer<typeof Dto.validateCsvResponse>;
export type GetActiveImportResponse = z.infer<
    typeof Dto.getActiveImportResponse
>;
export type GetExportReadinessResponse = z.infer<
    typeof Dto.getExportReadinessResponse
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
export type SurveyFormFetchRequest = z.infer<typeof Dto.surveyFormFetchRequest>;
export type SurveyFormFetchResponse = z.infer<
    typeof Dto.surveyFormFetchResponse
>;
export type SurveyStatusCheckRequest = z.infer<
    typeof Dto.surveyStatusCheckRequest
>;
export type SurveyStatusCheckResponse = z.infer<
    typeof Dto.surveyStatusCheckResponse
>;
export type SurveyAnswerSaveRequest = z.infer<
    typeof Dto.surveyAnswerSaveRequest
>;
export type SurveyAnswerSaveResponse = z.infer<
    typeof Dto.surveyAnswerSaveResponse
>;
export type SurveyResponseWithdrawRequest = z.infer<
    typeof Dto.surveyResponseWithdrawRequest
>;
export type SurveyResponseWithdrawResponse = z.infer<
    typeof Dto.surveyResponseWithdrawResponse
>;
export type SurveyResultsAggregatedRequest = z.infer<
    typeof Dto.surveyResultsAggregatedRequest
>;
export type SurveyResultsAggregatedResponse = z.infer<
    typeof Dto.surveyResultsAggregatedResponse
>;
export type SurveyCompletionCountsRequest = z.infer<
    typeof Dto.surveyCompletionCountsRequest
>;
export type SurveyCompletionCountsResponse = z.infer<
    typeof Dto.surveyCompletionCountsResponse
>;
export type SurveyConfigUpdateRequest = z.infer<
    typeof Dto.surveyConfigUpdateRequest
>;
export type SurveyConfigUpdateResponse = z.infer<
    typeof Dto.surveyConfigUpdateResponse
>;
export type SurveyConfigDeleteRequest = z.infer<
    typeof Dto.surveyConfigDeleteRequest
>;
export type SurveyConfigDeleteResponse = z.infer<
    typeof Dto.surveyConfigDeleteResponse
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
export type MaxDiffSaveRequest = z.infer<typeof Dto.maxdiffSaveRequest>;
export type MaxDiffLoadResponse = z.infer<typeof Dto.maxdiffLoadResponse>;
export type MaxDiffResultItem = z.infer<typeof Dto.maxdiffResultItem>;
export type MaxDiffResultsResponse = z.infer<typeof Dto.maxdiffResultsResponse>;
export type MaxDiffSaveResponse = z.infer<typeof Dto.maxdiffSaveResponse>;
export type MaxDiffItem = z.infer<typeof Dto.maxdiffItem>;
export type MaxDiffItemsFetchResponse = z.infer<
    typeof Dto.maxdiffItemsFetchResponse
>;
export type MaxDiffSyncResponse = z.infer<typeof Dto.maxdiffSyncResponse>;

// Export SSE types
export * from "./sse.js";
