/** **** WARNING: GENERATED FROM SHARED DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
import { z } from "zod";
import { validateDidKey, validateDidWeb } from "../did/util.js";
import {
    MAX_LENGTH_TITLE,
    MAX_LENGTH_SURVEY_OPTION,
    MAX_LENGTH_SURVEY_QUESTION,
    MIN_LENGTH_USERNAME,
    MAX_LENGTH_USERNAME,
    MAX_LENGTH_BODY,
    MAX_LENGTH_BODY_HTML,
    MAX_LENGTH_OPINION,
    MAX_LENGTH_OPINION_HTML,
    MAX_LENGTH_USER_REPORT_EXPLANATION,
    validateHtmlStringCharacterCount,
    MAX_LENGTH_OPINION_HTML_OUTPUT,
} from "../shared.js";
import { isValidPolisUrl } from "../utils/polis.js";
import {
    ZodSupportedSpokenLanguageCodes,
    ZodSupportedDisplayLanguageCodes,
} from "../languages.js";

export const zodDateTimeFlexible = z.coerce.date();
export const zodSlugId = z.string().max(10);

export const zodEventSlug = z.enum(["devconnect-2025"]);

export const zodUserReportReason = z.enum([
    "misleading",
    "antisocial",
    "illegal",
    "doxing",
    "sexual",
    "spam",
]);
export const zodModerationReason = z.enum([
    "misleading",
    "antisocial",
    "illegal",
    "doxing",
    "sexual",
    "spam",
]);
export const zodFeedSortAlgorithm = z.enum(["following", "new"]);
export const zodParticipationMode = z.enum([
    "account_required",
    "strong_verification",
    "email_verification",
    "guest",
]);
export const zodConversationType = z.enum(["polis", "maxdiff"]);
export const zodParticipationBlockedReason = z.enum([
    "conversation_locked",
    "conversation_closed",
    "event_ticket_required",
    "account_required",
    "strong_verification_required",
    "email_verification_required",
    "survey_required",
    "survey_outdated",
]);
export const zodConversationModerationAction = z.enum(["lock"]);
export const zodOpinionModerationAction = z.enum(["move", "hide"]);
export const zodExportStatus = z.enum([
    "processing",
    "completed",
    "failed",
    "cancelled",
    "expired",
]);
// Export failure reasons - keep in sync with schema.ts exportFailureReasonEnum
export const zodExportFailureReason = z.enum([
    "processing_error", // Generic error during CSV generation or S3 upload
    "timeout", // Export timed out during processing
    "server_restart", // Server restarted while processing (stuck exports)
]);
// Import failure reasons - keep in sync with schema.ts importFailureReasonEnum
export const zodImportFailureReason = z.enum([
    "processing_error", // Generic error during import processing
    "timeout", // Import timed out during processing
    "server_restart", // Server restarted while processing (stuck imports)
    "invalid_data_format", // Invalid data format in queue
]);
export const zodExportFileType = z.enum([
    "bundle",
    "comments",
    "votes",
    "participants",
    "summary",
    "stats",
    "survey_questions",
    "survey_question_options",
    "survey_participant_responses",
    "survey_public_aggregates",
    "survey_full_aggregates",
]);
export const zodExportFileAudience = z.enum(["redacted", "owner", "requester"]);
export const zodExportFileInfo = z
    .object({
        fileType: zodExportFileType,
        fileName: z.string(),
        fileSize: z.number().int().positive(),
        recordCount: z.number().int().nonnegative(),
        downloadUrl: z.url(),
        urlExpiresAt: zodDateTimeFlexible,
    })
    .strict();
export const zodExportBundleInfo = z
    .object({
        fileName: z.string(),
        fileSize: z.number().int().positive(),
        downloadUrl: z.url(),
        urlExpiresAt: zodDateTimeFlexible,
    })
    .strict();
export const zodOrganization = z
    .object({
        name: z.string(),
        imageUrl: z.string(),
        websiteUrl: z.url({ message: "Invalid organization website url" }),
        description: z.string(),
    })
    .strict();
export const zodDidKey = z
    .string()
    .describe("Decentralized Identifier with did:key method")
    .max(1000)
    .refine(
        (val: string) => {
            return validateDidKey(val);
        },
        {
            message: "Please use a base58-encoded DID formatted `did:key:z...`",
        },
    );
export const zodDidWeb = z
    .string()
    .describe("Decentralized Identifier with did:web method")
    .max(1000)
    .refine(
        (val: string) => {
            return validateDidWeb(val);
        },
        {
            message: "Please use a valid DID formatted `did:web:...`",
        },
    );
export const zodModerationExplanation = z.string().max(MAX_LENGTH_BODY);
export const zodCode = z.coerce.number().min(0).max(999999);
export const zodDigit = z.coerce.number().int().nonnegative().lte(9);
export const zodUserId = z.uuid().min(1);
export const zodDevice = z
    .object({
        didWrite: zodDidKey,
        userAgent: z.string(),
    })
    .strict();
export const zodDevices = z.array(zodDevice); // list of didWrite of all the devices belonging to a user
export const zodConversationTitle = z.string().max(MAX_LENGTH_TITLE).min(1);

// For API input validation - validates both HTML string length AND plain text character count
export const zodConversationBodyInput = z
    .string()
    .max(MAX_LENGTH_BODY_HTML, {
        message: `Raw HTML content exceeds maximum length of ${String(MAX_LENGTH_BODY_HTML)} characters`,
    })
    .refine(
        (val: string) => {
            return validateHtmlStringCharacterCount(val, "conversation")
                .isValid;
        },
        {
            message: `Plain text content exceeds maximum length of ${String(MAX_LENGTH_BODY)} characters`,
        },
    )
    .optional();

// For database/API output - validates HTML string length only (after linkification may add extra chars)
export const zodConversationBodyOutput = z
    .string()
    .max(MAX_LENGTH_BODY_HTML, {
        message: `Raw HTML content exceeds maximum length of ${String(MAX_LENGTH_BODY_HTML)} characters`,
    })
    .optional();
export const zodConversationDataWithResult = z
    .object({
        title: zodConversationTitle,
        body: zodConversationBodyOutput,
    })
    .strict();
export const zodCount = z.number().int().nonnegative();
export const zodCommentFeedFilter = z.enum([
    "hidden",
    "moderated",
    "new",
    "discover",
    "my_votes",
]);
export const usernameRegex = new RegExp(
    `^[a-z0-9_]*$`, // {${MIN_LENGTH_USERNAME.toString()},${MAX_LENGTH_USERNAME.toString()}
);
export const zodUsername = z
    .string()
    .regex(
        usernameRegex,
        'Username may only contain lower-cased letters, numbers and "_"',
    )
    .refine((val) => /(?=.*[a-z])/.test(val) || /(?=.*[0-9])/.test(val), {
        message: "Username must contain at least one character or number",
    })
    .refine((val) => !/__+/.test(val), {
        message: "Username must not contain two consecutive underscores",
    })
    .refine((val) => val.length >= MIN_LENGTH_USERNAME, {
        message: `Username must contain at least ${MIN_LENGTH_USERNAME.toString()} characters`,
    })
    .refine((val) => val.length <= MAX_LENGTH_USERNAME, {
        message: `Username must cannot exceed ${MAX_LENGTH_USERNAME.toString()} characters`,
    })
    .refine((val) => !val.startsWith("ext"), {
        message: "Username must not start with 'ext'",
    })
    .refine((val) => val.toLowerCase() !== "agora", {
        message: "Username must not be 'agora'",
    })
    .refine((val) => val.toLowerCase() !== "zkorum", {
        message: "Username must not be 'zkorum'",
    })
    .refine((val) => val.toLowerCase() !== "agoracitizennetwork", {
        message: "Username must not be 'agoracitizennetwork'",
    })
    .refine((val) => val.toLowerCase() !== "agora_citizen_network", {
        message: "Username must not be 'agora_citizen_network'",
    });

export const zodUserMuteAction = z.enum(["mute", "unmute"]);
export const zodUserMuteItem = z
    .object({
        createdAt: zodDateTimeFlexible,
        username: z.string(),
    })
    .strict();

export const zodUserReportExplanation = z
    .string()
    .max(MAX_LENGTH_USER_REPORT_EXPLANATION)
    .optional();
export const zodUserReportItem = z.object({
    username: z.string(),
    reason: zodUserReportReason,
    explanation: zodUserReportExplanation.optional(),
    createdAt: zodDateTimeFlexible,
    id: z.number(),
});

const zodOpinionRouteTarget = z
    .object({
        type: z.literal("opinion"),
        conversationSlugId: zodSlugId,
        opinionSlugId: zodSlugId,
    })
    .strict();

const zodExportRouteTarget = z
    .object({
        type: z.literal("export"),
        conversationSlugId: zodSlugId,
        exportSlugId: zodSlugId,
    })
    .strict();

const zodImportRouteTarget = z
    .object({
        type: z.literal("import"),
        importSlugId: zodSlugId,
        conversationSlugId: zodSlugId.optional(), // Optional: present when import completed
    })
    .strict();

export const zodRouteTarget = z.discriminatedUnion("type", [
    zodOpinionRouteTarget,
    zodExportRouteTarget,
    zodImportRouteTarget,
]);

export const zodTopicObject = z
    .object({
        code: z.string(),
        name: z.string(),
    })
    .strict();

// WARNING: change this together with the below values!
export const zodNotificationType = z.enum([
    "opinion_vote",
    "new_opinion",
    "export_started",
    "export_completed",
    "export_failed",
    "export_cancelled",
    "import_started",
    "import_completed",
    "import_failed",
]);

// Base notification schema with common fields (no message - each type defines its own content)
const zodNotificationBase = z.object({
    slugId: zodSlugId,
    isRead: z.boolean(),
    createdAt: zodDateTimeFlexible,
});

// Opinion notification schemas - use 'message' for opinion content
const zodOpinionVoteNotification = zodNotificationBase
    .extend({
        type: z.literal("opinion_vote"),
        routeTarget: zodOpinionRouteTarget,
        numVotes: z.number().int().min(1),
        message: z.string(), // Opinion content
        isSeed: z.boolean(),
    })
    .strict();

const zodNewOpinionNotification = zodNotificationBase
    .extend({
        type: z.literal("new_opinion"),
        routeTarget: zodOpinionRouteTarget,
        username: z.string(),
        message: z.string(), // Opinion content
    })
    .strict();

// Export notification schemas - use 'conversationTitle' for context
const zodExportStartedNotification = zodNotificationBase
    .extend({
        type: z.literal("export_started"),
        routeTarget: zodExportRouteTarget,
        conversationTitle: z.string(),
    })
    .strict();

const zodExportCompletedNotification = zodNotificationBase
    .extend({
        type: z.literal("export_completed"),
        routeTarget: zodExportRouteTarget,
        conversationTitle: z.string(),
    })
    .strict();

const zodExportFailedNotification = zodNotificationBase
    .extend({
        type: z.literal("export_failed"),
        routeTarget: zodExportRouteTarget,
        conversationTitle: z.string(),
        failureReason: zodExportFailureReason.optional(),
    })
    .strict();

const zodExportCancelledNotification = zodNotificationBase
    .extend({
        type: z.literal("export_cancelled"),
        routeTarget: zodExportRouteTarget,
        conversationTitle: z.string(),
        cancellationReason: z.string(),
    })
    .strict();

// Import notification schemas - no message needed, frontend translates type
const zodImportStartedNotification = zodNotificationBase
    .extend({
        type: z.literal("import_started"),
        routeTarget: zodImportRouteTarget,
    })
    .strict();

const zodImportCompletedNotification = zodNotificationBase
    .extend({
        type: z.literal("import_completed"),
        routeTarget: zodImportRouteTarget,
        conversationTitle: z.string().optional(),
    })
    .strict();

const zodImportFailedNotification = zodNotificationBase
    .extend({
        type: z.literal("import_failed"),
        routeTarget: zodImportRouteTarget,
        failureReason: zodImportFailureReason.optional(),
    })
    .strict();

export const zodNotificationItem = z.discriminatedUnion("type", [
    zodOpinionVoteNotification,
    zodNewOpinionNotification,
    zodExportStartedNotification,
    zodExportCompletedNotification,
    zodExportFailedNotification,
    zodExportCancelledNotification,
    zodImportStartedNotification,
    zodImportCompletedNotification,
    zodImportFailedNotification,
]);

export type moderationStatusOptionsType = "moderated" | "unmoderated";
export const zodConversationModerationProperties = z.discriminatedUnion(
    "status",
    [
        z
            .object({
                status: z.literal("moderated"),
                action: zodConversationModerationAction,
                reason: zodModerationReason,
                explanation: zodModerationExplanation,
                createdAt: zodDateTimeFlexible,
                updatedAt: zodDateTimeFlexible,
            })
            .strict(),
        z
            .object({
                status: z.literal("unmoderated"),
            })
            .strict(),
    ],
);

export const zodOpinionModerationProperties = z.discriminatedUnion("status", [
    z
        .object({
            status: z.literal("moderated"),
            action: zodOpinionModerationAction,
            reason: zodModerationReason,
            explanation: zodModerationExplanation,
            createdAt: zodDateTimeFlexible,
            updatedAt: zodDateTimeFlexible,
        })
        .strict(),
    z
        .object({
            status: z.literal("unmoderated"),
        })
        .strict(),
]);

export const zodGitHubExternalSourceConfig = z.object({
    sourceType: z.literal("github_issue"),
    repository: z.string(), // "owner/repo"
    label: z.string(), // "roadmap"
});

export const zodExternalSourceConfig = z.discriminatedUnion("sourceType", [
    zodGitHubExternalSourceConfig,
]);
export type ExternalSourceConfig = z.infer<typeof zodExternalSourceConfig>;

export const zodImportMethod = z.enum(["url", "csv"]);

export const zodImportInfo = z.object({
    method: zodImportMethod,
    sourceUrl: z.string().optional(),
    conversationUrl: z.string().optional(),
    exportUrl: z.string().optional(),
    createdAt: zodDateTimeFlexible.optional(),
    author: z.string().optional(),
});
export type ImportInfo = z.infer<typeof zodImportInfo>;

export const zodSurveyQuestionType = z.enum(["choice", "free_text"]);

export const zodSurveyChoiceDisplay = z.enum(["auto", "list", "dropdown"]);

const zodSurveyQuestionChoiceConstraints = z
    .object({
        type: z.literal("choice"),
        minSelections: z.number().int().nonnegative().min(1),
        maxSelections: z.number().int().nonnegative().min(1).optional(),
    })
    .strict();

const zodSurveyQuestionFreeTextRichTextConstraints = z
    .object({
        type: z.literal("free_text"),
        inputMode: z.literal("rich_text").optional().default("rich_text"),
        minPlainTextLength: z.number().int().nonnegative().optional(),
        maxPlainTextLength: z.number().int().positive(),
        maxHtmlLength: z.number().int().positive(),
    })
    .strict();

const zodSurveyQuestionFreeTextIntegerConstraints = z
    .object({
        type: z.literal("free_text"),
        inputMode: z.literal("integer"),
        minValue: z.number().int().min(1),
        maxValue: z.number().int().min(1).optional(),
    })
    .strict();

export const zodSurveyQuestionConstraints = z.union([
    zodSurveyQuestionChoiceConstraints,
    zodSurveyQuestionFreeTextRichTextConstraints,
    zodSurveyQuestionFreeTextIntegerConstraints,
]);

export const zodSurveyQuestionOption = z
    .object({
        optionSlugId: zodSlugId.optional(),
        optionText: z.string().min(1).max(MAX_LENGTH_SURVEY_OPTION),
        displayOrder: z.number().int().nonnegative(),
        textChangeIsSemantic: z.boolean().optional(),
    })
    .strict();

const zodSurveyQuestionBase = z
    .object({
        questionSlugId: zodSlugId.optional(),
        questionText: z.string().min(1).max(MAX_LENGTH_SURVEY_QUESTION),
        isRequired: z.boolean(),
        displayOrder: z.number().int().nonnegative(),
        textChangeIsSemantic: z.boolean().optional(),
    })
    .strict();

const zodSurveyChoiceQuestionBase = zodSurveyQuestionBase
    .extend({
        choiceDisplay: zodSurveyChoiceDisplay,
        options: z.array(zodSurveyQuestionOption).min(2),
    })
    .strict();

const zodSurveyChoiceQuestionConfig = zodSurveyChoiceQuestionBase
    .extend({
        questionType: z.literal("choice"),
        constraints: zodSurveyQuestionChoiceConstraints,
    })
    .strict();

const zodSurveyFreeTextQuestionConfig = zodSurveyQuestionBase
    .extend({
        questionType: z.literal("free_text"),
        constraints: z.union([
            zodSurveyQuestionFreeTextRichTextConstraints,
            zodSurveyQuestionFreeTextIntegerConstraints,
        ]),
    })
    .strict();

export const zodSurveyQuestionConfig = z
    .discriminatedUnion("questionType", [
        zodSurveyChoiceQuestionConfig,
        zodSurveyFreeTextQuestionConfig,
    ])
    .superRefine((value, ctx) => {
        if (value.questionType !== value.constraints.type) {
            ctx.addIssue({
                code: "custom",
                path: ["constraints", "type"],
            });
        }

        if (value.questionType !== "free_text") {
            const optionSlugIds = value.options
                .map((option) => option.optionSlugId)
                .filter(
                    (optionSlugId): optionSlugId is string =>
                        optionSlugId !== undefined,
                );
            if (new Set(optionSlugIds).size !== optionSlugIds.length) {
                ctx.addIssue({
                    code: "custom",
                    path: ["options"],
                });
            }

            const optionDisplayOrders = value.options.map(
                (option) => option.displayOrder,
            );
            if (
                new Set(optionDisplayOrders).size !== optionDisplayOrders.length
            ) {
                ctx.addIssue({
                    code: "custom",
                    path: ["options"],
                });
            }
        }

        if (
            value.constraints.type === "choice" &&
            value.constraints.maxSelections !== undefined &&
            value.constraints.maxSelections < value.constraints.minSelections
        ) {
            ctx.addIssue({
                code: "custom",
                path: ["constraints", "maxSelections"],
            });
        }

        if (value.questionType === "choice") {
            if (value.constraints.minSelections > value.options.length) {
                ctx.addIssue({
                    code: "custom",
                    path: ["constraints", "minSelections"],
                });
            }

            if (
                value.constraints.maxSelections !== undefined &&
                value.constraints.maxSelections > value.options.length
            ) {
                ctx.addIssue({
                    code: "custom",
                    path: ["constraints", "maxSelections"],
                });
            }
        }

        if (value.constraints.type === "free_text") {
            if (value.constraints.inputMode === "integer") {
                if (
                    value.constraints.maxValue !== undefined &&
                    value.constraints.maxValue < value.constraints.minValue
                ) {
                    ctx.addIssue({
                        code: "custom",
                        path: ["constraints", "maxValue"],
                    });
                }
            } else if (
                value.constraints.minPlainTextLength !== undefined &&
                value.constraints.minPlainTextLength >
                    value.constraints.maxPlainTextLength
            ) {
                ctx.addIssue({
                    code: "custom",
                    path: ["constraints", "minPlainTextLength"],
                });
            }
        }
    });

export const zodSurveyConfig = z
    .object({
        questions: z.array(zodSurveyQuestionConfig),
    })
    .strict()
    .superRefine((value, ctx) => {
        const questionSlugIds = value.questions
            .map((question) => question.questionSlugId)
            .filter(
                (questionSlugId): questionSlugId is string =>
                    questionSlugId !== undefined,
            );
        if (new Set(questionSlugIds).size !== questionSlugIds.length) {
            ctx.addIssue({
                code: "custom",
                path: ["questions"],
            });
        }

        const questionDisplayOrders = value.questions.map(
            (question) => question.displayOrder,
        );
        if (
            new Set(questionDisplayOrders).size !== questionDisplayOrders.length
        ) {
            ctx.addIssue({
                code: "custom",
                path: ["questions"],
            });
        }
    });

export const zodSurveyGateStatus = z.enum([
    "no_survey",
    "not_started",
    "in_progress",
    "needs_update",
    "complete_valid",
]);

export const zodSurveyResultsAccessLevel = z.enum(["public", "owner"]);

export const zodSurveyAggregateScope = z.enum(["overall", "cluster"]);

export const zodSurveyAggregateSuppressionReason = z.enum([
    "count_below_threshold",
    "cluster_deductive_disclosure",
]);

export const zodSurveyGateSummary = z
    .object({
        hasSurvey: z.boolean(),
        canParticipate: z.boolean(),
        status: zodSurveyGateStatus,
    })
    .strict();

export const zodSurveyAggregateRow = z
    .object({
        scope: zodSurveyAggregateScope,
        clusterId: z.string(),
        clusterLabel: z.string(),
        questionId: zodSlugId,
        questionType: zodSurveyQuestionType,
        question: z.string(),
        optionId: zodSlugId,
        option: z.string(),
        count: z.number().int().nonnegative().optional(),
        percentage: z.number().min(0).max(100).optional(),
        isSuppressed: z.boolean(),
        suppressionReason: zodSurveyAggregateSuppressionReason.optional(),
    })
    .strict();

export const zodSurveyCompletionCounts = z
    .object({
        total: z.number().int().nonnegative(),
        completeValid: z.number().int().nonnegative(),
        needsUpdate: z.number().int().nonnegative(),
        notStarted: z.number().int().nonnegative(),
        inProgress: z.number().int().nonnegative(),
    })
    .strict();

const zodSurveyChoiceAnswerDraftBase = z
    .object({
        optionSlugIds: z.array(zodSlugId),
    })
    .strict();

const zodSurveyFreeTextAnswerDraft = z
    .object({
        questionType: z.literal("free_text"),
        textValueHtml: z.string().max(MAX_LENGTH_BODY_HTML),
    })
    .strict();

export const zodSurveyAnswerDraft = z.discriminatedUnion("questionType", [
    zodSurveyChoiceAnswerDraftBase
        .extend({
            questionType: z.literal("choice"),
        })
        .strict(),
    zodSurveyFreeTextAnswerDraft,
]);

export const zodSurveyAnswerSubmission = zodSurveyAnswerDraft;

const zodSurveyQuestionFormItemFields = {
        currentAnswer: zodSurveyAnswerDraft.optional(),
        isPassed: z.boolean(),
        isMissingRequired: z.boolean(),
        isStale: z.boolean(),
        isCurrentAnswerValid: z.boolean(),
        currentSemanticVersion: z.number().int().positive(),
        answeredQuestionSemanticVersion: z.number().int().positive().optional(),
} satisfies z.ZodRawShape;

export const zodSurveyQuestionFormItem = z.discriminatedUnion("questionType", [
    zodSurveyChoiceQuestionConfig
        .extend(zodSurveyQuestionFormItemFields)
        .strict(),
    zodSurveyFreeTextQuestionConfig
        .extend(zodSurveyQuestionFormItemFields)
        .strict(),
]);

export const zodSurveyRouteResolution = z.discriminatedUnion("kind", [
    z
        .object({
            kind: z.literal("none"),
        })
        .strict(),
    z
        .object({
            kind: z.literal("question"),
            questionSlugId: zodSlugId,
        })
        .strict(),
    z
        .object({
            kind: z.literal("summary"),
        })
        .strict(),
]);

export const zodConversationMetadata = z
    .object({
        conversationSlugId: zodSlugId,
        createdAt: zodDateTimeFlexible,
        updatedAt: zodDateTimeFlexible.optional(),
        lastReactedAt: zodDateTimeFlexible,
        opinionCount: zodCount,
        voteCount: zodCount,
        participantCount: zodCount,
        totalOpinionCount: zodCount,
        totalVoteCount: zodCount,
        totalParticipantCount: zodCount,
        moderatedOpinionCount: zodCount,
        hiddenOpinionCount: zodCount,
        authorUsername: z.string(),
        participationMode: zodParticipationMode,
        conversationType: zodConversationType,
        isIndexed: z.boolean(),
        isClosed: z.boolean(),
        isEdited: z.boolean(),
        organization: zodOrganization.optional(),
        moderation: zodConversationModerationProperties,
        requiresEventTicket: zodEventSlug.optional(),
        externalSourceConfig: zodExternalSourceConfig.nullable(),
        importInfo: zodImportInfo.optional(),
    })
    .strict();
export const zodConversationMetadataWithId = z
    .object({
        conversationId: z.number().int().nonnegative(),
        conversationSlugId: zodSlugId,
        createdAt: z.date(),
        updatedAt: z.date().optional(),
        lastReactedAt: z.date(),
        opinionCount: zodCount,
        voteCount: zodCount,
        participantCount: zodCount,
        totalOpinionCount: zodCount,
        totalVoteCount: zodCount,
        totalParticipantCount: zodCount,
        moderatedOpinionCount: zodCount,
        hiddenOpinionCount: zodCount,
        authorUsername: z.string(),
        participationMode: zodParticipationMode,
        conversationType: zodConversationType,
        isIndexed: z.boolean(),
        isClosed: z.boolean(),
        isEdited: z.boolean(),
        organization: zodOrganization.optional(),
        moderation: zodConversationModerationProperties,
        requiresEventTicket: zodEventSlug.optional(),
        externalSourceConfig: zodExternalSourceConfig.nullable(),
        importInfo: z
            .object({
                method: zodImportMethod,
                sourceUrl: z.string().optional(),
                conversationUrl: z.string().optional(),
                exportUrl: z.string().optional(),
                createdAt: z.date().optional(),
                author: z.string().optional(),
            })
            .optional(),
    })
    .strict();
export const zodPolisKey = z.enum(["0", "1", "2", "3", "4", "5"]);

// For API input validation - validates both HTML string length AND plain text character count
export const zodOpinionContentInput = z
    .string()
    .min(1)
    .max(MAX_LENGTH_OPINION_HTML, {
        message: `Raw HTML content exceeds maximum length of ${String(MAX_LENGTH_OPINION_HTML)} characters`,
    })
    .refine(
        (val: string) => {
            return validateHtmlStringCharacterCount(val, "opinion").isValid;
        },
        {
            message: `Plain text content exceeds maximum length of ${String(MAX_LENGTH_OPINION)} characters`,
        },
    );

// For database/API output - validates HTML string length only (after linkification may add extra chars)
export const zodOpinionContentOutput = z
    .string()
    .min(1)
    .max(MAX_LENGTH_OPINION_HTML_OUTPUT, {
        message: `Raw HTML content exceeds maximum length of ${String(MAX_LENGTH_OPINION_HTML_OUTPUT)} characters`,
    });
export const zodAgreementType = z.enum(["agree", "disagree"]);
export const zodVotingOption = z.enum(["agree", "disagree", "pass"]);
export const zodVotingAction = z.enum(["agree", "disagree", "pass", "cancel"]);
export const zodClusterStats = z.object({
    key: zodPolisKey,
    isAuthorInCluster: z.boolean(),
    numUsers: z.number().int().nonnegative(),
    numAgrees: z.number().int().nonnegative(),
    numDisagrees: z.number().int().nonnegative(),
    numPasses: z.number().int().nonnegative(),
});
export const zodOpinionItem = z
    .object({
        opinionSlugId: zodSlugId,
        createdAt: zodDateTimeFlexible,
        updatedAt: zodDateTimeFlexible,
        opinion: zodOpinionContentOutput,
        numParticipants: z.number().int().nonnegative(),
        numAgrees: z.number().int().nonnegative(),
        numDisagrees: z.number().int().nonnegative(),
        numPasses: z.number().int().nonnegative(),
        username: z.string(),
        moderation: zodOpinionModerationProperties,
        isSeed: z.boolean(),
    })
    .strict();
export const zodAnalysisOpinionItem = zodOpinionItem.extend({
    clustersStats: z.array(zodClusterStats),
    groupAwareConsensusAgree: z.number().nonnegative(),
    groupAwareConsensusDisagree: z.number().nonnegative(),
    divisiveScore: z.number().nonnegative(),
});
export const zodClusterMetadata = z
    .object({
        id: z.number().int().nonnegative(),
        key: zodPolisKey,
        numUsers: z.number().int().nonnegative(),
        aiLabel: z.string().optional(),
        aiSummary: z.string().optional(),
        isUserInCluster: z.boolean(),
    })
    .strict();

const zodPolisClusterValue = z
    .object({
        key: zodPolisKey,
        numUsers: z.number().int().nonnegative(),
        aiLabel: z.string().optional(),
        aiSummary: z.string().optional(),
        isUserInCluster: z.boolean(),
        representative: z.array(zodAnalysisOpinionItem),
    })
    .strict();

export const zodPolisClusters = z.partialRecord(
    zodPolisKey,
    zodPolisClusterValue,
);

// Use z.object with optional fields for the same reason as above
export const zodPolisClustersMetadata = z
    .object({
        "0": zodClusterMetadata.optional(),
        "1": zodClusterMetadata.optional(),
        "2": zodClusterMetadata.optional(),
        "3": zodClusterMetadata.optional(),
        "4": zodClusterMetadata.optional(),
        "5": zodClusterMetadata.optional(),
    })
    .strict();

export const zodOpinionItemPerSlugId = z.map(zodSlugId, zodOpinionItem);
export const zodAnalysisOpinionItemPerSlugId = z.map(
    zodSlugId,
    zodAnalysisOpinionItem,
);
export const zodUserInteraction = z
    .object({
        hasVoted: z.boolean(),
        votedIndex: z.number().int().nonnegative(),
        surveyGate: zodSurveyGateSummary.optional(),
    })
    .strict();
export const zodExtendedConversationData = z
    .object({
        metadata: zodConversationMetadata,
        payload: zodConversationDataWithResult,
        interaction: zodUserInteraction,
    })
    .strict();
export const zodExtendedConversationDataWithId = z
    .object({
        metadata: zodConversationMetadataWithId,
        payload: zodConversationDataWithResult,
        interaction: zodUserInteraction,
    })
    .strict();
export const zodExtendedConversationPerSlugId = z.map(
    zodSlugId,
    zodExtendedConversationData,
); // we use map because order is important, and we don't want list because fast access is also important
export const zodExtendedOpinionData = z
    .object({
        conversationData: zodExtendedConversationData,
        opinionItem: zodOpinionItem,
    })
    .strict();
export const zodExtendedOpinionDataWithConvId = z
    .object({
        conversationData: zodExtendedConversationDataWithId,
        opinionItem: zodOpinionItem,
    })
    .strict();
export const zodRarimoStatusAttributes = z.enum([
    "not_verified",
    "verified",
    "failed_verification",
    "uniqueness_check_failed",
]);
export const zodCountryCodeEnum = z.enum([
    "AND",
    "ARE",
    "AFG",
    "ATG",
    "AIA",
    "ALB",
    "ARM",
    "AGO",
    "ATA",
    "ARG",
    "ASM",
    "AUT",
    "AUS",
    "ABW",
    "ALA",
    "AZE",
    "BIH",
    "BRB",
    "BGD",
    "BEL",
    "BFA",
    "BGR",
    "BHR",
    "BDI",
    "BEN",
    "BLM",
    "BMU",
    "BRN",
    "BOL",
    "BES",
    "BRA",
    "BHS",
    "BTN",
    "BVT",
    "BWA",
    "BLR",
    "BLZ",
    "CAN",
    "CCK",
    "COD",
    "CAF",
    "COG",
    "CHE",
    "CIV",
    "COK",
    "CHL",
    "CMR",
    "CHN",
    "COL",
    "CRI",
    "CUB",
    "CPV",
    "CUW",
    "CXR",
    "CYP",
    "CZE",
    "DEU",
    "DJI",
    "DNK",
    "DMA",
    "DOM",
    "DZA",
    "ECU",
    "EST",
    "EGY",
    "ESH",
    "ERI",
    "ESP",
    "ETH",
    "FIN",
    "FJI",
    "FLK",
    "FSM",
    "FRO",
    "FRA",
    "GAB",
    "GBR",
    "GRD",
    "GEO",
    "GUF",
    "GGY",
    "GHA",
    "GIB",
    "GRL",
    "GMB",
    "GIN",
    "GLP",
    "GNQ",
    "GRC",
    "SGS",
    "GTM",
    "GUM",
    "GNB",
    "GUY",
    "HKG",
    "HMD",
    "HND",
    "HRV",
    "HTI",
    "HUN",
    "IDN",
    "IRL",
    "ISR",
    "IMN",
    "IND",
    "IOT",
    "IRQ",
    "IRN",
    "ISL",
    "ITA",
    "JEY",
    "JAM",
    "JOR",
    "JPN",
    "KEN",
    "KGZ",
    "KHM",
    "KIR",
    "COM",
    "KNA",
    "PRK",
    "KOR",
    "KWT",
    "CYM",
    "KAZ",
    "LAO",
    "LBN",
    "LCA",
    "LIE",
    "LKA",
    "LBR",
    "LSO",
    "LTU",
    "LUX",
    "LVA",
    "LBY",
    "MAR",
    "MCO",
    "MDA",
    "MNE",
    "MAF",
    "MDG",
    "MHL",
    "MKD",
    "MLI",
    "MMR",
    "MNG",
    "MAC",
    "MNP",
    "MTQ",
    "MRT",
    "MSR",
    "MLT",
    "MUS",
    "MDV",
    "MWI",
    "MEX",
    "MYS",
    "MOZ",
    "NAM",
    "NCL",
    "NER",
    "NFK",
    "NGA",
    "NIC",
    "NLD",
    "NOR",
    "NPL",
    "NRU",
    "NIU",
    "NZL",
    "OMN",
    "PAN",
    "PER",
    "PYF",
    "PNG",
    "PHL",
    "PAK",
    "POL",
    "SPM",
    "PCN",
    "PRI",
    "PSE",
    "PRT",
    "PLW",
    "PRY",
    "QAT",
    "REU",
    "ROU",
    "SRB",
    "RUS",
    "RWA",
    "SAU",
    "SLB",
    "SYC",
    "SDN",
    "SWE",
    "SGP",
    "SHN",
    "SVN",
    "SJM",
    "SVK",
    "SLE",
    "SMR",
    "SEN",
    "SOM",
    "SUR",
    "SSD",
    "STP",
    "SLV",
    "SXM",
    "SYR",
    "SWZ",
    "TCA",
    "TCD",
    "ATF",
    "TGO",
    "THA",
    "TJK",
    "TKL",
    "TLS",
    "TKM",
    "TUN",
    "TON",
    "TUR",
    "TTO",
    "TUV",
    "TWN",
    "TZA",
    "UKR",
    "UGA",
    "UMI",
    "USA",
    "URY",
    "UZB",
    "VAT",
    "VCT",
    "VEN",
    "VGB",
    "VIR",
    "VNM",
    "VUT",
    "WLF",
    "WSM",
    "XKX",
    "YEM",
    "MYT",
    "ZAF",
    "ZMB",
    "ZWE",
]);

export const zodSupportedCountryCallingCode = z.enum([
    "297",
    "5993",
    "1",
    "299",
    "590",
    "596",
    "599",
    "508",
    "1721",
    "1284",
    "1340",
    "374",
    "995",
    "972",
    "81",
    "82",
    "65",
    "886",
    "35818",
    "355",
    "376",
    "43",
    "375",
    "32",
    "387",
    "359",
    "385",
    "420",
    "45",
    "372",
    "298",
    "358",
    "33",
    "49",
    "350",
    "30",
    "441481",
    "3906698",
    "36",
    "354",
    "353",
    "441624",
    "39",
    "441534",
    "383",
    "371",
    "423",
    "370",
    "352",
    "356",
    "373",
    "377",
    "382",
    "31",
    "389",
    "47",
    "48",
    "351",
    "40",
    "378",
    "381",
    "421",
    "386",
    "34",
    "4779",
    "46",
    "41",
    "90",
    "380",
    "44",
    "38",
    "262",
    "1684",
    "61",
    "5999",
    "689",
    "687",
    "64",
    "971",
    "260",
    "962",
    "967",
    "963",
    "961",
    "7",
    "91",
    "20",
    "63",
    "966",
    "880",
    "212",
    "57",
    "213",
    "55",
    "27",
    "256",
    "977",
    "51",
    "86",
    "54",
    "855",
    "216",
    "221",
    "60",
    "84",
    "225",
    "66",
    "98",
    "56",
    "852",
    "252",
    "218",
    "593",
    "974",
    "509",
    "968",
    "224",
    "970",
    "227",
    "93",
    "243",
    "249",
    "254",
    "211",
    "257",
    "223",
    "234",
    "226",
    "229",
    "964",
    "92",
    "996",
    "998",
    "95",
    "94",
    "250",
    "236",
    "237",
    "62",
    "255",
    "258",
    "58",
    "502",
    "52",
    "251",
    "992",
    "235",
    "246",
    "240",
    "675",
    "245",
    "242",
]);

const zodCredentials = z.object({
    email: z.string().nullable(),
    phone: z
        .object({
            lastTwoDigits: z.number(),
            countryCallingCode: z.string(),
        })
        .nullable(),
    rarimo: z
        .object({
            citizenship: z.string(),
            sex: z.string(),
        })
        .nullable(),
});

const zodNullCredentials = z.object({
    email: z.literal(null),
    phone: z.literal(null),
    rarimo: z.literal(null),
});

const zodIsKnownTrueLoginStatus = z
    .object({
        isKnown: z.literal(true),
        isRegistered: z.boolean(),
        isLoggedIn: z.boolean(),
        userId: z.string(), // User ID for tracking identity changes (account merges)
        credentials: zodCredentials,
    })
    .strict();

const zodIsKnownFalseLoginStatus = z.object({
    isKnown: z.literal(false),
    isRegistered: z.literal(false),
    isLoggedIn: z.literal(false),
    credentials: zodNullCredentials,
});

export const zodGetDeviceStatusResponse = z.discriminatedUnion("isKnown", [
    zodIsKnownFalseLoginStatus,
    zodIsKnownTrueLoginStatus,
]);

export const zodDeviceLoginStatus = z.discriminatedUnion("isKnown", [
    zodIsKnownFalseLoginStatus,
    zodIsKnownTrueLoginStatus, // Include userId so frontend can watch for user identity changes
]);

export const zodLanguagePreferences = z
    .object({
        spokenLanguages: z.array(ZodSupportedSpokenLanguageCodes).min(1),
        displayLanguage: ZodSupportedDisplayLanguageCodes,
    })
    .strict();

export const zodLinkType = z.enum(["http", "deep"]);
export const zodPolisUrl = z
    .url({
        message: "Invalid url",
    })
    .refine(
        (val: string) => {
            return isValidPolisUrl(val);
        },
        {
            message: "Please use valid polis url",
        },
    );
export type Device = z.infer<typeof zodDevice>;
export type Devices = z.infer<typeof zodDevices>;
export type ExtendedConversation = z.infer<typeof zodExtendedConversationData>;
export type ExtendedConversationPerSlugId = z.infer<
    typeof zodExtendedConversationPerSlugId
>;
export type UserInteraction = z.infer<typeof zodUserInteraction>;
export type ConversationMetadata = z.infer<typeof zodConversationMetadata>;
export type ExtendedConversationPayload = z.infer<
    typeof zodConversationDataWithResult
>;
export type CommentContent = z.infer<typeof zodOpinionContentOutput>;
export type OpinionItem = z.infer<typeof zodOpinionItem>;
export type AnalysisOpinionItem = z.infer<typeof zodAnalysisOpinionItem>;
export type OpinionItemPerSlugId = z.infer<typeof zodOpinionItemPerSlugId>;
export type AnalysisOpinionItemPerSlugId = z.infer<
    typeof zodAnalysisOpinionItemPerSlugId
>;
export type ExtendedOpinion = z.infer<typeof zodExtendedOpinionData>;
export type ExtendedOpinionWithConvId = z.infer<
    typeof zodExtendedOpinionDataWithConvId
>;
export type SlugId = z.infer<typeof zodSlugId>;
export type VotingOption = z.infer<typeof zodVotingOption>;
export type VotingAction = z.infer<typeof zodVotingAction>;
export type ParticipationBlockedReason = z.infer<
    typeof zodParticipationBlockedReason
>;
export type SurveyQuestionType = z.infer<typeof zodSurveyQuestionType>;
export type SurveyChoiceDisplay = z.infer<typeof zodSurveyChoiceDisplay>;
export type SurveyQuestionConstraints = z.infer<
    typeof zodSurveyQuestionConstraints
>;
export type SurveyQuestionOption = z.infer<typeof zodSurveyQuestionOption>;
export type SurveyQuestionConfig = z.infer<typeof zodSurveyQuestionConfig>;
export type SurveyConfig = z.infer<typeof zodSurveyConfig>;
export type SurveyAnswerDraft = z.infer<typeof zodSurveyAnswerDraft>;
export type SurveyAnswerSubmission = z.infer<typeof zodSurveyAnswerSubmission>;
export type SurveyGateStatus = z.infer<typeof zodSurveyGateStatus>;
export type SurveyResultsAccessLevel = z.infer<
    typeof zodSurveyResultsAccessLevel
>;
export type SurveyAggregateScope = z.infer<typeof zodSurveyAggregateScope>;
export type SurveyAggregateSuppressionReason = z.infer<
    typeof zodSurveyAggregateSuppressionReason
>;
export type SurveyGateSummary = z.infer<typeof zodSurveyGateSummary>;
export type SurveyAggregateRow = z.infer<typeof zodSurveyAggregateRow>;
export type SurveyCompletionCounts = z.infer<typeof zodSurveyCompletionCounts>;
export type SurveyQuestionFormItem = z.infer<typeof zodSurveyQuestionFormItem>;
export type SurveyRouteResolution = z.infer<typeof zodSurveyRouteResolution>;
export type RarimoStatusAttributes = z.infer<typeof zodRarimoStatusAttributes>;
export type CountryCodeEnum = z.infer<typeof zodCountryCodeEnum>;
export type ModerationReason = z.infer<typeof zodModerationReason>;
export type UserReportReason = z.infer<typeof zodUserReportReason>;
export type UserReportExplanation = z.infer<typeof zodUserReportExplanation>;
export type UserReportItem = z.infer<typeof zodUserReportItem>;
export type ConversationModerationAction = z.infer<
    typeof zodConversationModerationAction
>;
export type OpinionModerationAction = z.infer<
    typeof zodOpinionModerationAction
>;
export type ConversationModerationProperties = z.infer<
    typeof zodConversationModerationProperties
>;
export type OpinionModerationProperties = z.infer<
    typeof zodOpinionModerationProperties
>;
export type CommentFeedFilter = z.infer<typeof zodCommentFeedFilter>;
export type UserMuteAction = z.infer<typeof zodUserMuteAction>;
export type UserMuteItem = z.infer<typeof zodUserMuteItem>;
export type Username = z.infer<typeof zodUsername>;
export type NotificationItem = z.infer<typeof zodNotificationItem>;
export type NotificationType = z.infer<typeof zodNotificationType>;
export type RouteTarget = z.infer<typeof zodRouteTarget>;
export type OpinionRouteTarget = z.infer<typeof zodOpinionRouteTarget>;
export type ExportRouteTarget = z.infer<typeof zodExportRouteTarget>;
export type ImportRouteTarget = z.infer<typeof zodImportRouteTarget>;
export type ClusterStats = z.infer<typeof zodClusterStats>;
export type PolisKey = z.infer<typeof zodPolisKey>;
export type SupportedCountryCallingCode = z.infer<
    typeof zodSupportedCountryCallingCode
>;
export type OrganizationProperties = z.infer<typeof zodOrganization>;
export type DeviceLoginStatus = z.infer<typeof zodDeviceLoginStatus>;
export type DeviceLoginStatusExtended = z.infer<
    typeof zodGetDeviceStatusResponse
>;
export type DeviceIsKnownTrueLoginStatus = z.infer<
    typeof zodIsKnownTrueLoginStatus
>;
export type ZodTopicObject = z.infer<typeof zodTopicObject>;
export type FeedSortAlgorithm = z.infer<typeof zodFeedSortAlgorithm>;
export type LanguagePreferences = z.infer<typeof zodLanguagePreferences>;
export type LinkType = z.infer<typeof zodLinkType>;
export type PolisUrl = z.infer<typeof zodPolisUrl>;
export type AgreementType = z.infer<typeof zodAgreementType>;
export type PolisClusters = z.infer<typeof zodPolisClusters>;
export type PolisClustersMetadata = z.infer<typeof zodPolisClustersMetadata>;
export type ClusterMetadata = z.infer<typeof zodClusterMetadata>;
export type ParticipationMode = z.infer<typeof zodParticipationMode>;
export type EventSlug = z.infer<typeof zodEventSlug>;
export type ExportStatus = z.infer<typeof zodExportStatus>;
export type ExportFailureReason = z.infer<typeof zodExportFailureReason>;
export type ImportFailureReason = z.infer<typeof zodImportFailureReason>;
export type ExportFileType = z.infer<typeof zodExportFileType>;
export type ExportFileAudience = z.infer<typeof zodExportFileAudience>;
export type ExportFileInfo = z.infer<typeof zodExportFileInfo>;
export type ExportBundleInfo = z.infer<typeof zodExportBundleInfo>;

// Rarimo ZK Proof Validation Schemas
// Based on Rarimo circuit spec: https://github.com/rarimo/passport-zk-circuits
export const zodProofData = z
    .object({
        pi_a: z.array(z.string()).min(2).max(3),
        pi_b: z.array(z.array(z.string()).min(2).max(2)).min(3).max(3),
        pi_c: z.array(z.string()).min(2).max(3),
        protocol: z.string(),
    })
    .strict();

export const zodZKProof = z
    .object({
        proof: zodProofData,
        pub_signals: z.array(z.string()).min(8), // Requires at least 8 elements
    })
    .strict();

export const zodStatusResponse = z.object({
    data: z.object({
        attributes: z.object({
            status: zodRarimoStatusAttributes,
        }),
    }),
});

export type ProofData = z.infer<typeof zodProofData>;
export type ZKProof = z.infer<typeof zodZKProof>;
export type StatusResponse = z.infer<typeof zodStatusResponse>;
export type ConversationType = z.infer<typeof zodConversationType>;

// MaxDiff (Best-Worst Scaling) types
export const zodMaxdiffComparison = z.object({
    best: z.string(),
    worst: z.string(),
    set: z.array(z.string()),
});
export type MaxDiffComparison = z.infer<typeof zodMaxdiffComparison>;

// Pairwise comparison types
export const zodPairwiseComparison = z
    .object({
        optionA: z.string(),
        optionB: z.string(),
        comparison: z.number(),
        comparisonMax: z.number().positive(),
    })
    .refine(
        ({ comparison, comparisonMax }) =>
            Math.abs(comparison) <= comparisonMax,
        {
            message: "comparison magnitude must not exceed comparisonMax",
            path: ["comparison"],
        },
    );
export type PairwiseComparison = z.infer<typeof zodPairwiseComparison>;

export const zodMaxdiffState = z.object({
    ranking: z.array(z.string()).nullable(),
    comparisons: z.array(zodMaxdiffComparison),
    isComplete: z.boolean(),
});
export type MaxDiffState = z.infer<typeof zodMaxdiffState>;

export const zodMaxdiffLifecycleStatus = z.enum([
    "active",
    "completed",
    "in_progress",
    "canceled",
]);
export type MaxdiffLifecycleStatus = z.infer<typeof zodMaxdiffLifecycleStatus>;

// Ranking score output (stored in ranking_score.scores JSONB)
export const zodSolidagoEntityScore = z.object({
    entityId: z.string(),
    score: z.number(),
    uncertaintyLeft: z.number(),
    uncertaintyRight: z.number(),
});
export type SolidagoEntityScore = z.infer<typeof zodSolidagoEntityScore>;

export const zodExternalSourceType = z.enum(["github_issue"]);
export type ExternalSourceType = z.infer<typeof zodExternalSourceType>;

// JSONB schemas for external source integration

export const zodGitHubIssueMetadata = z.object({
    labels: z.array(z.string()),
    assignees: z.array(z.string()),
    milestone: z.string().nullable(),
    issueNumber: z.number(),
});
export type GitHubIssueMetadata = z.infer<typeof zodGitHubIssueMetadata>;

// zodGitHubExternalSourceConfig and zodExternalSourceConfig moved before zodConversationMetadata
