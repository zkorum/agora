import {
    Dto,
    type GetConversationResponse,
    type ImportConversationResponse,
    type ImportCsvConversationResponse,
    type SurveyFormFetchResponse,
} from "@/shared/types/dto.js";
import {
    authenticateRequestBody,
    verifyOtpReqBody,
    authenticate200,
    verifyOtp200,
    authenticateEmailRequestBody,
    authenticateEmail200,
    verifyEmailOtpReqBody,
    checkLoginStatusResponse,
    type AuthenticateResponse,
    type AuthenticateEmailResponse,
    type VerifyOtp200,
} from "@/shared/types/dto-auth.js";
import { normalizeEmail } from "@/shared/types/zod-email.js";
import fastifyAuth from "@fastify/auth";
import fastifyCors from "@fastify/cors";
import fastifyMultipart from "@fastify/multipart";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifySensible from "@fastify/sensible";
import fastifySSE from "@fastify/sse";
import fastifySwagger from "@fastify/swagger";
import { Script } from "@valkey/valkey-glide";
import * as ucans from "@ucans/ucans";
import { type PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import {
    type FastifyRequest,
    type FastifyError,
    type FastifyReply,
} from "fastify";
import {
    jsonSchemaTransform,
    serializerCompiler,
    validatorCompiler,
    type ZodTypeProvider,
} from "fastify-type-provider-zod";
import fs from "fs";
import { Transform } from "node:stream";
import type { z } from "zod";
import { config, log, server } from "./app.js";
import * as authService from "@/service/auth.js";
import * as authUtilService from "@/service/authUtil.js";
import * as csvImportService from "@/service/csvImport.js";
import * as feedService from "@/service/feed.js";
import * as projectPageService from "@/service/projectPage.js";
import * as postService from "@/service/post.js";
import * as postEditService from "@/service/postEdit.js";
import { checkConversationParticipation } from "@/service/participationGate.js";
import * as premiumEntitlementService from "@/service/premiumEntitlement.js";
import * as surveyService from "@/service/survey.js";
import { useCommonPost } from "@/service/common.js";
import { MAX_CSV_FILE_SIZE } from "@/shared-app-api/csvUpload.js";
import { checkFeatureAccess } from "@/shared-app-api/featureAccess.js";
import { zodCsvFiles } from "@/service/csvImport.js";
import * as conversationExportService from "@/service/conversationExport/index.js";
import * as conversationImportService from "@/service/conversationImport/index.js";
import * as contentTranslationService from "@/service/contentTranslation.js";
import * as conversationContentService from "@/service/conversationContent.js";
import { fetchAnalysisCheckpointsByConversationSlugId } from "@/service/conversationViewSnapshot.js";
import { createExportWorker } from "@/service/conversationExport/core.js";
import type { ValkeyRef } from "@/service/valkeyRef.js";
import { validateS3Access } from "./service/s3.js";
import {
    getConversationCreateProjectOptions,
    getProjectLanguageSettings,
    resolveConversationCreateTargetResult,
} from "@/service/projectAccess.js";
import {
    getConversationOverrideTranslationTargetLanguagePolicy,
    getManualMultilingualSettingsFromProjectLanguageSettings,
    getProjectTranslationTargetLanguagePolicy,
    isConfiguredTranslationTargetLanguage,
    normalizeInheritedConversationMultilingualSettings,
    sourceLanguageToDisplayLanguage,
} from "@/service/translationLanguageSetting.js";

import {
    httpMethodToAbility,
    httpUrlToResourcePointer,
} from "./shared-app-api/ucan/ucan.js";
import {
    deleteOpinionBySlugId,
    fetchAnalysisFrameGroupLabelsByFrameKey,
    fetchAnalysisFrameGroupsByFrameKey,
    fetchAnalysisFrameManifestByConversationSlugId,
    fetchAnalysisFrameOpinionListByFrameKey,
    fetchCommentStatsByConversationSlugId,
    fetchOpinionsByPostSlugId,
    fetchOpinionsByOpinionSlugIdList,
    isPersonalNonSeedOpinionAuthoredByUser,
    postNewOpinion,
} from "./service/comment.js";
import {
    saveMaxdiffResult,
    loadMaxdiffResult,
    getMaxdiffResults,
    computeGlobalUncertainty,
} from "./service/maxdiff.js";
import { generateCandidateSets } from "./service/maxdiffRouting.js";
import {
    fetchRankingItems,
    updateRankingItemLifecycle,
} from "./service/rankingItem.js";
import type { RankingItemDisplayPreferences } from "./service/rankingItemDisplay.js";
import {
    verifyWebhookSignature,
    parseWebhookPayload,
    handleIssueWebhook,
    syncGitHubIssues,
    createGitHubClient,
} from "./service/externalSource/github.js";
import {
    castVoteForOpinionSlugId,
    getUserVotesForPostSlugIds as getUserVotesByConversations,
} from "./service/voting.js";
import {
    getFilteredUserComments,
    getUserPosts,
    getUserProfile,
} from "./service/user.js";
import axios, { type AxiosInstance } from "axios";
import {
    generateVerificationLink,
    verifyUserStatusAndAuthenticate,
} from "./service/rarimo.js";
import { verifyEventTicket } from "./service/zupass.js";
import {
    checkUserNameInUse,
    deleteUserAccount,
    generateUnusedRandomUsername,
    submitUsernameChange,
} from "./service/account.js";
import {
    isSiteModeratorAccount,
    isSiteOrgAdminAccount,
    canModerateConversation,
    canModerateConversationByOpinionSlugId,
} from "@/service/authUtil.js";
import {
    fetchModerationReportByCommentSlugId as getOpinionModerationStatus,
    fetchModerationReportByPostSlugId as getConversationModerationStatus,
    moderateByCommentSlugId,
    moderateByPostSlugId,
    withdrawModerationReportByCommentSlugId,
    withdrawModerationReportByPostSlugId,
} from "./service/moderation.js";
import {
    createUserReportByCommentSlugId,
    createUserReportByPostSlugId,
    fetchUserReportsByCommentSlugId,
    fetchUserReportsByPostSlugId,
} from "./service/report.js";
import {
    getUserMutePreferences,
    muteUserByUsername,
} from "./service/muteUser.js";
import {
    getNotifications,
    markAllNotificationsAsRead,
} from "./service/notification.js";
import twilio from "twilio";
import { initializeValkey } from "./shared-backend/valkey.js";
import { createVoteBuffer } from "./service/voteBuffer.js";
import {
    consumeContentTranslationUserRateLimit,
    CONTENT_TRANSLATION_USER_RATE_LIMIT_SCRIPT,
    ENQUEUE_CONTENT_TRANSLATION_WORK_SCRIPT,
} from "./shared-backend/contentTranslationQueue.js";
import { createImportBuffer } from "./service/importBuffer.js";
import { createImportWorkerEventBridge } from "./service/importWorkerEventBridge.js";
import {
    createRealtimeEventOutboxBridge,
    fetchConversationAnalysisUpdatedEventForLatestViewSnapshot,
    fetchConversationRealtimeEventsAfterId,
    fetchRealtimeTopicEventsAfterId,
} from "./service/realtimeEventOutbox.js";
import { createUcanReplayGuard } from "./service/ucanReplayGuard.js";
import {
    parseRealtimeSubscriptionRequest,
    type RealtimeSubscriptionRequest,
    RealtimeSSEManager,
} from "./service/realtimeSSE.js";
import {
    addUserOrganizationMapping,
    createOrganization,
    archiveOrganization,
    getAllOrganizations,
    getOrganizationDetails,
    getOrganizationOptions,
    getOrganizationMembers,
    getOrganizationsByUsername,
    removeUserOrganizationMapping,
    updateOrganizationLocalization,
    updateOrganizationSlug,
} from "./service/administrator/organization.js";
import {
    archiveProject,
    createProject,
    getAllProjects,
    getProjectDetails,
    getProjectOptions,
    updateProject,
    updateProjectExternalOrganizationLocalization,
    updateProjectLanguageSettings,
    updateProjectSlug,
} from "./service/administrator/project.js";
import type {
    ConversationMultilingualSetting,
    DeviceIsKnownTrueLoginStatus,
} from "./shared/types/zod.js";
import type { DeviceLoginStatusInternal } from "./service/authUtil.js";
import {
    getAllTopics,
    getUserFollowedTopics,
    userFollowTopicByCode,
    userUnfollowTopicByCode,
} from "./service/topic.js";
import {
    getLanguagePreferences,
    updateLanguagePreferences,
} from "./service/language.js";
import {
    getAutoProvisionedDefaultLanguage,
    getImplicitDefaultDisplayLanguage,
} from "./service/projectLanguage.js";
import {
    ZodSupportedDisplayLanguageCodes,
    type SupportedDisplayLanguageCodes,
    type SupportedSpokenLanguageCodes,
} from "./shared/languages.js";
import { createDb } from "./shared-backend/db.js";
import {
    conversationContentTable,
    conversationTable,
    conversationTranslationTargetLanguageTable,
    deviceTable,
    organizationTable,
    projectContentTable,
    projectOrganizationOwnershipTable,
    projectTable,
    projectTranslationTargetLanguageTable,
} from "./shared-backend/schema.js";
import { and, eq, isNotNull, isNull } from "drizzle-orm";

type ContentTranslationResponse = z.infer<
    typeof Dto.contentTranslationResponse
>;
import {
    initializeGoogleCloudCredentials,
    type GoogleCloudCredentials,
} from "./shared-backend/googleCloudAuth.js";
import { nowZeroMs } from "./shared/util.js";
import {
    logActiveConversationBodyLimits,
    logConversationBodyLimitCompatibility,
} from "./service/conversationTextMaintenance.js";

server.register(fastifySensible);
server.register(fastifyAuth);
server.register(fastifyRateLimit, {
    global: false,
    hook: "preHandler",
});
server.register(fastifyCors, {
    origin: (origin, cb) => {
        if (config.NODE_ENV === "development") {
            cb(null, true);
            return;
        }
        if (origin === undefined) {
            // Same-origin request: browser omits Origin header for same-origin GET/HEAD.
            // Allow through — no CORS headers needed for same-origin.
            cb(null, true);
            return;
        }
        if (config.CORS_ORIGIN_LIST.includes(origin)) {
            cb(null, true);
            return;
        }
        cb(new Error("Not allowed"), false);
    },
});

// Register multipart plugin for file uploads (for CSV import)
server.register(fastifyMultipart, {
    limits: {
        fileSize: MAX_CSV_FILE_SIZE,
        files: 3,
    },
});

// Register SSE plugin for real-time notification streaming
// @fastify/sse has type compatibility issues with Fastify v5
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
await server.register(fastifySSE as any);

// Add schema validator and serializer
server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

const speciallyAuthorizedPhones: string[] =
    config.NODE_ENV === "production"
        ? []
        : config.SPECIALLY_AUTHORIZED_PHONES !== undefined &&
            config.SPECIALLY_AUTHORIZED_PHONES.length !== 0
          ? config.SPECIALLY_AUTHORIZED_PHONES.replace(/\s/g, "").split(",")
          : [];

const speciallyAuthorizedEmails: string[] =
    config.NODE_ENV === "production"
        ? []
        : config.SPECIALLY_AUTHORIZED_EMAILS !== undefined &&
            config.SPECIALLY_AUTHORIZED_EMAILS.length !== 0
          ? config.SPECIALLY_AUTHORIZED_EMAILS.replace(/\s/g, "")
                .split(",")
                .map((email) => normalizeEmail(email))
          : [];

const axiosVerificatorSvc: AxiosInstance = axios.create({
    baseURL: config.VERIFICATOR_SVC_BASE_URL,
});

const reacherBaseUrl = config.REACHER_BASE_URL;
const axiosReacher: AxiosInstance | undefined =
    reacherBaseUrl !== undefined
        ? axios.create({ baseURL: reacherBaseUrl })
        : undefined;
log.info(
    reacherBaseUrl !== undefined
        ? `[API] Reacher email verification enabled (URL: ${reacherBaseUrl})`
        : "[API] Reacher email verification disabled (REACHER_BASE_URL not set)",
);

const mustSendActualSms = config.NODE_ENV === "production";
const isImportDisabled = config.IMPORT_BUFFER_MAX_BATCH_SIZE === 0;
const maxdiffConnectorRateLimitConfig = {
    max: 10,
    timeWindow: 60 * 1000,
    groupId: "maxdiff-github-connector",
};
const githubWebhookRateLimitConfig = {
    max: 60,
    timeWindow: 60 * 1000,
    groupId: "maxdiff-github-webhook",
};
const CONTENT_TRANSLATION_USER_RATE_LIMIT_MAX = 20;
const CONTENT_TRANSLATION_USER_RATE_LIMIT_WINDOW_MS = 60 * 1000;

let twilioClient: twilio.Twilio | undefined;
if (mustSendActualSms) {
    if (
        config.TWILIO_AUTH_TOKEN === undefined ||
        config.TWILIO_ACCOUNT_SID === undefined ||
        config.TWILIO_SERVICE_SID === undefined
    ) {
        log.error("Twilio configuration must be set for SMS to be sent");
        process.exit(1);
    } else {
        twilioClient = twilio(
            config.TWILIO_ACCOUNT_SID,
            config.TWILIO_AUTH_TOKEN,
        );
    }
}

// GitHub integration: webhook secret and access token must both be set or both unset
const hasGitHubWebhookSecret = config.GITHUB_WEBHOOK_SECRET !== undefined;
const hasGitHubAccessToken = config.GITHUB_ACCESS_TOKEN !== undefined;
if (hasGitHubWebhookSecret !== hasGitHubAccessToken) {
    log.error(
        "GITHUB_WEBHOOK_SECRET and GITHUB_ACCESS_TOKEN must both be set or both be unset",
    );
    process.exit(1);
}

// axiosVerificatorSvc.interceptors.request.use((request) => {
//     log.info("Starting Request", JSON.stringify(request));
//     return request;
// });
// axiosVerificatorSvc.interceptors.response.use((response) => {
//     log.info("Response:", JSON.stringify(response));
//     return response;
// });

server.register(fastifySwagger, {
    openapi: {
        info: {
            title: "Agora Citizen Network",
            description: "Agora API",
            version: "1.0.0",
        },
        servers: [],
        security: [
            {
                BearerAuth: [],
            },
        ],
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: "http",
                    scheme: "bearer",
                },
            },
        },
    },
    transform: jsonSchemaTransform,
    // You can also create transform with custom skiplist of endpoints that should not be included in the specification:
    //
    // transform: createJsonSchemaTransform({
    //   skipList: [ '/documentation/static/*' ]
    // })
});

// Custom error handler
server.setErrorHandler((error: FastifyError, _request, reply) => {
    // Check if the error has a status code of 500
    if (error.statusCode === undefined || error.statusCode >= 500) {
        // Modify the response message for status code 500
        // ... by wrapping the original error with a generic error
        // For security sake, we don't want the frontend to know the exact nature of the internal errors
        const genericError = server.httpErrors.internalServerError();
        genericError.cause = error;
        reply.send(genericError);
    } else if (error.statusCode === 401) {
        const genericError = server.httpErrors.unauthorized();
        genericError.cause = error;
        reply.send(genericError);
    } else if (error.statusCode === 403) {
        const genericError = server.httpErrors.forbidden();
        genericError.cause = error;
        reply.send(genericError);
    } else {
        // For other status codes, forward the original error
        reply.send(error);
    }
});

// // Create and start a Light Node
// const node = await createLightNode({
//     defaultBootstrap: true,
//     networkConfig: {
//         clusterId: 1,
//         contentTopics: ["/agora/1/create-conversation/proto"],
//     },
// });
// await node.start();
// await node.waitForPeers([Protocols.LightPush]);

const db = await createDb(config, log);
logActiveConversationBodyLimits();
void logConversationBodyLimitCompatibility({ db });

function assertMaxdiffGitHubAllowed({
    userId,
    postAsOrganization,
}: {
    userId: string;
    postAsOrganization?: string;
}): void {
    const access = checkFeatureAccess({
        featureEnabled: true,
        isOrgOnly: config.IS_MAXDIFF_GITHUB_ORG_ONLY,
        allowedOrgs: config.MAXDIFF_GITHUB_ALLOWED_ORGS,
        allowedUsers: config.MAXDIFF_GITHUB_ALLOWED_USERS,
        postAsOrganization:
            postAsOrganization !== undefined && postAsOrganization !== "",
        organizationName: postAsOrganization ?? "",
        userId,
    });

    if (access.allowed) {
        return;
    }

    switch (access.reason) {
        case "disabled":
            throw server.httpErrors.serviceUnavailable(
                "MaxDiff GitHub connector is currently unavailable",
            );
        case "org_required":
            throw server.httpErrors.forbidden(
                "MaxDiff GitHub connector is restricted to organization conversations",
            );
        case "org_not_in_whitelist":
            throw server.httpErrors.forbidden(
                "This organization is not allowed to use the MaxDiff GitHub connector",
            );
        case "user_not_in_whitelist":
            throw server.httpErrors.forbidden(
                "This user is not allowed to use the MaxDiff GitHub connector",
            );
    }
}

async function assertMaxdiffGitHubAllowedForConversation({
    conversationSlugId,
    userId,
}: {
    conversationSlugId: string;
    userId: string;
}): Promise<void> {
    const rows = await db
        .select({
            organizationName: organizationTable.slug,
        })
        .from(conversationTable)
        .innerJoin(
            projectOrganizationOwnershipTable,
            and(
                eq(
                    projectOrganizationOwnershipTable.projectId,
                    conversationTable.projectId,
                ),
                isNull(projectOrganizationOwnershipTable.deletedAt),
            ),
        )
        .innerJoin(
            organizationTable,
            eq(
                organizationTable.id,
                projectOrganizationOwnershipTable.organizationId,
            ),
        )
        .where(
            and(
                eq(conversationTable.slugId, conversationSlugId),
                isNull(organizationTable.autoProvisionedForUserId),
                isNull(organizationTable.deletedAt),
            ),
        )
        .limit(1);

    assertMaxdiffGitHubAllowed({
        userId,
        postAsOrganization: rows[0]?.organizationName ?? undefined,
    });
}

async function getContentTranslationAvailabilityForConversation({
    database = db,
    conversationSlugId,
    targetLanguageCode,
}: {
    database?: PostgresDatabase;
    conversationSlugId: string;
    targetLanguageCode: SupportedDisplayLanguageCodes;
}): Promise<{
    isAllowed: boolean;
    multilingualSetting: ConversationMultilingualSetting;
    sourceLanguageCode: SupportedSpokenLanguageCodes | null;
}> {
    const rows = await database
        .select({
            dynamicTranslationEnabled:
                conversationTable.dynamicTranslationEnabled,
            languageSettingsSource: conversationTable.languageSettingsSource,
            projectId: conversationTable.projectId,
            sourceLanguageCode: conversationContentTable.sourceLanguageCode,
            targetLanguageCode:
                conversationTranslationTargetLanguageTable.languageCode,
        })
        .from(conversationTable)
        .innerJoin(
            conversationContentTable,
            eq(conversationContentTable.id, conversationTable.currentContentId),
        )
        .leftJoin(
            conversationTranslationTargetLanguageTable,
            and(
                eq(
                    conversationTranslationTargetLanguageTable.conversationId,
                    conversationTable.id,
                ),
                isNull(conversationTranslationTargetLanguageTable.deletedAt),
            ),
        )
        .where(
            and(
                eq(conversationTable.slugId, conversationSlugId),
                eq(conversationTable.isImporting, false),
                isNotNull(conversationTable.currentContentId),
            ),
        );

    const firstRow = rows.at(0);
    if (firstRow === undefined) {
        throw server.httpErrors.notFound(
            "Content translation subject not found",
        );
    }
    const inheritedLanguageSettings =
        firstRow.languageSettingsSource === "project_inherited"
            ? await getProjectLanguageSettings({
                  db: database,
                  projectId: firstRow.projectId,
              })
            : undefined;
    const multilingualSetting: ConversationMultilingualSetting =
        inheritedLanguageSettings !== undefined
            ? normalizeInheritedConversationMultilingualSettings({
                  languageSettings: inheritedLanguageSettings,
              })
            : {
                  dynamicTranslationEnabled: firstRow.dynamicTranslationEnabled,
                  additionalLanguageCodes: rows.flatMap((row) =>
                      row.targetLanguageCode === null
                          ? []
                          : [row.targetLanguageCode],
                  ),
              };
    const detectedTargetLanguageCode = sourceLanguageToDisplayLanguage({
        sourceLanguageCode: firstRow.sourceLanguageCode,
    });
    const targetLanguagePolicy =
        inheritedLanguageSettings !== undefined
            ? getProjectTranslationTargetLanguagePolicy({
                  languageSettings: inheritedLanguageSettings,
              })
            : getConversationOverrideTranslationTargetLanguagePolicy({
                  multilingualSettings: {
                      dynamicTranslationEnabled:
                          multilingualSetting.dynamicTranslationEnabled,
                      additionalLanguageCodes:
                          multilingualSetting.additionalLanguageCodes.filter(
                              (languageCode) =>
                                  languageCode !== detectedTargetLanguageCode,
                          ),
                  },
                  detectedTargetLanguageCode,
              });
    const translationAllowed =
        targetLanguagePolicy.dynamicTranslationEnabled &&
        isConfiguredTranslationTargetLanguage({
            policy: targetLanguagePolicy,
            targetLanguageCode,
        });
    return {
        isAllowed: translationAllowed,
        multilingualSetting,
        sourceLanguageCode: firstRow.sourceLanguageCode,
    };
}

async function getPreferredContentTranslationAvailabilityForConversation({
    database = db,
    conversationSlugId,
    displayLanguage,
}: {
    database?: PostgresDatabase;
    conversationSlugId: string;
    displayLanguage: SupportedDisplayLanguageCodes;
}): Promise<{
    targetLanguageCode: SupportedDisplayLanguageCodes;
    isAllowed: boolean;
}> {
    const displayLanguageAvailability =
        await getContentTranslationAvailabilityForConversation({
            database,
            conversationSlugId,
            targetLanguageCode: displayLanguage,
        });
    return {
        targetLanguageCode: displayLanguage,
        isAllowed: displayLanguageAvailability.isAllowed,
    };
}

async function getOpinionDisplayContentPreferencesForConversation({
    database = db,
    conversationSlugId,
    personalizationUserId,
    headerDisplayLanguage,
}: {
    database?: PostgresDatabase;
    conversationSlugId: string;
    personalizationUserId: string | undefined;
    headerDisplayLanguage: SupportedDisplayLanguageCodes;
}) {
    const languagePreferences =
        personalizationUserId === undefined
            ? {
                  displayLanguage: headerDisplayLanguage,
                  spokenLanguages: [headerDisplayLanguage],
              }
            : await getLanguagePreferences({
                  db: database,
                  userId: personalizationUserId,
                  request: {
                      currentDisplayLanguage: headerDisplayLanguage,
                  },
              });
    const preferredContentTranslation =
        await getPreferredContentTranslationAvailabilityForConversation({
            database,
            conversationSlugId,
            displayLanguage: languagePreferences.displayLanguage,
        });

    return {
        displayLanguage: languagePreferences.displayLanguage,
        targetLanguage: preferredContentTranslation.targetLanguageCode,
        spokenLanguages: languagePreferences.spokenLanguages,
        translationAllowed: preferredContentTranslation.isAllowed,
    };
}

async function getContentTranslationAvailabilityForProject({
    projectSlug,
    targetLanguageCode,
}: {
    projectSlug: string;
    targetLanguageCode: SupportedDisplayLanguageCodes;
}): Promise<{
    isAllowed: boolean;
    multilingualSetting: ConversationMultilingualSetting;
}> {
    const rows = await db
        .select({
            dynamicTranslationEnabled: projectTable.dynamicTranslationEnabled,
            sourceLanguageCode: projectContentTable.sourceLanguageCode,
            targetLanguageCode:
                projectTranslationTargetLanguageTable.languageCode,
        })
        .from(projectTable)
        .innerJoin(
            projectContentTable,
            eq(projectContentTable.id, projectTable.currentContentId),
        )
        .leftJoin(
            projectTranslationTargetLanguageTable,
            and(
                eq(
                    projectTranslationTargetLanguageTable.projectId,
                    projectTable.id,
                ),
                isNull(projectTranslationTargetLanguageTable.deletedAt),
            ),
        )
        .where(
            and(
                eq(projectTable.slug, projectSlug),
                eq(projectTable.directoryVisibility, "listed"),
                isNull(projectTable.deletedAt),
                isNull(projectContentTable.deletedAt),
            ),
        );

    const firstRow = rows.at(0);
    if (firstRow === undefined) {
        throw server.httpErrors.notFound(
            "Content translation subject not found",
        );
    }
    const multilingualSetting: ConversationMultilingualSetting = {
        dynamicTranslationEnabled: firstRow.dynamicTranslationEnabled,
        additionalLanguageCodes: rows.flatMap((row) =>
            row.targetLanguageCode === null ? [] : [row.targetLanguageCode],
        ),
    };
    const targetLanguagePolicy = getProjectTranslationTargetLanguagePolicy({
        languageSettings: {
            dynamicTranslationEnabled: firstRow.dynamicTranslationEnabled,
            defaultLanguageCode:
                sourceLanguageToDisplayLanguage({
                    sourceLanguageCode: firstRow.sourceLanguageCode,
                }) ?? getImplicitDefaultDisplayLanguage(),
            targetLanguageCodes: multilingualSetting.additionalLanguageCodes,
        },
    });
    const translationAllowed =
        targetLanguagePolicy.dynamicTranslationEnabled &&
        isConfiguredTranslationTargetLanguage({
            policy: targetLanguagePolicy,
            targetLanguageCode,
        });
    return { isAllowed: translationAllowed, multilingualSetting };
}

// Validate S3 configuration if export feature is enabled
if (config.EXPORT_CONVOS_ENABLED) {
    if (
        !config.EXPORT_CONVOS_AWS_S3_BUCKET_NAME ||
        !config.EXPORT_CONVOS_AWS_S3_REGION
    ) {
        log.error(
            "[API] S3 configuration missing but export feature is enabled",
        );
        process.exit(1);
    }
    try {
        await validateS3Access({
            bucketName: config.EXPORT_CONVOS_AWS_S3_BUCKET_NAME,
        });
    } catch (error) {
        log.error(error, "[API] Failed to validate S3 access");
        process.exit(1);
    }
}

// Initialize Google Cloud Translation credentials (optional)
let googleCloudCredentials: GoogleCloudCredentials | undefined = undefined;
if (
    config.GOOGLE_CLOUD_SERVICE_ACCOUNT_AWS_SECRET_KEY !== undefined ||
    config.GOOGLE_APPLICATION_CREDENTIALS !== undefined
) {
    try {
        googleCloudCredentials = await initializeGoogleCloudCredentials({
            googleCloudServiceAccountAwsSecretKey:
                config.GOOGLE_CLOUD_SERVICE_ACCOUNT_AWS_SECRET_KEY,
            awsSecretRegion: config.AWS_SECRET_REGION,
            googleApplicationCredentialsPath:
                config.GOOGLE_APPLICATION_CREDENTIALS,
            googleCloudTranslationLocation:
                config.GOOGLE_CLOUD_TRANSLATION_LOCATION,
            googleCloudTranslationEndpoint:
                config.GOOGLE_CLOUD_TRANSLATION_ENDPOINT,
            log,
        });
        log.info("[API] Google Cloud Translation initialized successfully");
    } catch (error) {
        log.error(
            error,
            "[API] Failed to initialize Google Cloud Translation - translations will be disabled",
        );
        // Continue without translations - this is not a fatal error
    }
} else {
    log.info(
        "[API] Google Cloud Translation not configured - translations disabled",
    );
}

// Initialize Valkey (optional - for vote buffer persistence and UCAN replay protection)
const queueValkeyRef: ValkeyRef = {
    current: await initializeValkey({
        valkeyUrl: config.QUEUE_VALKEY_URL,
        log,
        type: "Queue",
    }),
};
const contentTranslationQueueScript = new Script(
    ENQUEUE_CONTENT_TRANSLATION_WORK_SCRIPT,
);
const contentTranslationUserRateLimitScript = new Script(
    CONTENT_TRANSLATION_USER_RATE_LIMIT_SCRIPT,
);

let queueValkeyReconnectInterval: NodeJS.Timeout | undefined;
let queueValkeyReconnectInProgress = false;

const getQueuePersistenceMode = (): string => {
    if (queueValkeyRef.current !== undefined) {
        return "Valkey";
    }

    if (config.QUEUE_VALKEY_URL !== undefined) {
        return "in-memory until Valkey reconnects";
    }

    return "in-memory only";
};

// Initialize UCAN replay guard (prevents token replay attacks)
const ucanReplayGuard = createUcanReplayGuard({ valkeyRef: queueValkeyRef });

if (queueValkeyRef.current === undefined) {
    if (config.QUEUE_VALKEY_URL === undefined) {
        log.warn(
            "[API] Valkey not configured — UCAN replay protection uses in-memory store. " +
                "This provides single-instance protection only. " +
                "Set QUEUE_VALKEY_URL for cross-instance replay prevention.",
        );
    } else {
        log.warn(
            "[API] Queue Valkey unavailable on startup — using in-memory fallback temporarily and retrying in background",
        );

        queueValkeyReconnectInterval = setInterval(() => {
            if (
                queueValkeyRef.current !== undefined ||
                queueValkeyReconnectInProgress
            ) {
                return;
            }

            queueValkeyReconnectInProgress = true;
            void (async () => {
                const nextValkey = await initializeValkey({
                    valkeyUrl: config.QUEUE_VALKEY_URL,
                    log,
                    type: "Queue",
                });

                if (nextValkey === undefined) {
                    return;
                }

                try {
                    const syncedReplayTokenCount =
                        await ucanReplayGuard.syncToValkey({
                            valkey: nextValkey,
                        });
                    queueValkeyRef.current = nextValkey;
                    log.info(
                        `[API] Queue Valkey connected in background — replay guard and buffers now use Valkey (migrated ${String(syncedReplayTokenCount)} replay tokens)`,
                    );

                    if (queueValkeyReconnectInterval !== undefined) {
                        clearInterval(queueValkeyReconnectInterval);
                        queueValkeyReconnectInterval = undefined;
                    }
                } catch (error) {
                    nextValkey.close();
                    throw error;
                }
            })()
                .catch((error: unknown) => {
                    log.error(
                        error,
                        "[API] Queue Valkey reconnected but replay token migration failed",
                    );
                })
                .finally(() => {
                    queueValkeyReconnectInProgress = false;
                });
        }, 5000);
        queueValkeyReconnectInterval.unref();
    }
}
log.info(
    `[API] UCAN replay guard initialized — mode: ${
        config.QUEUE_VALKEY_URL === undefined
            ? "in-memory (single-instance only)"
            : getQueuePersistenceMode()
    }`,
);

// Initialize Notification SSE Manager for real-time notifications
const realtimeSSEManager = new RealtimeSSEManager();
realtimeSSEManager.initialize();

const realtimeEventOutboxBridge = createRealtimeEventOutboxBridge({
    db,
    config,
    log,
    realtimeSSEManager,
});
try {
    await realtimeEventOutboxBridge.start();
} catch (error) {
    log.error(error, "[RealtimeOutbox] Failed to start realtime DB listener");
}

// Periodic engagement ranking check for "Following" tab.
// Every 60s, computes top 10 engagement slug IDs and broadcasts
// "popular_conversation" to all clients if the ranking changed.
let cachedTopEngagementSlugIds: string[] = [];
const popularConversationCheckInterval = setInterval(() => {
    void (async () => {
        try {
            const topSlugIds = await feedService.getTopEngagementSlugIds({
                db,
            });
            const changed =
                topSlugIds.length !== cachedTopEngagementSlugIds.length ||
                topSlugIds.some(
                    (id, i) => id !== cachedTopEngagementSlugIds[i],
                );
            if (changed) {
                cachedTopEngagementSlugIds = topSlugIds;
                realtimeSSEManager.broadcastToAll({
                    event: "popular_conversation",
                    data: { topConversationSlugIdList: topSlugIds },
                });
            }
        } catch (error) {
            log.error(error, "[API] Popular conversation check failed");
        }
    })();
}, 60_000);
popularConversationCheckInterval.unref();

// Initialize VoteBuffer (batches votes to reduce DB contention)
const voteBuffer = createVoteBuffer({
    db,
    valkeyRef: queueValkeyRef,
    flushIntervalMs: config.VOTE_BUFFER_FLUSH_INTERVAL_MS,
    valkeyBatchLimit: config.VOTE_BUFFER_VALKEY_BATCH_LIMIT,
    realtimeSSEManager,
});
log.info(
    `[API] Vote buffer initialized (flush interval: ${String(config.VOTE_BUFFER_FLUSH_INTERVAL_MS)}ms, batch limit: ${String(config.VOTE_BUFFER_VALKEY_BATCH_LIMIT)}, persistence: ${getQueuePersistenceMode()})`,
);

// Initialize SQL-backed export worker.
const exportWorker = createExportWorker({
    db,
    realtimeSSEManager,
});
log.info("[API] Export worker initialized (SQL queue)");

// Initialize import queue producer. Import consumption runs in services/import-worker.
const importBuffer = createImportBuffer({
    valkeyRef: queueValkeyRef,
});
log.info(
    `[API] Import queue producer initialized (persistence: ${getQueuePersistenceMode()})`,
);

const importWorkerEventBridge = createImportWorkerEventBridge({
    valkeyRef: queueValkeyRef,
    realtimeSSEManager,
    pollIntervalMs: config.IMPORT_BUFFER_FLUSH_INTERVAL_MS,
    maxBatchSize: config.IMPORT_BUFFER_MAX_BATCH_SIZE,
});
log.info("[API] Import worker event bridge initialized");

interface ExpectedDeviceStatus {
    userId?: string;
    isKnown?: boolean;
    isLoggedIn?: boolean;
    isRegistered?: boolean;
    isGuestOrLoggedIn?: boolean;
}

interface OptionsVerifyUcan {
    expectedDeviceStatus?: ExpectedDeviceStatus;
}

interface ExpectedKnownDeviceStatus {
    userId?: string;
    isLoggedIn?: boolean;
    isRegistered?: boolean;
    isGuestOrLoggedIn?: boolean; // lowest precedence
}

interface OptionsVerifyUcanKnownDevice {
    expectedKnownDeviceStatus?: ExpectedKnownDeviceStatus;
}

const SERVER_URL =
    config.NODE_ENV === "production"
        ? config.SERVER_URL_PROD
        : config.NODE_ENV === "staging"
          ? config.SERVER_URL_STAGING
          : config.SERVER_URL_DEV;

const SERVER_DID =
    config.NODE_ENV === "production"
        ? config.SERVER_DID_PROD
        : config.NODE_ENV === "staging"
          ? config.SERVER_DID_STAGING
          : config.SERVER_DID_DEV;

function getAuthHeader(request: FastifyRequest) {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        throw server.httpErrors.unauthorized("No UCAN in Bearer token");
    } else {
        return authHeader;
    }
}

function getEncodedUcan(request: FastifyRequest): string {
    const authHeader = getAuthHeader(request);
    const encodedUcan = authHeader.substring(7, authHeader.length);
    return encodedUcan;
}

interface VerifyUcanAndDeviceStatusReturn {
    didWrite: string;
    deviceStatus: DeviceLoginStatusInternal;
}
interface VerifyUcanKnownDeviceReturn {
    didWrite: string;
    deviceStatus: DeviceIsKnownTrueLoginStatus;
}

interface VerifyUcanReturn {
    didWrite: string;
}
async function verifyUcan(request: FastifyRequest): Promise<VerifyUcanReturn> {
    const encodedUcan = getEncodedUcan(request);

    const { scheme, hierPart } = httpUrlToResourcePointer(
        new URL(request.originalUrl, SERVER_URL),
    );

    const parsedUcan = ucans.parse(encodedUcan);
    const rootIssuerDid = parsedUcan.payload.iss;
    const result = await ucans.verify(encodedUcan, {
        audience: SERVER_DID,
        isRevoked: () =>
            new Promise((resolve) => {
                resolve(false);
            }), // users' generated UCANs are short-lived action-specific one-time token so the revocation feature is unnecessary
        requiredCapabilities: [
            {
                capability: {
                    with: { scheme, hierPart },
                    can: httpMethodToAbility(request.method),
                },
                rootIssuer: rootIssuerDid,
            },
        ],
    });
    if (!result.ok) {
        log.error(
            `UCAN verification failed - issuer: ${rootIssuerDid}, SERVER_DID: ${SERVER_DID}, scheme: ${scheme}, hierPart: ${hierPart}, result: ${JSON.stringify(result)}`,
        );
        if (Array.isArray(result.error)) {
            result.error.forEach((err, i) => {
                log.error(
                    `UCAN verification error ${String(i)}: ${err instanceof Error ? `${err.name} - ${err.message}` : String(err)}`,
                );
            });
        }
        throw server.httpErrors.createError(
            401,
            "UCAN validation failed",
            new AggregateError(result.error),
        );
    }

    // Replay attack protection: reject tokens that have already been used.
    const isReplay = await ucanReplayGuard.checkAndMark({
        encodedUcan,
        expiryUnix: parsedUcan.payload.exp,
        issuerDid: rootIssuerDid,
    });
    if (isReplay) {
        log.warn(
            { didWrite: rootIssuerDid },
            "[UCAN] Replay attack detected — token already used",
        );
        throw server.httpErrors.unauthorized("UCAN already used");
    }

    return {
        didWrite: rootIssuerDid,
    };
}

async function verifyUcanAndDeviceStatus(
    db: PostgresDatabase,
    request: FastifyRequest,
    options?: OptionsVerifyUcan,
): Promise<VerifyUcanAndDeviceStatusReturn> {
    const defaultOptions = {
        expectedDeviceStatus: {
            isLoggedIn: true,
            isKnown: true,
            isRegistered: true,
            isGuestOrLoggedIn: false,
        },
    };
    let actualOptions = options;
    actualOptions ??= defaultOptions;
    const { didWrite } = await verifyUcan(request);
    const now = nowZeroMs();
    const deviceStatus = await authUtilService.getDeviceStatus({
        db,
        didWrite,
        now,
    });
    if (
        actualOptions.expectedDeviceStatus?.isKnown !== undefined &&
        actualOptions.expectedDeviceStatus.isKnown !== deviceStatus.isKnown
    ) {
        throw server.httpErrors.unauthorized(
            `[${didWrite}] is expected to have 'isKnown=${actualOptions.expectedDeviceStatus.isKnown.toString()}' but has 'isKnown=${deviceStatus.isKnown.toString()}'`,
        );
    } else if (
        actualOptions.expectedDeviceStatus?.isRegistered !== undefined &&
        actualOptions.expectedDeviceStatus.isRegistered !==
            deviceStatus.isRegistered
    ) {
        throw server.httpErrors.unauthorized(
            `[${didWrite}] is expected to have 'isRegistered=${actualOptions.expectedDeviceStatus.isRegistered.toString()}' but has 'isRegistered=${deviceStatus.isRegistered.toString()}'`,
        );
    } else if (
        actualOptions.expectedDeviceStatus?.isLoggedIn !== undefined &&
        actualOptions.expectedDeviceStatus.isLoggedIn !==
            deviceStatus.isLoggedIn
    ) {
        throw server.httpErrors.unauthorized(
            `[${didWrite}] is expected to have 'isLoggedIn=${actualOptions.expectedDeviceStatus.isLoggedIn.toString()}' but has 'isLoggedIn=${deviceStatus.isLoggedIn.toString()}'`,
        );
    } else if (
        actualOptions.expectedDeviceStatus?.userId !== undefined &&
        !deviceStatus.isKnown
    ) {
        throw server.httpErrors.forbidden(
            `[${didWrite}] is expected to have 'userId=${actualOptions.expectedDeviceStatus.userId}' but is unknown`,
        );
    } else if (
        actualOptions.expectedDeviceStatus?.userId !== undefined &&
        deviceStatus.isKnown &&
        actualOptions.expectedDeviceStatus.userId !== deviceStatus.userId
    ) {
        throw server.httpErrors.forbidden(
            `[${didWrite}] is expected to have 'userId=${actualOptions.expectedDeviceStatus.userId}' but has 'userId=${deviceStatus.userId}'`,
        );
    } else if (
        actualOptions.expectedDeviceStatus?.isGuestOrLoggedIn !== undefined &&
        actualOptions.expectedDeviceStatus.isGuestOrLoggedIn ===
            !(deviceStatus.isKnown && !deviceStatus.isRegistered) && // neither guest
        !(deviceStatus.isLoggedIn && deviceStatus.isRegistered) // nor logged-in
    ) {
        throw server.httpErrors.forbidden(
            `[${didWrite}] is expected to be either Guest or a Logged-In registered user but it is neither`,
        );
    }

    // Sliding window session refresh for registered users only.
    // Guests (isLoggedIn always false) are excluded — their identity is
    // tied to didWrite, not session expiry, so consultations lasting months are safe.
    // No extra DB read: sessionExpiry comes from getDeviceStatus() which already fetches it.
    if (deviceStatus.isLoggedIn) {
        const daysUntilExpiry =
            (deviceStatus.sessionExpiry.getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24);
        if (daysUntilExpiry < config.SESSION_REFRESH_THRESHOLD_DAYS) {
            const newExpiry = new Date(now);
            newExpiry.setDate(
                newExpiry.getDate() + config.SESSION_LIFETIME_DAYS,
            );
            // Fire-and-forget: non-blocking write, ~once per 45 days per user
            db.update(deviceTable)
                .set({ sessionExpiry: newExpiry, updatedAt: now })
                .where(eq(deviceTable.didWrite, didWrite))
                .then(() => {
                    log.info(
                        { didWrite },
                        "[Session] Refreshed session expiry",
                    );
                })
                .catch((err: unknown) => {
                    log.error(
                        err,
                        "[Session] Failed to refresh session expiry",
                    );
                });
        }
    }

    return {
        didWrite: didWrite,
        deviceStatus: deviceStatus,
    };
}

// Validates the UCAN and gets device status without enforcing any status
// requirements. Use for endpoints that serve both known and unknown devices
// (e.g. public pages with optional personalization).
// When no auth header is present, returns an unauthenticated response with
// didWrite undefined and isKnown: false.
type VerifyUcanOptionalAuthReturn =
    | {
          didWrite: string;
          deviceStatus: DeviceLoginStatusInternal;
      }
    | {
          didWrite: undefined;
          deviceStatus: Extract<DeviceLoginStatusInternal, { isKnown: false }>;
      };

function canUseAuthenticatedRealtimeStream(
    deviceStatus: DeviceLoginStatusInternal,
): deviceStatus is Extract<DeviceLoginStatusInternal, { isKnown: true }> {
    return (
        deviceStatus.isKnown &&
        (!deviceStatus.isRegistered || deviceStatus.isLoggedIn)
    );
}

async function verifyUcanOptionalAuth(
    db: PostgresDatabase,
    request: FastifyRequest,
): Promise<VerifyUcanOptionalAuthReturn> {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        return {
            didWrite: undefined,
            deviceStatus: {
                isKnown: false,
                isLoggedIn: false,
                isRegistered: false,
                credentials: { email: null, phone: null, rarimo: null },
            },
        };
    }
    return await verifyUcanAndDeviceStatus(db, request, {
        expectedDeviceStatus: undefined,
    });
}

function getRequestDisplayLanguage({
    request,
}: {
    request: FastifyRequest;
}): SupportedDisplayLanguageCodes {
    const parsedHeaderDisplayLanguage =
        ZodSupportedDisplayLanguageCodes.safeParse(
            request.headers["accept-language"],
        );
    return parsedHeaderDisplayLanguage.success
        ? parsedHeaderDisplayLanguage.data
        : "en";
}

async function getRankingItemDisplayPreferences({
    request,
    conversationSlugId,
}: {
    request: FastifyRequest;
    conversationSlugId: string;
}): Promise<RankingItemDisplayPreferences> {
    const { deviceStatus } = await verifyUcanOptionalAuth(db, request);
    const headerDisplayLanguage = getRequestDisplayLanguage({ request });
    const languagePreferences = deviceStatus.isKnown
        ? await getLanguagePreferences({
              db,
              userId: deviceStatus.userId,
              request: {
                  currentDisplayLanguage: headerDisplayLanguage,
              },
          })
        : {
              displayLanguage: headerDisplayLanguage,
              spokenLanguages: [headerDisplayLanguage],
          };
    const preferredContentTranslation =
        await getPreferredContentTranslationAvailabilityForConversation({
            conversationSlugId,
            displayLanguage: languagePreferences.displayLanguage,
        });
    return {
        displayLanguage: languagePreferences.displayLanguage,
        targetLanguage: preferredContentTranslation.targetLanguageCode,
        spokenLanguages: languagePreferences.spokenLanguages,
        translationAllowed: preferredContentTranslation.isAllowed,
    };
}

async function sendLatestSubscribedConversationAnalysisEvent({
    reply,
    conversationSlugId,
}: {
    reply: FastifyReply;
    conversationSlugId: string | undefined;
}): Promise<void> {
    if (conversationSlugId === undefined) {
        return;
    }

    try {
        const data =
            await fetchConversationAnalysisUpdatedEventForLatestViewSnapshot({
                db,
                conversationSlugId,
            });
        if (data === undefined) {
            return;
        }

        await realtimeSSEManager.sendToConnection({
            reply,
            id: undefined,
            event: "conversation_analysis_updated",
            data,
        });
    } catch (error) {
        log.error(
            error,
            `[RealtimeSSE] Failed to send latest analysis event conversationSlugId=${conversationSlugId}`,
        );
    }
}

async function replaySubscribedRealtimeEvents({
    reply,
    subscription,
}: {
    reply: FastifyReply;
    subscription: RealtimeSubscriptionRequest;
}): Promise<void> {
    if (reply.sse.lastEventId === null) {
        return;
    }

    const lastEventId = Number(reply.sse.lastEventId);
    if (!Number.isSafeInteger(lastEventId) || lastEventId <= 0) {
        return;
    }

    try {
        let nextLastEventId = lastEventId;
        let replayedEventCount = 0;
        while (replayedEventCount < REALTIME_REPLAY_MAX_EVENTS) {
            const events = await fetchSubscribedRealtimeEventsAfterId({
                subscription,
                lastEventId: nextLastEventId,
            });
            if (events.length === 0) {
                return;
            }

            for (const event of events) {
                await realtimeSSEManager.sendToConnection({
                    reply,
                    id: event.id,
                    event: event.event,
                    data: event.data,
                });
                nextLastEventId = event.id;
                replayedEventCount += 1;
            }

            if (events.length < REALTIME_REPLAY_BATCH_LIMIT) {
                return;
            }
        }

        log.warn(
            `[RealtimeSSE] Replay event cap reached topics=${subscription.topics.join(",")} lastEventId=${String(lastEventId)} maxEvents=${String(REALTIME_REPLAY_MAX_EVENTS)}`,
        );
    } catch (error) {
        log.error(
            error,
            `[RealtimeSSE] Failed to replay events topics=${subscription.topics.join(",")} lastEventId=${String(lastEventId)}`,
        );
    }
}

async function fetchSubscribedRealtimeEventsAfterId({
    subscription,
    lastEventId,
}: {
    subscription: RealtimeSubscriptionRequest;
    lastEventId: number;
}): ReturnType<typeof fetchRealtimeTopicEventsAfterId> {
    const [conversationEvents, topicEvents] = await Promise.all([
        subscription.conversationSlugId === undefined
            ? []
            : fetchConversationRealtimeEventsAfterId({
                  db,
                  conversationSlugId: subscription.conversationSlugId,
                  lastEventId,
                  limit: REALTIME_REPLAY_BATCH_LIMIT,
              }),
        fetchRealtimeTopicEventsAfterId({
            db,
            topics: subscription.topics,
            lastEventId,
            limit: REALTIME_REPLAY_BATCH_LIMIT,
        }),
    ]);

    const eventsById = new Map<number, (typeof topicEvents)[number]>();
    for (const event of [...conversationEvents, ...topicEvents]) {
        eventsById.set(event.id, event);
    }

    return Array.from(eventsById.values())
        .sort((first, second) => first.id - second.id)
        .slice(0, REALTIME_REPLAY_BATCH_LIMIT);
}

// always return userId !== undefined
async function verifyUcanAndKnownDeviceStatus(
    db: PostgresDatabase,
    request: FastifyRequest,
    options?: OptionsVerifyUcanKnownDevice,
): Promise<VerifyUcanKnownDeviceReturn> {
    const defaultOptions = {
        expectedDeviceStatus: {
            isKnown: true,
            isRegistered: true,
            isLoggedIn: true,
            isGuestOrLoggedIn: false,
        },
    };
    let actualOptions: OptionsVerifyUcan;
    if (options?.expectedKnownDeviceStatus !== undefined) {
        actualOptions = {
            expectedDeviceStatus: {
                isKnown: true,
                ...options.expectedKnownDeviceStatus,
            },
        };
    } else {
        actualOptions = defaultOptions;
    }
    const { didWrite, deviceStatus } = await verifyUcanAndDeviceStatus(
        db,
        request,
        actualOptions,
    );
    if (!deviceStatus.isKnown) {
        log.error(
            "The error below is unexpected, it should have been checked already by `verifyUcanAndDeviceStatus`",
        );
        throw server.httpErrors.unauthorized(
            `[${didWrite}] is expected to be a known device`,
        );
    }
    return {
        didWrite,
        deviceStatus,
    };
}

const apiVersion = "v1";
const REALTIME_REPLAY_BATCH_LIMIT = 100;
const REALTIME_REPLAY_MAX_EVENTS = 1_000;
const GITHUB_WEBHOOK_PATH = `/api/${apiVersion}/webhook/github`;
const rawRequestBodies = new WeakMap<FastifyRequest, Buffer>();

type RawRequestBodyCaptureStream = Transform & {
    receivedEncodedLength: number;
};

function isRequestPath({
    request,
    path,
}: {
    request: FastifyRequest;
    path: string;
}): boolean {
    const requestUrl = new URL(request.originalUrl, SERVER_URL);
    return requestUrl.pathname === path;
}

function createRawRequestBodyCaptureStream({
    request,
    payload,
}: {
    request: FastifyRequest;
    payload: NodeJS.ReadableStream;
}): RawRequestBodyCaptureStream {
    const chunks: Buffer[] = [];

    const captureStream = Object.assign(
        new Transform({
            transform(chunk: Buffer, _encoding, callback) {
                chunks.push(chunk);
                captureStream.receivedEncodedLength += chunk.length;
                callback(null, chunk);
            },
            flush(callback) {
                rawRequestBodies.set(request, Buffer.concat(chunks));
                callback();
            },
        }),
        { receivedEncodedLength: 0 },
    );

    return payload.pipe(captureStream);
}

server.addHook("preParsing", (request, _reply, payload, done) => {
    if (!isRequestPath({ request, path: GITHUB_WEBHOOK_PATH })) {
        done(null, payload);
        return;
    }

    done(null, createRawRequestBodyCaptureStream({ request, payload }));
});

async function requireSiteOrgAdmin(request: FastifyRequest): Promise<string> {
    const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(db, request, {
        expectedKnownDeviceStatus: {
            isRegistered: true,
            isLoggedIn: true,
        },
    });
    const isOrgAdmin = await isSiteOrgAdminAccount({
        db,
        userId: deviceStatus.userId,
    });

    if (!isOrgAdmin) {
        throw server.httpErrors.unauthorized("User is not a site org admin");
    }

    return deviceStatus.userId;
}

function checkConversationExportEnabled(): void {
    if (!config.EXPORT_CONVOS_ENABLED) {
        throw server.httpErrors.serviceUnavailable(
            "Conversation export feature is currently disabled",
        );
    }
}

server.after(() => {
    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/auth/check-login-status`,
        schema: {
            response: { 200: checkLoginStatusResponse },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndDeviceStatus(
                db,
                request,
                {
                    expectedDeviceStatus: undefined,
                },
            );
            // if-else statements are just for typescript and the zod discriminated union thing
            if (deviceStatus.isKnown) {
                return {
                    loggedInStatus: {
                        isKnown: deviceStatus.isKnown,
                        isLoggedIn: deviceStatus.isLoggedIn,
                        isRegistered: deviceStatus.isRegistered,
                        userId: deviceStatus.userId,
                        credentials: deviceStatus.credentials,
                    },
                };
            } else {
                return {
                    loggedInStatus: {
                        isKnown: deviceStatus.isKnown,
                        isLoggedIn: deviceStatus.isLoggedIn,
                        isRegistered: deviceStatus.isRegistered,
                        credentials: deviceStatus.credentials,
                    },
                };
            }
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/auth/authenticate`,
        schema: {
            body: authenticateRequestBody,
            response: { 200: authenticate200 },
        },
        handler: async (request) => {
            // This endpoint is accessible without being logged in
            // this endpoint could be especially subject to attacks such as DDoS or man-in-the-middle (to associate their own DID instead of the legitimate user's ones for example)
            const { didWrite, deviceStatus } = await verifyUcanAndDeviceStatus(
                db,
                request,
                {
                    expectedDeviceStatus: undefined,
                },
            );
            // wrapper function for Typescript to be happy with the zod discriminated union type
            async function doAuthenticate(): Promise<AuthenticateResponse> {
                if (
                    deviceStatus.isLoggedIn &&
                    deviceStatus.credentials.phone !== null
                ) {
                    return {
                        success: false,
                        reason: "already_has_credential",
                    };
                }
                const userAgent =
                    request.headers["user-agent"] ?? "Unknown device";
                const now = nowZeroMs();

                // backend intentionally does NOT say whether it is a register or a login - in order to protect privacy and give no information to potential attackers
                return await authService.authenticateAttempt({
                    db,
                    now,
                    twilioClient,
                    twilioServiceSid: config.TWILIO_SERVICE_SID,
                    doUseTestCode:
                        !mustSendActualSms &&
                        speciallyAuthorizedPhones.includes(
                            request.body.phoneNumber,
                        ),
                    testCode: config.TEST_CODE,
                    authenticateRequestBody: request.body,
                    minutesBeforeSmsCodeExpiry:
                        config.MINUTES_BEFORE_SMS_OTP_EXPIRY,
                    didWrite,
                    throttleSmsSecondsInterval:
                        config.THROTTLE_SMS_SECONDS_INTERVAL,
                    // awsMailConf: awsMailConf,
                    userAgent: userAgent,
                    peppers: config.PEPPERS,
                });
            }
            return await doAuthenticate();
        },
    });

    // TODO: for now, there is no 2FA so when this returns true, it means the user has finished logging in/registering - but it will change
    // TODO: for now there is no way to communicate "isTrusted", it's set to true automatically - but it will change
    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/auth/phone/verify-otp`,
        schema: {
            body: verifyOtpReqBody,
            response: {
                200: verifyOtp200,
            },
        },
        handler: async (request) => {
            const { didWrite, deviceStatus } = await verifyUcanAndDeviceStatus(
                db,
                request,
                {
                    expectedDeviceStatus: undefined,
                },
            );
            async function doVerifyPhoneOtp(): Promise<VerifyOtp200> {
                if (
                    deviceStatus.isLoggedIn &&
                    deviceStatus.credentials.phone !== null
                ) {
                    return {
                        success: false,
                        reason: "already_has_credential",
                    };
                }
                const now = nowZeroMs();
                return await authService.verifyPhoneOtp({
                    db,
                    now,
                    maxAttempt: config.EMAIL_OTP_MAX_ATTEMPT_AMOUNT,
                    didWrite,
                    code: request.body.code,
                    phoneNumber: request.body.phoneNumber,
                    defaultCallingCode: request.body.defaultCallingCode,
                    twilioClient: twilioClient,
                    twilioServiceSid: config.TWILIO_SERVICE_SID,
                    peppers: config.PEPPERS,
                    sessionLifetimeDays: config.SESSION_LIFETIME_DAYS,
                    currentDisplayLanguage: getRequestDisplayLanguage({
                        request,
                    }),
                });
            }
            return await doVerifyPhoneOtp();
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/auth/email/authenticate`,
        schema: {
            body: authenticateEmailRequestBody,
            response: { 200: authenticateEmail200 },
        },
        handler: async (request) => {
            const { didWrite, deviceStatus } = await verifyUcanAndDeviceStatus(
                db,
                request,
                {
                    expectedDeviceStatus: undefined,
                },
            );
            async function doAuthenticateEmail(): Promise<AuthenticateEmailResponse> {
                if (
                    deviceStatus.isLoggedIn &&
                    deviceStatus.credentials.email !== null
                ) {
                    return {
                        success: false,
                        reason: "already_has_credential",
                    };
                }
                const userAgent =
                    request.headers["user-agent"] ?? "Unknown device";

                const parsedLang = ZodSupportedDisplayLanguageCodes.safeParse(
                    request.headers["accept-language"],
                );
                const headerLanguageCode: SupportedDisplayLanguageCodes =
                    parsedLang.success ? parsedLang.data : "en";
                const now = nowZeroMs();

                return await authService.authenticateEmailAttempt({
                    db,
                    now,
                    axiosReacher,
                    email: request.body.email,
                    isRequestingNewCode: request.body.isRequestingNewCode,
                    minutesBeforeEmailCodeExpiry:
                        config.MINUTES_BEFORE_EMAIL_OTP_EXPIRY,
                    didWrite,
                    throttleEmailSecondsInterval:
                        config.THROTTLE_EMAIL_SECONDS_INTERVAL,
                    doUseTestCode:
                        config.NODE_ENV !== "production" &&
                        speciallyAuthorizedEmails.includes(
                            normalizeEmail(request.body.email),
                        ),
                    testCode: config.TEST_CODE,
                    userAgent: userAgent,
                    headerLanguageCode,
                });
            }
            return await doAuthenticateEmail();
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/auth/email/verify-otp`,
        schema: {
            body: verifyEmailOtpReqBody,
            response: {
                200: verifyOtp200,
            },
        },
        handler: async (request) => {
            const { didWrite, deviceStatus } = await verifyUcanAndDeviceStatus(
                db,
                request,
                {
                    expectedDeviceStatus: undefined,
                },
            );
            async function doVerifyEmailOtp(): Promise<VerifyOtp200> {
                if (
                    deviceStatus.isLoggedIn &&
                    deviceStatus.credentials.email !== null
                ) {
                    return {
                        success: false,
                        reason: "already_has_credential",
                    };
                }
                const now = nowZeroMs();
                return await authService.verifyEmailOtp({
                    db,
                    now,
                    maxAttempt: config.EMAIL_OTP_MAX_ATTEMPT_AMOUNT,
                    didWrite,
                    code: request.body.code,
                    email: request.body.email,
                    sessionLifetimeDays: config.SESSION_LIFETIME_DAYS,
                    currentDisplayLanguage: getRequestDisplayLanguage({
                        request,
                    }),
                });
            }
            return await doVerifyEmailOtp();
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/auth/logout`,
        handler: async (request) => {
            const { didWrite } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isLoggedIn: true,
                        isRegistered: true,
                    },
                },
            );
            await authService.logout(db, didWrite);
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/conversation/fetch-recent`,
        schema: {
            body: Dto.fetchFeedRequest,
            response: {
                200: Dto.fetchFeedResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanOptionalAuth(db, request);
            return await feedService.fetchFeed({
                db: db,
                personalizationUserId: deviceStatus.isKnown
                    ? deviceStatus.userId
                    : undefined,
                baseImageServiceUrl: config.IMAGES_SERVICE_BASE_URL,
                sortAlgorithm: request.body.sortAlgorithm,
                currentDisplayLanguage: getRequestDisplayLanguage({ request }),
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/project/create-options/list`,
        schema: {
            body: Dto.getConversationCreateProjectOptionsRequest,
            response: {
                200: Dto.getConversationCreateProjectOptionsResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isLoggedIn: true,
                        isRegistered: true,
                    },
                },
            );

            return await getConversationCreateProjectOptions({
                db,
                userId: deviceStatus.userId,
                postAsOrganizationSlug: request.body.postAsOrganization,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/project/page/fetch`,
        schema: {
            body: Dto.fetchProjectPageRequest,
            response: {
                200: Dto.fetchProjectPageResponse,
            },
        },
        handler: async (request) => {
            return await projectPageService.fetchProjectPage({
                db,
                baseImageServiceUrl: config.IMAGES_SERVICE_BASE_URL,
                request: request.body,
                currentDisplayLanguage: getRequestDisplayLanguage({ request }),
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/project/page/activities/fetch`,
        schema: {
            body: Dto.fetchProjectPageActivitiesRequest,
            response: {
                200: Dto.fetchProjectPageActivitiesResponse,
            },
        },
        handler: async (request) => {
            return await projectPageService.fetchProjectPageActivities({
                db,
                request: request.body,
                currentDisplayLanguage: getRequestDisplayLanguage({ request }),
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/project/content/fetch`,
        schema: {
            body: Dto.projectContentFetchRequest,
            response: {
                200: Dto.projectContentFetchResponse,
            },
        },
        handler: async (request) => {
            const { didWrite } = await verifyUcan(request);
            const now = nowZeroMs();
            const userAgent = request.headers["user-agent"] ?? "Unknown device";
            const deviceStatus = await authUtilService.getDeviceStatus({
                db,
                didWrite,
                now,
            });
            const headerDisplayLanguage = getRequestDisplayLanguage({
                request,
            });
            const requesterUserId = deviceStatus.isKnown
                ? deviceStatus.userId
                : (
                      await authService.createGuestUser({
                          db,
                          didWrite,
                          now,
                          userAgent,
                          currentDisplayLanguage: headerDisplayLanguage,
                      })
                  ).userId;
            const languagePreferences = await getLanguagePreferences({
                db,
                userId: requesterUserId,
                request: {
                    currentDisplayLanguage: headerDisplayLanguage,
                },
            });
            const availability =
                await getContentTranslationAvailabilityForProject({
                    projectSlug: request.body.projectSlug,
                    targetLanguageCode: languagePreferences.displayLanguage,
                });
            const queueValkey = queueValkeyRef.current;
            const content =
                await contentTranslationService.requestProjectContentTranslation(
                    {
                        db,
                        valkey: queueValkey,
                        queueScript: contentTranslationQueueScript,
                        projectSlug: request.body.projectSlug,
                        sourceVersion: request.body.sourceVersion,
                        targetLanguageCode: languagePreferences.displayLanguage,
                        requestMode:
                            request.body.mode === "translated" &&
                            availability.isAllowed
                                ? request.body.requestMode
                                : "read_existing",
                        now,
                        log,
                        beforeQueueTranslationWork: async () => {
                            if (queueValkey === undefined) {
                                throw server.httpErrors.serviceUnavailable(
                                    "Content translation rate limiter is unavailable",
                                );
                            }
                            const rateLimit =
                                await consumeContentTranslationUserRateLimit({
                                    valkey: queueValkey,
                                    script: contentTranslationUserRateLimitScript,
                                    userId: requesterUserId,
                                    maxRequests:
                                        CONTENT_TRANSLATION_USER_RATE_LIMIT_MAX,
                                    windowMs:
                                        CONTENT_TRANSLATION_USER_RATE_LIMIT_WINDOW_MS,
                                });
                            if (!rateLimit.isAllowed) {
                                throw server.httpErrors.createError(
                                    429,
                                    `Content translation rate limit exceeded. Retry after ${String(Math.ceil(rateLimit.retryAfterMs / 1000))}s`,
                                );
                            }
                        },
                    },
                );
            if (content === undefined) {
                throw server.httpErrors.notFound("Project content not found");
            }
            return projectPageService.toProjectDisplayContent({
                content: content.content,
                mode: request.body.mode,
                translationAllowed: availability.isAllowed,
                displayLanguage: languagePreferences.displayLanguage,
                spokenLanguages: languagePreferences.spokenLanguages,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/project/conversation/fetch`,
        schema: {
            body: Dto.fetchProjectConversationPageRequest,
            response: {
                200: Dto.fetchProjectConversationPageResponse,
            },
        },
        handler: async (request) => {
            return await projectPageService.fetchProjectConversationPage({
                db,
                baseImageServiceUrl: config.IMAGES_SERVICE_BASE_URL,
                request: request.body,
                currentDisplayLanguage: getRequestDisplayLanguage({ request }),
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/moderation/conversation/create`,
        schema: {
            body: Dto.moderateReportPostRequest,
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isLoggedIn: true,
                        isRegistered: true,
                    },
                },
            );
            const isMod = await isSiteModeratorAccount({
                db: db,
                userId: deviceStatus.userId,
            });

            if (!isMod) {
                throw server.httpErrors.unauthorized(
                    "User is not a site moderator",
                );
            }

            await moderateByPostSlugId({
                db: db,
                postSlugId: request.body.conversationSlugId,
                moderationReason: request.body.moderationReason,
                moderationAction: request.body.moderationAction,
                moderationExplanation: request.body.moderationExplanation,
                userId: deviceStatus.userId,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/moderation/opinion/create`,
        schema: {
            body: Dto.moderateReportCommentRequest,
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isLoggedIn: true,
                        isRegistered: true,
                    },
                },
            );
            const { isAuthorized, isSiteModerator } =
                await canModerateConversationByOpinionSlugId({
                    db: db,
                    userId: deviceStatus.userId,
                    opinionSlugId: request.body.opinionSlugId,
                });

            if (!isAuthorized) {
                throw server.httpErrors.unauthorized(
                    "User is not authorized to moderate this conversation",
                );
            }

            if (!isSiteModerator && request.body.moderationAction === "hide") {
                throw server.httpErrors.forbidden(
                    "Only site moderators can hide opinions",
                );
            }

            await moderateByCommentSlugId({
                db: db,
                commentSlugId: request.body.opinionSlugId,
                moderationReason: request.body.moderationReason,
                moderationAction: request.body.moderationAction,
                moderationExplanation: request.body.moderationExplanation,
                userId: deviceStatus.userId,
                isSiteModerator,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/moderation/conversation/withdraw`,
        schema: {
            body: Dto.moderateCancelConversationReportRequest,
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isLoggedIn: true,
                        isRegistered: true,
                    },
                },
            );
            const isMod = await isSiteModeratorAccount({
                db: db,
                userId: deviceStatus.userId,
            });

            if (!isMod) {
                throw server.httpErrors.unauthorized(
                    "User is not a site moderator",
                );
            }

            await withdrawModerationReportByPostSlugId({
                db: db,
                postSlugId: request.body.conversationSlugId,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/moderation/opinion/withdraw`,
        schema: {
            body: Dto.moderateCancelOpinionReportRequest,
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isLoggedIn: true,
                        isRegistered: true,
                    },
                },
            );
            const { isAuthorized, isSiteModerator } =
                await canModerateConversationByOpinionSlugId({
                    db: db,
                    userId: deviceStatus.userId,
                    opinionSlugId: request.body.opinionSlugId,
                });

            if (!isAuthorized) {
                throw server.httpErrors.unauthorized(
                    "User is not authorized to moderate this conversation",
                );
            }

            await withdrawModerationReportByCommentSlugId({
                db: db,
                commentSlugId: request.body.opinionSlugId,
                isSiteModerator,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/moderation/conversation/get`,
        schema: {
            body: Dto.getConversationModerationStatusRequest,
            response: {
                200: Dto.getConversationModerationStatusResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isLoggedIn: true,
                        isRegistered: true,
                    },
                },
            );
            const isMod = await isSiteModeratorAccount({
                db: db,
                userId: deviceStatus.userId,
            });

            if (!isMod) {
                throw server.httpErrors.unauthorized(
                    "User is not a site moderator",
                );
            }

            return await getConversationModerationStatus({
                db: db,
                postSlugId: request.body.conversationSlugId,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/moderation/opinion/get`,
        schema: {
            body: Dto.getOpinionModerationStatusRequest,
            response: {
                200: Dto.getOpinionModerationStatusResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isLoggedIn: true,
                        isRegistered: true,
                    },
                },
            );
            const { isAuthorized } =
                await canModerateConversationByOpinionSlugId({
                    db: db,
                    userId: deviceStatus.userId,
                    opinionSlugId: request.body.opinionSlugId,
                });

            if (!isAuthorized) {
                throw server.httpErrors.unauthorized(
                    "User is not authorized to moderate this conversation",
                );
            }

            return await getOpinionModerationStatus({
                db: db,
                commentSlugId: request.body.opinionSlugId,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/topic/get-followed`,
        schema: {
            response: {
                200: Dto.getUserFollowedTopicCodesResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
                },
            );
            return await getUserFollowedTopics({
                db: db,
                userId: deviceStatus.userId,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/topic/follow`,
        schema: {
            body: Dto.userFollowTopicCodeRequest,
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
                },
            );

            await userFollowTopicByCode({
                db: db,
                topicCode: request.body.topicCode,
                userId: deviceStatus.userId,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/topic/unfollow`,
        schema: {
            body: Dto.userUnfollowTopicCodeRequest,
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
                },
            );

            await userUnfollowTopicByCode({
                db: db,
                topicCode: request.body.topicCode,
                userId: deviceStatus.userId,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/user/profile/get`,
        schema: {
            response: {
                200: Dto.getUserProfileResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
                },
            );
            return await getUserProfile({
                db: db,
                userId: deviceStatus.userId,
                baseImageServiceUrl: config.IMAGES_SERVICE_BASE_URL,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/premium-feature/access/check`,
        schema: {
            body: Dto.checkPremiumFeatureAccessRequest,
            response: {
                200: Dto.checkPremiumFeatureAccessResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isLoggedIn: true,
                        isRegistered: true,
                    },
                },
            );

            const subject =
                await premiumEntitlementService.getPremiumEntitlementSubjectForCreate(
                    {
                        db,
                        userId: deviceStatus.userId,
                        postAsOrganization: request.body.postAsOrganization,
                        autoProvisionedDefaultLanguage:
                            getAutoProvisionedDefaultLanguage({
                                storedUserDisplayLanguage: undefined,
                                currentDisplayLanguage:
                                    getRequestDisplayLanguage({
                                        request,
                                    }),
                            }),
                    },
                );

            return {
                hasAccess:
                    await premiumEntitlementService.hasPremiumFeatureAccess({
                        db,
                        subject,
                        feature: request.body.feature,
                        now: nowZeroMs(),
                    }),
            };
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/user/conversation/fetch`,
        schema: {
            body: Dto.fetchUserConversationsRequest,
            response: {
                200: Dto.fetchUserConversationsResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
                },
            );
            const conversationsMap = await getUserPosts({
                db: db,
                userId: deviceStatus.userId,
                lastPostSlugId: request.body.lastConversationSlugId,
                baseImageServiceUrl: config.IMAGES_SERVICE_BASE_URL,
                currentDisplayLanguage: getRequestDisplayLanguage({ request }),
                limit: 10,
            });
            return Array.from(conversationsMap.values());
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/user/opinion/fetch`,
        schema: {
            body: Dto.fetchUserOpinionsRequest,
            response: {
                200: Dto.fetchUserOpinionsResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
                },
            );
            return await getFilteredUserComments({
                db: db,
                userId: deviceStatus.userId,
                lastCommentSlugId: request.body.lastOpinionSlugId,
                baseImageServiceUrl: config.IMAGES_SERVICE_BASE_URL,
                limit: 10,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/user/vote/get-by-conversations`,
        schema: {
            body: Dto.getUserVotesByConversationsRequest,
            response: {
                200: Dto.getUserVotesByConversationsResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
                },
            );
            return await getUserVotesByConversations({
                db: db,
                postSlugIdList: request.body.conversationSlugIdList,
                userId: deviceStatus.userId,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/vote/cast`,
        schema: {
            body: Dto.castVoteRequest,
            response: {
                200: Dto.castVoteResponse,
            },
        },
        handler: async (request, reply) => {
            const { didWrite } = await verifyUcan(request);

            const now = nowZeroMs();
            const castVoteResponse = await castVoteForOpinionSlugId({
                db: db,
                voteBuffer: voteBuffer,
                opinionSlugId: request.body.opinionSlugId,
                didWrite: didWrite,
                votingAction: request.body.chosenOption,
                userAgent: request.headers["user-agent"] ?? "Unknown device",
                now: now,
                currentDisplayLanguage: getRequestDisplayLanguage({ request }),
                returnIsUserClustered: request.body.returnIsUserClustered,
            });
            reply.send(castVoteResponse);
        },
    });

    // --- Ranking / Best-Worst Scaling ---

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/ranking/bws/save`,
        schema: {
            body: Dto.maxdiffSaveRequest,
            response: {
                200: Dto.maxdiffSaveResponse,
            },
        },
        handler: async (request) => {
            const { didWrite } = await verifyUcan(request);
            const now = nowZeroMs();
            const participationCheck = await checkConversationParticipation({
                db,
                conversationSlugId: request.body.conversationSlugId,
                didWrite,
                userAgent: request.headers["user-agent"] ?? "Unknown device",
                now,
                currentDisplayLanguage: getRequestDisplayLanguage({ request }),
            });
            if (!participationCheck.success) {
                return participationCheck;
            }
            const { items, uncertainty } = await saveMaxdiffResult({
                db,
                conversationSlugId: request.body.conversationSlugId,
                userId: participationCheck.participantId,
                ranking: request.body.ranking,
                comparisons: request.body.comparisons,
                isComplete: request.body.isComplete,
                valkey: queueValkeyRef.current,
            });
            const candidateSets = generateCandidateSets({
                userComparisons: request.body.comparisons,
                items,
                globalUncertainty: uncertainty,
                bufferSize: 1,
            });
            return { success: true as const, candidateSets };
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/ranking/bws/load`,
        schema: {
            body: Dto.maxdiffLoadRequest,
            response: {
                200: Dto.maxdiffLoadResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanOptionalAuth(db, request);
            const { id: conversationId } =
                await useCommonPost().getPostMetadataFromSlugId({
                    db,
                    conversationSlugId: request.body.conversationSlugId,
                });
            const [loadData, { items, uncertainty }] = await Promise.all([
                deviceStatus.isKnown
                    ? loadMaxdiffResult({
                          db,
                          conversationId,
                          userId: deviceStatus.userId,
                      })
                    : Promise.resolve({
                          ranking: null,
                          comparisons: null,
                          isComplete: false,
                          perUserScores: null,
                      }),
                computeGlobalUncertainty({ db, conversationId }),
            ]);
            const candidateSets = generateCandidateSets({
                userComparisons: loadData.comparisons ?? [],
                items,
                globalUncertainty: uncertainty,
                bufferSize: 1,
            });
            return { ...loadData, candidateSets };
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/ranking/bws/results`,
        schema: {
            body: Dto.maxdiffResultsRequest,
            response: {
                200: Dto.maxdiffResultsResponse,
            },
        },
        handler: async (request) => {
            const displayPreferences = await getRankingItemDisplayPreferences({
                request,
                conversationSlugId: request.body.conversationSlugId,
            });
            return await getMaxdiffResults({
                db,
                conversationSlugId: request.body.conversationSlugId,
                displayPreferences,
                lifecycleFilter: request.body.lifecycleFilter,
                valkey: queueValkeyRef.current,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/ranking/bws/items/fetch`,
        schema: {
            body: Dto.maxdiffItemsFetchRequest,
            response: {
                200: Dto.maxdiffItemsFetchResponse,
            },
        },
        handler: async (request) => {
            const displayPreferences = await getRankingItemDisplayPreferences({
                request,
                conversationSlugId: request.body.conversationSlugId,
            });
            return await fetchRankingItems({
                db,
                conversationSlugId: request.body.conversationSlugId,
                displayPreferences,
                lifecycleFilter: request.body.lifecycleFilter,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/ranking/bws/items/lifecycle/update`,
        schema: {
            body: Dto.maxdiffItemLifecycleUpdateRequest,
        },
        handler: async (request, reply) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
                },
            );
            await updateRankingItemLifecycle({
                db,
                conversationSlugId: request.body.conversationSlugId,
                itemSlugId: request.body.itemSlugId,
                newStatus: request.body.newStatus,
                requestingUserId: deviceStatus.userId,
                valkey: queueValkeyRef.current,
            });
            reply.send({});
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/ranking/bws/sync`,
        config: {
            rateLimit: maxdiffConnectorRateLimitConfig,
        },
        schema: {
            body: Dto.maxdiffSyncRequest,
            response: {
                200: Dto.maxdiffSyncResponse,
            },
        },
        handler: async (request) => {
            if (config.GITHUB_ACCESS_TOKEN === undefined) {
                throw server.httpErrors.serviceUnavailable(
                    "GitHub access token not configured",
                );
            }
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
                },
            );
            await assertMaxdiffGitHubAllowedForConversation({
                conversationSlugId: request.body.conversationSlugId,
                userId: deviceStatus.userId,
            });
            const githubClient = createGitHubClient({
                accessToken: config.GITHUB_ACCESS_TOKEN,
            });
            return await syncGitHubIssues({
                db,
                conversationSlugId: request.body.conversationSlugId,
                requestingUserId: deviceStatus.userId,
                githubClient,
                valkey: queueValkeyRef.current,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/ranking/bws/github/preview`,
        config: {
            rateLimit: maxdiffConnectorRateLimitConfig,
        },
        schema: {
            body: Dto.maxdiffGitHubPreviewRequest,
            response: {
                200: Dto.maxdiffGitHubPreviewResponse,
            },
        },
        handler: async (request) => {
            if (config.GITHUB_ACCESS_TOKEN === undefined) {
                throw server.httpErrors.serviceUnavailable(
                    "GitHub access token not configured",
                );
            }
            await verifyUcanAndKnownDeviceStatus(db, request, {
                expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
            });
            const githubClient = createGitHubClient({
                accessToken: config.GITHUB_ACCESS_TOKEN,
            });
            const issues = await githubClient.listIssues({
                repo: request.body.repository,
                label: request.body.label,
            });
            return {
                issues: issues.map((issue) => ({
                    number: issue.number,
                    title: issue.title,
                    body: issue.body,
                    state: issue.state,
                    htmlUrl: issue.htmlUrl,
                })),
            };
        },
    });

    // GitHub webhook (no auth — verified via HMAC)
    server.route({
        method: "POST",
        url: `/api/${apiVersion}/webhook/github`,
        config: {
            rateLimit: githubWebhookRateLimitConfig,
        },
        handler: async (request, reply) => {
            if (config.GITHUB_WEBHOOK_SECRET === undefined) {
                throw server.httpErrors.serviceUnavailable(
                    "GitHub webhook secret not configured",
                );
            }

            const signature = request.headers["x-hub-signature-256"];
            if (typeof signature !== "string") {
                throw server.httpErrors.unauthorized(
                    "Missing X-Hub-Signature-256 header",
                );
            }

            const rawBody = rawRequestBodies.get(request);
            if (rawBody === undefined) {
                throw server.httpErrors.badRequest("Missing raw webhook body");
            }
            if (
                !verifyWebhookSignature({
                    payload: rawBody,
                    signature,
                    secret: config.GITHUB_WEBHOOK_SECRET,
                })
            ) {
                throw server.httpErrors.unauthorized("Invalid signature");
            }

            const event = request.headers["x-github-event"];
            if (event !== "issues") {
                // We only handle issue events
                reply.send({ ok: true });
                return;
            }

            const payload = parseWebhookPayload({
                rawPayload: request.body,
            });
            await handleIssueWebhook({
                db,
                payload,
                valkey: queueValkeyRef.current,
            });
            reply.send({ ok: true });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/opinion/delete`,
        schema: {
            body: Dto.deleteOpinionRequest,
        },
        handler: async (request, reply) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
                },
            );
            await deleteOpinionBySlugId({
                db: db,
                opinionSlugId: request.body.opinionSlugId,
                userId: deviceStatus.userId,
            });
            reply.send();
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/opinion/create`,
        schema: {
            body: Dto.createOpinionRequest,
            response: {
                200: Dto.createOpinionResponse,
            },
        },
        handler: async (request, reply) => {
            const { didWrite } = await verifyUcan(request);
            const now = nowZeroMs();
            const newOpinionResponse = await postNewOpinion({
                db: db,
                commentBody: request.body.opinionBody,
                opinionPlainText: request.body.opinionPlainText,
                conversationSlugId: request.body.conversationSlugId,
                didWrite: didWrite,
                userAgent: request.headers["user-agent"] ?? "Unknown device",
                now: now,
                currentDisplayLanguage: getRequestDisplayLanguage({ request }),
                isSeed: false,
                googleCloudCredentials,
                voteBuffer: voteBuffer,
                realtimeSSEManager: realtimeSSEManager,
            });
            reply.send(newOpinionResponse);
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/opinion/fetch-by-conversation`,
        schema: {
            body: Dto.fetchOpinionsRequest,
            response: {
                200: Dto.fetchOpinionsResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanOptionalAuth(db, request);
            const headerDisplayLanguage = getRequestDisplayLanguage({
                request,
            });
            const languagePreferences = deviceStatus.isKnown
                ? await getLanguagePreferences({
                      db,
                      userId: deviceStatus.userId,
                      request: {
                          currentDisplayLanguage: headerDisplayLanguage,
                      },
                  })
                : {
                      displayLanguage: headerDisplayLanguage,
                      spokenLanguages: [headerDisplayLanguage],
                  };
            const preferredContentTranslation =
                await getPreferredContentTranslationAvailabilityForConversation(
                    {
                        conversationSlugId: request.body.conversationSlugId,
                        displayLanguage: languagePreferences.displayLanguage,
                    },
                );
            const opinionItemsPerSlugId = await fetchOpinionsByPostSlugId({
                db: db,
                postSlugId: request.body.conversationSlugId,
                filterTarget: request.body.filter,
                personalizationUserId: deviceStatus.isKnown
                    ? deviceStatus.userId
                    : undefined,
                limit: 3000,
                displayContentPreferences: {
                    displayLanguage: languagePreferences.displayLanguage,
                    targetLanguage:
                        preferredContentTranslation.targetLanguageCode,
                    spokenLanguages: languagePreferences.spokenLanguages,
                    translationAllowed: preferredContentTranslation.isAllowed,
                    viewerUserId: deviceStatus.isKnown
                        ? deviceStatus.userId
                        : undefined,
                },
            });
            return Array.from(opinionItemsPerSlugId.values());
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/opinion/fetch-comment-stats-by-conversation`,
        schema: {
            body: Dto.fetchCommentStatsRequest,
            response: {
                200: Dto.fetchCommentStatsResponse,
            },
        },
        handler: async (request) => {
            return await fetchCommentStatsByConversationSlugId({
                db,
                conversationSlugId: request.body.conversationSlugId,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/opinion/fetch-analysis-frame-manifest-by-conversation`,
        schema: {
            body: Dto.fetchAnalysisFrameManifestRequest,
            response: {
                200: Dto.analysisFrameManifest,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanOptionalAuth(db, request);
            const displayLanguage = getRequestDisplayLanguage({
                request,
            });
            const personalizationUserId = deviceStatus.isKnown
                ? deviceStatus.userId
                : undefined;

            return await fetchAnalysisFrameManifestByConversationSlugId({
                db,
                conversationSlugId: request.body.conversationSlugId,
                personalizationUserId,
                displayLanguage,
                analysisView: request.body.analysisView,
                checkpointViewSnapshotId: request.body.checkpointViewSnapshotId,
                freshnessOptions: request.body.freshness,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/opinion/fetch-analysis-frame-groups-by-frame`,
        schema: {
            body: Dto.fetchAnalysisFrameSectionRequest,
            response: {
                200: Dto.analysisFrameGroups,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanOptionalAuth(db, request);
            const personalizationUserId = deviceStatus.isKnown
                ? deviceStatus.userId
                : undefined;
            const headerDisplayLanguage = getRequestDisplayLanguage({
                request,
            });

            return await fetchAnalysisFrameGroupsByFrameKey({
                db,
                conversationSlugId: request.body.conversationSlugId,
                frameKey: request.body.frameKey,
                personalizationUserId,
                resolveDisplayContentPreferences: async ({ db: analysisDb }) =>
                    await getOpinionDisplayContentPreferencesForConversation({
                        database: analysisDb,
                        conversationSlugId: request.body.conversationSlugId,
                        personalizationUserId,
                        headerDisplayLanguage,
                    }),
                freshnessOptions: request.body.freshness,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/opinion/fetch-analysis-frame-group-labels-by-frame`,
        schema: {
            body: Dto.fetchAnalysisFrameSectionRequest,
            response: {
                200: Dto.analysisFrameGroupLabels,
            },
        },
        handler: async (request) => {
            await verifyUcanOptionalAuth(db, request);
            const displayLanguage = getRequestDisplayLanguage({
                request,
            });

            return await fetchAnalysisFrameGroupLabelsByFrameKey({
                db,
                conversationSlugId: request.body.conversationSlugId,
                frameKey: request.body.frameKey,
                displayLanguage,
                freshnessOptions: request.body.freshness,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/opinion/fetch-analysis-frame-opinion-list-by-frame`,
        schema: {
            body: Dto.fetchAnalysisFrameOpinionListRequest,
            response: {
                200: Dto.analysisFrameOpinionList,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanOptionalAuth(db, request);
            const personalizationUserId = deviceStatus.isKnown
                ? deviceStatus.userId
                : undefined;
            const headerDisplayLanguage = getRequestDisplayLanguage({
                request,
            });

            return await fetchAnalysisFrameOpinionListByFrameKey({
                db,
                conversationSlugId: request.body.conversationSlugId,
                frameKey: request.body.frameKey,
                personalizationUserId,
                kind: request.body.kind,
                resolveDisplayContentPreferences: async ({ db: analysisDb }) =>
                    await getOpinionDisplayContentPreferencesForConversation({
                        database: analysisDb,
                        conversationSlugId: request.body.conversationSlugId,
                        personalizationUserId,
                        headerDisplayLanguage,
                    }),
                freshnessOptions: request.body.freshness,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/opinion/fetch-analysis-checkpoints-by-conversation`,
        schema: {
            body: Dto.fetchAnalysisCheckpointsRequest,
            response: {
                200: Dto.fetchAnalysisCheckpointsResponse,
            },
        },
        handler: async (request) => {
            return await fetchAnalysisCheckpointsByConversationSlugId({
                db,
                conversationSlugId: request.body.conversationSlugId,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/opinion/fetch-by-slug-id-list`,
        schema: {
            body: Dto.getOpinionBySlugIdListRequest,
            response: {
                200: Dto.getOpinionBySlugIdListResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanOptionalAuth(db, request);
            const headerDisplayLanguage = getRequestDisplayLanguage({
                request,
            });
            const languagePreferences = deviceStatus.isKnown
                ? await getLanguagePreferences({
                      db,
                      userId: deviceStatus.userId,
                      request: {
                          currentDisplayLanguage: headerDisplayLanguage,
                      },
                  })
                : {
                      displayLanguage: headerDisplayLanguage,
                      spokenLanguages: [headerDisplayLanguage],
                  };
            return await fetchOpinionsByOpinionSlugIdList({
                db: db,
                opinionSlugIdList: request.body.opinionSlugIdList,
                displayContentViewerPreferences: {
                    viewerUserId: deviceStatus.isKnown
                        ? deviceStatus.userId
                        : undefined,
                    displayLanguage: languagePreferences.displayLanguage,
                    spokenLanguages: languagePreferences.spokenLanguages,
                },
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/opinion/fetch-hidden-by-conversation`,
        schema: {
            body: Dto.fetchHiddenOpinionsRequest,
            response: {
                200: Dto.fetchHiddenOpinionsResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isLoggedIn: true,
                        isRegistered: true,
                    },
                },
            );
            const isMod = await isSiteModeratorAccount({
                db: db,
                userId: deviceStatus.userId,
            });

            if (!isMod) {
                throw server.httpErrors.unauthorized(
                    "User is not a site moderator",
                );
            }
            const headerDisplayLanguage = getRequestDisplayLanguage({
                request,
            });
            const languagePreferences = await getLanguagePreferences({
                db,
                userId: deviceStatus.userId,
                request: {
                    currentDisplayLanguage: headerDisplayLanguage,
                },
            });
            const preferredContentTranslation =
                await getPreferredContentTranslationAvailabilityForConversation(
                    {
                        conversationSlugId: request.body.conversationSlugId,
                        displayLanguage: languagePreferences.displayLanguage,
                    },
                );
            const opinionItemsPerSlugId = await fetchOpinionsByPostSlugId({
                db: db,
                postSlugId: request.body.conversationSlugId,
                filterTarget: "hidden",
                limit: 3000,
                displayContentPreferences: {
                    displayLanguage: languagePreferences.displayLanguage,
                    targetLanguage:
                        preferredContentTranslation.targetLanguageCode,
                    spokenLanguages: languagePreferences.spokenLanguages,
                    translationAllowed: preferredContentTranslation.isAllowed,
                    viewerUserId: deviceStatus.userId,
                },
            });
            return Array.from(opinionItemsPerSlugId.values());
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/conversation/delete`,
        schema: {
            body: Dto.deleteConversationRequest,
        },
        handler: async (request, reply) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: { isLoggedIn: true },
                },
            );
            await postService.deletePostBySlugId({
                db: db,
                conversationSlugId: request.body.conversationSlugId,
                userId: deviceStatus.userId,
            });
            reply.send();
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/conversation/close`,
        schema: {
            body: Dto.closeConversationRequest,
            response: {
                200: Dto.closeConversationResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: { isLoggedIn: true },
                },
            );
            return await postService.closeConversation({
                db: db,
                conversationSlugId: request.body.conversationSlugId,
                userId: deviceStatus.userId,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/conversation/open`,
        schema: {
            body: Dto.openConversationRequest,
            response: {
                200: Dto.openConversationResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: { isLoggedIn: true },
                },
            );
            return await postService.openConversation({
                db: db,
                conversationSlugId: request.body.conversationSlugId,
                userId: deviceStatus.userId,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/conversation/create`,
        schema: {
            body: Dto.createNewConversationRequest,
            response: {
                200: Dto.createNewConversationResponse,
            },
        },
        handler: async (request, reply) => {
            const createConversationRequest =
                Dto.createNewConversationRequest.parse(request.body);
            const { didWrite, deviceStatus } =
                await verifyUcanAndKnownDeviceStatus(db, request, {
                    expectedKnownDeviceStatus: {
                        isLoggedIn: true,
                        isRegistered: true,
                    },
                });
            const headerDisplayLanguage = getRequestDisplayLanguage({
                request,
            });
            const autoProvisionedDefaultLanguage =
                getAutoProvisionedDefaultLanguage({
                    storedUserDisplayLanguage: undefined,
                    currentDisplayLanguage: headerDisplayLanguage,
                });

            const hasSurvey =
                createConversationRequest.conversationType === "polis" &&
                (createConversationRequest.surveyConfig?.questions.length ??
                    0) > 0;
            const createTargetResult =
                await resolveConversationCreateTargetResult({
                    db,
                    userId: deviceStatus.userId,
                    postAsOrganizationSlug:
                        createConversationRequest.postAsOrganization,
                    projectSlug: createConversationRequest.projectSlug,
                    autoProvisionedDefaultLanguage,
                });
            if (!createTargetResult.success) {
                return createTargetResult;
            }
            if (
                createConversationRequest.languageSettingsSource ===
                    "project_inherited" &&
                createConversationRequest.projectSlug === undefined
            ) {
                throw server.httpErrors.badRequest(
                    "Project language inheritance requires a selected project",
                );
            }
            const projectLanguageSettings =
                createConversationRequest.languageSettingsSource ===
                "project_inherited"
                    ? await getProjectLanguageSettings({
                          db,
                          projectId: createTargetResult.target.projectId,
                      })
                    : undefined;
            const premiumMultilingualSetting =
                projectLanguageSettings === undefined
                    ? createConversationRequest.multilingualSetting
                    : getManualMultilingualSettingsFromProjectLanguageSettings({
                          languageSettings: projectLanguageSettings,
                      });
            const premiumFeatures =
                premiumEntitlementService.getPremiumFeaturesFromCreateRequest({
                    requiresEventTicket:
                        createConversationRequest.requiresEventTicket,
                    hasSurvey,
                    preferredOpinionGroupCount:
                        createConversationRequest.conversationType === "polis"
                            ? createConversationRequest.preferredOpinionGroupCount
                            : null,
                    multilingualSetting: premiumMultilingualSetting,
                });

            if (
                createConversationRequest.conversationType === "ranking" &&
                createConversationRequest.externalSourceConfig != null
            ) {
                assertMaxdiffGitHubAllowed({
                    userId: deviceStatus.userId,
                    postAsOrganization:
                        createConversationRequest.postAsOrganization,
                });
            }

            if (premiumFeatures.length > 0) {
                await premiumEntitlementService.requirePremiumAccess({
                    db,
                    subject: {
                        projectId: createTargetResult.target.projectId,
                        userId: deviceStatus.userId,
                    },
                    features: premiumFeatures,
                    mode: "creation",
                    now: nowZeroMs(),
                });
            }

            const createResult = await postService.createNewPost({
                db: db,
                request: createConversationRequest,
                authorId: deviceStatus.userId,
                didWrite: didWrite,
                createTarget: createTargetResult.target,
                autoProvisionedDefaultLanguage,
                isImporting: false,
                googleCloudCredentials,
            });

            if (!createResult.success) {
                reply.send(createResult);
                return;
            }

            const { eagerContentTranslation, ...response } = createResult;

            try {
                await contentTranslationService.enqueueEagerContentTranslationWork(
                    {
                        valkey: queueValkeyRef.current,
                        queueScript: contentTranslationQueueScript,
                        workIds: eagerContentTranslation.workIds,
                        now: nowZeroMs(),
                        log,
                    },
                );
            } catch (error: unknown) {
                log.error(
                    error,
                    `[ContentTranslation] Failed to schedule eager work for conversationSlugId=${createResult.conversationSlugId}`,
                );
            }

            // Broadcast to all connected clients (except the creator) that a new conversation exists
            realtimeSSEManager.broadcastToAllExcept({
                event: "new_conversation",
                data: { timestamp: Date.now() },
                excludeUserId: deviceStatus.userId,
            });

            reply.send(response);
        },
    });
    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/conversation/import`,
        schema: {
            body: Dto.importConversationRequest,
            response: {
                200: Dto.importConversationResponse,
            },
        },
        handler: async (request) => {
            // Check if imports are disabled
            if (isImportDisabled) {
                throw server.httpErrors.forbidden(
                    "Imports are currently disabled",
                );
            }

            const { didWrite, deviceStatus } =
                await verifyUcanAndKnownDeviceStatus(db, request, {
                    expectedKnownDeviceStatus: {
                        isLoggedIn: true,
                        isRegistered: true,
                    },
                });

            const importCheck = checkFeatureAccess({
                featureEnabled: true,
                isOrgOnly: config.IS_ORG_IMPORT_ONLY,
                allowedOrgs: config.IMPORT_ALLOWED_ORGS,
                allowedUsers: config.IMPORT_ALLOWED_USERS,
                postAsOrganization: !!request.body.postAsOrganization,
                organizationName: request.body.postAsOrganization ?? "",
                userId: deviceStatus.userId,
            });
            if (!importCheck.allowed) {
                switch (importCheck.reason) {
                    case "disabled":
                        break;
                    case "org_required":
                        throw server.httpErrors.forbidden(
                            "Import feature restricted to organizations",
                        );
                    case "org_not_in_whitelist":
                        throw server.httpErrors.forbidden(
                            "This organization is not allowed to import conversations",
                        );
                    case "user_not_in_whitelist":
                        throw server.httpErrors.forbidden(
                            "This user is not allowed to import conversations",
                        );
                }
            }

            const createTargetResult =
                await resolveConversationCreateTargetResult({
                    db,
                    userId: deviceStatus.userId,
                    postAsOrganizationSlug: request.body.postAsOrganization,
                    projectSlug: request.body.projectSlug,
                    autoProvisionedDefaultLanguage:
                        getAutoProvisionedDefaultLanguage({
                            storedUserDisplayLanguage: undefined,
                            currentDisplayLanguage: getRequestDisplayLanguage({
                                request,
                            }),
                        }),
                });
            if (!createTargetResult.success) {
                return createTargetResult;
            }
            if (
                request.body.languageSettingsSource === "project_inherited" &&
                request.body.projectSlug === undefined
            ) {
                throw server.httpErrors.badRequest(
                    "Project language inheritance requires a selected project",
                );
            }
            const projectLanguageSettings =
                request.body.languageSettingsSource === "project_inherited"
                    ? await getProjectLanguageSettings({
                          db,
                          projectId: createTargetResult.target.projectId,
                      })
                    : undefined;
            const premiumMultilingualSetting =
                projectLanguageSettings === undefined
                    ? request.body.multilingualSetting
                    : getManualMultilingualSettingsFromProjectLanguageSettings({
                          languageSettings: projectLanguageSettings,
                      });
            const importMultilingualSetting =
                projectLanguageSettings === undefined
                    ? request.body.multilingualSetting
                    : normalizeInheritedConversationMultilingualSettings({
                          languageSettings: projectLanguageSettings,
                      });
            const importEffectiveTargetLanguageCodes =
                projectLanguageSettings === undefined
                    ? []
                    : importMultilingualSetting.additionalLanguageCodes;
            const languageTargetPolicy =
                projectLanguageSettings === undefined
                    ? {
                          source: "conversation_override" as const,
                          dynamicTranslationEnabled:
                              request.body.multilingualSetting
                                  .dynamicTranslationEnabled,
                          manualTargetLanguageCodes:
                              request.body.multilingualSetting
                                  .additionalLanguageCodes,
                      }
                    : {
                          source: "project_inherited" as const,
                          dynamicTranslationEnabled:
                              importMultilingualSetting.dynamicTranslationEnabled,
                          effectiveTargetLanguageCodes:
                              importEffectiveTargetLanguageCodes,
                      };

            const premiumFeatures =
                premiumEntitlementService.getPremiumFeaturesFromCreateRequest({
                    requiresEventTicket: request.body.requiresEventTicket,
                    hasSurvey: false,
                    preferredOpinionGroupCount:
                        request.body.preferredOpinionGroupCount,
                    multilingualSetting: premiumMultilingualSetting,
                });
            if (premiumFeatures.length > 0) {
                await premiumEntitlementService.requirePremiumAccess({
                    db,
                    subject: {
                        projectId: createTargetResult.target.projectId,
                        userId: deviceStatus.userId,
                    },
                    features: premiumFeatures,
                    mode: "creation",
                    now: nowZeroMs(),
                });
            }

            // Queue URL import for async processing
            const importResult =
                await conversationImportService.requestUrlImport({
                    db,
                    userId: deviceStatus.userId,
                    projectId: createTargetResult.target.projectId,
                    polisUrl: request.body.polisUrl,
                    formData: {
                        participationMode: request.body.participationMode,
                        isIndexed: request.body.isIndexed,
                        requiresEventTicket: request.body.requiresEventTicket,
                        aiLabelingEnabled: request.body.aiLabelingEnabled,
                        preferredOpinionGroupCount:
                            request.body.preferredOpinionGroupCount,
                        languageTargetPolicy,
                    },
                    didWrite,
                    importBuffer,
                    realtimeSSEManager,
                });
            const response: ImportConversationResponse = {
                success: true,
                importSlugId: importResult.importSlugId,
            };
            return response;
        },
    });
    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/conversation/validate-csv`,
        schema: {
            consumes: ["multipart/form-data"],
            response: {
                200: Dto.validateCsvResponse,
            },
        },
        handler: async (request, reply) => {
            await verifyUcanAndKnownDeviceStatus(db, request, {
                expectedKnownDeviceStatus: {
                    isLoggedIn: true,
                    isRegistered: true,
                },
            });

            // Parse multipart request - accept any combination of files
            const parts = request.parts();
            const files: Partial<Record<string, string>> = {};

            for await (const part of parts) {
                if (part.type === "file") {
                    // Use the built-in toBuffer() method for type safety
                    // File size limits are enforced by fastify-multipart config
                    const buffer = await part.toBuffer();
                    if (buffer.length > MAX_CSV_FILE_SIZE) {
                        throw server.httpErrors.payloadTooLarge(
                            `File '${part.fieldname}' exceeds maximum size of 50MB`,
                        );
                    }
                    files[part.fieldname] = buffer.toString("utf-8");
                }
                // Ignore form fields - validation doesn't need them
            }

            // Validate the uploaded files (supports 1, 2, or 3 files)
            const validationResult =
                await csvImportService.validateIndividualCsvFiles({ files });

            reply.send(validationResult);
        },
    });
    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/conversation/import-csv`,
        schema: {
            consumes: ["multipart/form-data"],
            response: {
                200: Dto.importCsvConversationResponse,
            },
        },
        handler: async (request, reply) => {
            // Check if imports are disabled
            if (isImportDisabled) {
                throw server.httpErrors.forbidden(
                    "Imports are currently disabled",
                );
            }

            const { didWrite, deviceStatus } =
                await verifyUcanAndKnownDeviceStatus(db, request, {
                    expectedKnownDeviceStatus: {
                        isLoggedIn: true,
                        isRegistered: true,
                    },
                });

            // Parse multipart request
            const parts = request.parts();
            const files: Partial<Record<string, string>> = {};
            const formFields: Record<string, string> = {};

            for await (const part of parts) {
                if (part.type === "file") {
                    // Use the built-in toBuffer() method for type safety
                    // File size limits are enforced by fastify-multipart config
                    const buffer = await part.toBuffer();
                    if (buffer.length > MAX_CSV_FILE_SIZE) {
                        throw server.httpErrors.payloadTooLarge(
                            `File '${part.fieldname}' exceeds maximum size of 50MB`,
                        );
                    }
                    files[part.fieldname] = buffer.toString("utf-8");
                } else {
                    // Parse form fields
                    formFields[part.fieldname] = part.value as string;
                }
            }

            // Parse and validate that all required files are present
            const parsedFiles = zodCsvFiles.safeParse(files);
            if (!parsedFiles.success) {
                throw server.httpErrors.badRequest(
                    `Invalid CSV files: ${parsedFiles.error.message}`,
                );
            }

            // Validate and parse form fields using DTO with preprocessing
            const parsedFields =
                Dto.importCsvConversationFormRequest.parse(formFields);

            const importCheck = checkFeatureAccess({
                featureEnabled: true,
                isOrgOnly: config.IS_ORG_IMPORT_ONLY,
                allowedOrgs: config.IMPORT_ALLOWED_ORGS,
                allowedUsers: config.IMPORT_ALLOWED_USERS,
                postAsOrganization: !!parsedFields.postAsOrganization,
                organizationName: parsedFields.postAsOrganization ?? "",
                userId: deviceStatus.userId,
            });
            if (!importCheck.allowed) {
                switch (importCheck.reason) {
                    case "disabled":
                        break;
                    case "org_required":
                        throw server.httpErrors.forbidden(
                            "Import feature restricted to organizations",
                        );
                    case "org_not_in_whitelist":
                        throw server.httpErrors.forbidden(
                            "This organization is not allowed to import conversations",
                        );
                    case "user_not_in_whitelist":
                        throw server.httpErrors.forbidden(
                            "This user is not allowed to import conversations",
                        );
                }
            }

            const createTargetResult =
                await resolveConversationCreateTargetResult({
                    db,
                    userId: deviceStatus.userId,
                    postAsOrganizationSlug: parsedFields.postAsOrganization,
                    projectSlug: parsedFields.projectSlug,
                    autoProvisionedDefaultLanguage:
                        getAutoProvisionedDefaultLanguage({
                            storedUserDisplayLanguage: undefined,
                            currentDisplayLanguage: getRequestDisplayLanguage({
                                request,
                            }),
                        }),
                });
            if (!createTargetResult.success) {
                reply.send(createTargetResult);
                return;
            }
            if (
                parsedFields.languageSettingsSource === "project_inherited" &&
                parsedFields.projectSlug === undefined
            ) {
                throw server.httpErrors.badRequest(
                    "Project language inheritance requires a selected project",
                );
            }
            const projectLanguageSettings =
                parsedFields.languageSettingsSource === "project_inherited"
                    ? await getProjectLanguageSettings({
                          db,
                          projectId: createTargetResult.target.projectId,
                      })
                    : undefined;
            const premiumMultilingualSetting =
                projectLanguageSettings === undefined
                    ? parsedFields.multilingualSetting
                    : getManualMultilingualSettingsFromProjectLanguageSettings({
                          languageSettings: projectLanguageSettings,
                      });
            const importMultilingualSetting =
                projectLanguageSettings === undefined
                    ? parsedFields.multilingualSetting
                    : normalizeInheritedConversationMultilingualSettings({
                          languageSettings: projectLanguageSettings,
                      });
            const importEffectiveTargetLanguageCodes =
                projectLanguageSettings === undefined
                    ? []
                    : importMultilingualSetting.additionalLanguageCodes;
            const languageTargetPolicy =
                projectLanguageSettings === undefined
                    ? {
                          source: "conversation_override" as const,
                          dynamicTranslationEnabled:
                              parsedFields.multilingualSetting
                                  .dynamicTranslationEnabled,
                          manualTargetLanguageCodes:
                              parsedFields.multilingualSetting
                                  .additionalLanguageCodes,
                      }
                    : {
                          source: "project_inherited" as const,
                          dynamicTranslationEnabled:
                              importMultilingualSetting.dynamicTranslationEnabled,
                          effectiveTargetLanguageCodes:
                              importEffectiveTargetLanguageCodes,
                      };

            const premiumFeatures =
                premiumEntitlementService.getPremiumFeaturesFromCreateRequest({
                    requiresEventTicket: parsedFields.requiresEventTicket,
                    hasSurvey: false,
                    preferredOpinionGroupCount:
                        parsedFields.preferredOpinionGroupCount,
                    multilingualSetting: premiumMultilingualSetting,
                });
            if (premiumFeatures.length > 0) {
                await premiumEntitlementService.requirePremiumAccess({
                    db,
                    subject: {
                        projectId: createTargetResult.target.projectId,
                        userId: deviceStatus.userId,
                    },
                    features: premiumFeatures,
                    mode: "creation",
                    now: nowZeroMs(),
                });
            }

            // Request CSV import (creates record and queues for async processing)
            const { importSlugId } =
                await conversationImportService.requestConversationImport({
                    db,
                    userId: deviceStatus.userId,
                    projectId: createTargetResult.target.projectId,
                    files: parsedFiles.data,
                    formData: {
                        participationMode: parsedFields.participationMode,
                        isIndexed: parsedFields.isIndexed,
                        requiresEventTicket: parsedFields.requiresEventTicket,
                        aiLabelingEnabled: parsedFields.aiLabelingEnabled,
                        preferredOpinionGroupCount:
                            parsedFields.preferredOpinionGroupCount,
                        languageTargetPolicy,
                    },
                    didWrite,
                    importBuffer,
                    realtimeSSEManager,
                });

            const response: ImportCsvConversationResponse = {
                success: true,
                importSlugId,
            };
            reply.send(response);
        },
    });

    // Get Active Import for User
    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/conversation/import/active`,
        schema: {
            response: {
                200: Dto.getActiveImportResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
                },
            );

            return await conversationImportService.getActiveImportForUser({
                db: db,
                userId: deviceStatus.userId,
            });
        },
    });

    // Conversation Import Status Route
    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/conversation/import/status`,
        schema: {
            body: Dto.getConversationImportStatusRequest,
            response: {
                200: Dto.getConversationImportStatusResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
                },
            );

            const status =
                await conversationImportService.getConversationImportStatus({
                    db: db,
                    importSlugId: request.body.importSlugId,
                    userId: deviceStatus.userId,
                });

            if (status === null) {
                throw server.httpErrors.notFound("Import not found");
            }

            return status;
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/conversation/get`,
        schema: {
            body: Dto.getConversationRequest,
            response: {
                200: Dto.getConversationResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanOptionalAuth(db, request);
            const importAccessState =
                await conversationImportService.getConversationImportAccessState(
                    {
                        db,
                        conversationSlugId: request.body.conversationSlugId,
                        userId: deviceStatus.isKnown
                            ? deviceStatus.userId
                            : undefined,
                    },
                );
            switch (importAccessState.status) {
                case "not_found":
                case "importing_not_visible":
                    throw server.httpErrors.notFound("Conversation not found");
                case "importing": {
                    const response: GetConversationResponse = {
                        status: "importing",
                        importSlugId: importAccessState.importSlugId,
                    };
                    return response;
                }
                case "ready":
                    break;
                default: {
                    const exhaustiveCheck: never = importAccessState;
                    return exhaustiveCheck;
                }
            }
            const headerDisplayLanguage = getRequestDisplayLanguage({
                request,
            });
            const languagePreferences = deviceStatus.isKnown
                ? await getLanguagePreferences({
                      db,
                      userId: deviceStatus.userId,
                      request: {
                          currentDisplayLanguage: headerDisplayLanguage,
                      },
                  })
                : {
                      displayLanguage: headerDisplayLanguage,
                      spokenLanguages: [headerDisplayLanguage],
                  };
            const postItem = await postService.fetchPostBySlugId({
                db: db,
                conversationSlugId: request.body.conversationSlugId,
                personalizedUserId: deviceStatus.isKnown
                    ? deviceStatus.userId
                    : undefined,
                baseImageServiceUrl: config.IMAGES_SERVICE_BASE_URL,
                currentDisplayLanguage: languagePreferences.displayLanguage,
            });
            const preferredContentTranslation =
                await getPreferredContentTranslationAvailabilityForConversation(
                    {
                        conversationSlugId: request.body.conversationSlugId,
                        displayLanguage: languagePreferences.displayLanguage,
                    },
                );
            const localizedContent =
                await contentTranslationService.requestConversationContentTranslation(
                    {
                        db,
                        valkey: queueValkeyRef.current,
                        queueScript: contentTranslationQueueScript,
                        conversationSlugId: request.body.conversationSlugId,
                        targetLanguageCode:
                            preferredContentTranslation.targetLanguageCode,
                        requestMode: "read_existing",
                        now: nowZeroMs(),
                        log,
                        beforeQueueTranslationWork: () => Promise.resolve(),
                    },
                );
            if (localizedContent === undefined) {
                throw server.httpErrors.notFound(
                    "Conversation content not found",
                );
            }

            const response: GetConversationResponse = {
                status: "ready",
                conversationData: {
                    metadata: postItem.metadata,
                    interaction: postItem.interaction,
                },
                displayContent:
                    conversationContentService.toInitialConversationDisplayContent(
                        {
                            content: localizedContent.content,
                            translationAllowed:
                                preferredContentTranslation.isAllowed,
                            displayLanguage:
                                languagePreferences.displayLanguage,
                            spokenLanguages:
                                languagePreferences.spokenLanguages,
                        },
                    ),
            };
            return response;
        },
    });

    // Get conversation data for editing
    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/conversation/get-for-edit`,
        schema: {
            body: Dto.getConversationForEditRequest,
            response: {
                200: Dto.getConversationForEditResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isLoggedIn: true,
                        isRegistered: true,
                    },
                },
            );
            return await postEditService.getConversationForEdit({
                db: db,
                conversationSlugId: request.body.conversationSlugId,
                userId: deviceStatus.userId,
            });
        },
    });

    // Update conversation
    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/conversation/update`,
        schema: {
            body: Dto.updateConversationRequest,
            response: {
                200: Dto.updateConversationResponse,
            },
        },
        handler: async (request, reply) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isLoggedIn: true,
                        isRegistered: true,
                    },
                },
            );

            const updateResult = await postEditService.updateConversation({
                db: db,
                userId: deviceStatus.userId,
                googleCloudCredentials,
                data: request.body,
            });

            if (updateResult.success) {
                try {
                    await contentTranslationService.enqueueEagerContentTranslationWork(
                        {
                            valkey: queueValkeyRef.current,
                            queueScript: contentTranslationQueueScript,
                            workIds:
                                updateResult.eagerContentTranslationWorkIds,
                            now: nowZeroMs(),
                            log,
                        },
                    );
                } catch (error: unknown) {
                    log.error(
                        error,
                        `[ContentTranslation] Failed to schedule eager work for conversationSlugId=${request.body.conversationSlugId}`,
                    );
                }

                reply.send({ success: true });
                return;
            }

            reply.send(updateResult);
        },
    });
    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/survey/form/fetch`,
        schema: {
            body: Dto.surveyFormFetchRequest,
            response: {
                200: Dto.surveyFormFetchResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanOptionalAuth(db, request);
            const headerDisplayLanguage = getRequestDisplayLanguage({
                request,
            });
            const languagePreferences = deviceStatus.isKnown
                ? await getLanguagePreferences({
                      db,
                      userId: deviceStatus.userId,
                      request: {
                          currentDisplayLanguage: headerDisplayLanguage,
                      },
                  })
                : {
                      displayLanguage: headerDisplayLanguage,
                      spokenLanguages: [headerDisplayLanguage],
                  };
            const surveyForm = await surveyService.fetchSurveyForm({
                db,
                conversationSlugId: request.body.conversationSlugId,
                participantId: deviceStatus.isKnown
                    ? deviceStatus.userId
                    : undefined,
            });
            const preferredContentTranslation =
                await getPreferredContentTranslationAvailabilityForConversation(
                    {
                        conversationSlugId: request.body.conversationSlugId,
                        displayLanguage: languagePreferences.displayLanguage,
                    },
                );
            const questions = await Promise.all(
                surveyForm.questions.map(async (question) => {
                    const localizedContent =
                        question.questionSlugId === undefined
                            ? undefined
                            : await contentTranslationService.requestSurveyQuestionContentTranslation(
                                  {
                                      db,
                                      valkey: queueValkeyRef.current,
                                      queueScript:
                                          contentTranslationQueueScript,
                                      conversationSlugId:
                                          request.body.conversationSlugId,
                                      questionSlugId: question.questionSlugId,
                                      targetLanguageCode:
                                          preferredContentTranslation.targetLanguageCode,
                                      requestMode: "read_existing",
                                      now: nowZeroMs(),
                                      log,
                                      beforeQueueTranslationWork: () =>
                                          Promise.resolve(),
                                  },
                              );
                    if (localizedContent === undefined) {
                        return {
                            ...question,
                            displayContent: undefined,
                        };
                    }

                    return {
                        ...question,
                        displayContent:
                            conversationContentService.toSurveyQuestionDisplayContent(
                                {
                                    content: localizedContent.content,
                                    translationAllowed:
                                        preferredContentTranslation.isAllowed,
                                    displayLanguage:
                                        languagePreferences.displayLanguage,
                                    spokenLanguages:
                                        languagePreferences.spokenLanguages,
                                },
                            ),
                    };
                }),
            );
            const responseQuestions: Extract<
                SurveyFormFetchResponse,
                { success: true }
            >["questions"] = [];
            for (const question of questions) {
                const { displayContent } = question;
                if (displayContent === undefined) {
                    return {
                        success: false as const,
                        reason: "content_not_found" as const,
                    };
                }
                responseQuestions.push({
                    ...question,
                    displayContent,
                });
            }
            const response: SurveyFormFetchResponse = {
                success: true,
                ...surveyForm,
                questions: responseQuestions,
            };
            return response;
        },
    });
    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/survey/status/check`,
        schema: {
            body: Dto.surveyStatusCheckRequest,
            response: {
                200: Dto.surveyStatusCheckResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanOptionalAuth(db, request);
            return await surveyService.checkSurveyStatus({
                db,
                conversationSlugId: request.body.conversationSlugId,
                participantId: deviceStatus.isKnown
                    ? deviceStatus.userId
                    : undefined,
            });
        },
    });
    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/survey/answer/save`,
        schema: {
            body: Dto.surveyAnswerSaveRequest,
            response: {
                200: Dto.surveyAnswerSaveResponse,
            },
        },
        handler: async (request) => {
            const { didWrite } = await verifyUcan(request);
            return await surveyService.saveSurveyAnswer({
                db,
                conversationSlugId: request.body.conversationSlugId,
                questionSlugId: request.body.questionSlugId,
                answer: request.body.answer,
                didWrite,
                userAgent: request.headers["user-agent"] ?? "Unknown device",
                now: nowZeroMs(),
                currentDisplayLanguage: getRequestDisplayLanguage({ request }),
                valkey: queueValkeyRef.current,
            });
        },
    });
    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/survey/response/withdraw`,
        schema: {
            body: Dto.surveyResponseWithdrawRequest,
            response: {
                200: Dto.surveyResponseWithdrawResponse,
            },
        },
        handler: async (request) => {
            const { didWrite } = await verifyUcan(request);
            return await surveyService.withdrawSurveyResponse({
                db,
                conversationSlugId: request.body.conversationSlugId,
                didWrite,
                userAgent: request.headers["user-agent"] ?? "Unknown device",
                now: nowZeroMs(),
                currentDisplayLanguage: getRequestDisplayLanguage({ request }),
                valkey: queueValkeyRef.current,
            });
        },
    });
    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/survey/config/update`,
        schema: {
            body: Dto.surveyConfigUpdateRequest,
            response: {
                200: Dto.surveyConfigUpdateResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isLoggedIn: true,
                        isRegistered: true,
                    },
                },
            );
            return await surveyService.updateSurveyConfigByAuthor({
                db,
                conversationSlugId: request.body.conversationSlugId,
                userId: deviceStatus.userId,
                surveyConfig: request.body.surveyConfig,
                now: nowZeroMs(),
                googleCloudCredentials,
                valkey: queueValkeyRef.current,
            });
        },
    });
    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/survey/config/delete`,
        schema: {
            body: Dto.surveyConfigDeleteRequest,
            response: {
                200: Dto.surveyConfigDeleteResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isLoggedIn: true,
                        isRegistered: true,
                    },
                },
            );
            const surveyConfigDeleteResult =
                await surveyService.deleteSurveyConfigByAuthor({
                    db,
                    conversationSlugId: request.body.conversationSlugId,
                    userId: deviceStatus.userId,
                    now: nowZeroMs(),
                    valkey: queueValkeyRef.current,
                });
            return {
                success: true as const,
                surveyGate: surveyConfigDeleteResult.surveyGate,
            };
        },
    });
    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/survey/results/aggregated`,
        schema: {
            body: Dto.surveyResultsAggregatedRequest,
            response: {
                200: Dto.surveyResultsAggregatedResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanOptionalAuth(db, request);
            const parsedHeaderDisplayLanguage =
                ZodSupportedDisplayLanguageCodes.safeParse(
                    request.headers["accept-language"],
                );
            const headerDisplayLanguage: SupportedDisplayLanguageCodes =
                parsedHeaderDisplayLanguage.success
                    ? parsedHeaderDisplayLanguage.data
                    : "en";
            const displayLanguage = deviceStatus.isKnown
                ? (
                      await getLanguagePreferences({
                          db,
                          userId: deviceStatus.userId,
                          request: {
                              currentDisplayLanguage: headerDisplayLanguage,
                          },
                      })
                  ).displayLanguage
                : headerDisplayLanguage;
            return await surveyService.fetchSurveyAggregatedResults({
                db,
                conversationSlugId: request.body.conversationSlugId,
                analysisView: request.body.analysisView,
                checkpointViewSnapshotId: request.body.checkpointViewSnapshotId,
                userId: deviceStatus.isKnown ? deviceStatus.userId : undefined,
                displayLanguage,
            });
        },
    });
    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/survey/completion/counts`,
        schema: {
            body: Dto.surveyCompletionCountsRequest,
            response: {
                200: Dto.surveyCompletionCountsResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isLoggedIn: true,
                        isRegistered: true,
                    },
                },
            );
            return await surveyService.fetchSurveyCompletionCounts({
                db,
                conversationSlugId: request.body.conversationSlugId,
                userId: deviceStatus.userId,
            });
        },
    });
    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/auth/zkp/generate-verification-link`, // there will be another subroute like /auth to _attach_ verified identifier to *already_logged_in accounts*.
        schema: {
            body: Dto.generateVerificationLinkRequest,
            response: {
                200: Dto.generateVerificationLink200,
            },
        },
        handler: async (request) => {
            const { didWrite } = await verifyUcan(request);
            return await generateVerificationLink({
                db,
                didWrite,
                axiosVerificatorSvc,
                linkType: request.body.linkType,
                baseEventId: config.BASE_EVENT_ID,
            });
        },
    });
    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/auth/zkp/verify-user-status-and-authenticate`, // there will be another subroute like /auth to _attach_ verified identifier to *already_logged_in accounts*.
        schema: {
            response: {
                200: Dto.verifyUserStatusAndAuthenticate200,
            },
        },
        handler: async (request) => {
            const { didWrite } = await verifyUcan(request);
            const userAgent = request.headers["user-agent"] ?? "Unknown device";
            const verificationStatusAndNullifier =
                await verifyUserStatusAndAuthenticate({
                    db,
                    didWrite: didWrite,
                    axiosVerificatorSvc,
                    userAgent,
                    sessionLifetimeDays: config.SESSION_LIFETIME_DAYS,
                    currentDisplayLanguage: getRequestDisplayLanguage({
                        request,
                    }),
                });
            return verificationStatusAndNullifier;
        },
    });

    // Zupass event ticket verification
    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/auth/ticket/verify`,
        schema: {
            body: Dto.verifyEventTicketRequest,
            response: {
                200: Dto.verifyEventTicket200,
            },
        },
        handler: async (request) => {
            const { didWrite } = await verifyUcan(request);
            const now = nowZeroMs();
            return await verifyEventTicket({
                db,
                didWrite,
                proofData: request.body.proof,
                eventSlug: request.body.eventSlug,
                userAgent: request.headers["user-agent"] ?? "Unknown device",
                now,
                sessionLifetimeDays: config.SESSION_LIFETIME_DAYS,
                currentDisplayLanguage: getRequestDisplayLanguage({ request }),
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/user/delete`,
        schema: {},
        handler: async (request, reply) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
                },
            );
            await deleteUserAccount({
                db: db,
                userId: deviceStatus.userId,
            });
            reply.send();
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/user/username/update`,
        schema: {
            body: Dto.updateUsernameRequest,
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
                },
            );

            await submitUsernameChange({
                db: db,
                username: request.body.username,
                userId: deviceStatus.userId,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/account/is-username-in-use`,
        schema: {
            body: Dto.checkUsernameInUseRequest,
            response: {
                200: Dto.checkUsernameInUseResponse,
            },
        },
        handler: async (request) => {
            return await checkUserNameInUse({
                db: db,
                username: request.body.username,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/account/generate-unused-random-username`,
        schema: {
            response: {
                200: Dto.generateUnusedRandomUsernameResponse,
            },
        },
        handler: async () => {
            return await generateUnusedRandomUsername({
                db: db,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/administrator/premium-entitlement/list`,
        schema: {
            body: Dto.listPremiumFeatureEntitlementsRequest,
            response: {
                200: Dto.listPremiumFeatureEntitlementsResponse,
            },
        },
        handler: async (request) => {
            await requireSiteOrgAdmin(request);
            return await premiumEntitlementService.listPremiumFeatureEntitlements(
                {
                    db,
                },
            );
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/administrator/premium-entitlement/create`,
        schema: {
            body: Dto.createPremiumFeatureEntitlementRequest,
        },
        handler: async (request) => {
            const adminUserId = await requireSiteOrgAdmin(request);
            await premiumEntitlementService.createPremiumFeatureEntitlement({
                db,
                data: request.body,
                adminUserId,
                now: nowZeroMs(),
                valkey: queueValkeyRef.current,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/administrator/premium-entitlement/update`,
        schema: {
            body: Dto.updatePremiumFeatureEntitlementRequest,
        },
        handler: async (request) => {
            const adminUserId = await requireSiteOrgAdmin(request);
            await premiumEntitlementService.updatePremiumFeatureEntitlement({
                db,
                data: request.body,
                adminUserId,
                now: nowZeroMs(),
                valkey: queueValkeyRef.current,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/administrator/premium-entitlement/revoke`,
        schema: {
            body: Dto.revokePremiumFeatureEntitlementRequest,
        },
        handler: async (request) => {
            const adminUserId = await requireSiteOrgAdmin(request);
            await premiumEntitlementService.revokePremiumFeatureEntitlement({
                db,
                entitlementId: request.body.entitlementId,
                adminUserId,
                now: nowZeroMs(),
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/administrator/project/get-all-projects`,
        schema: {
            response: {
                200: Dto.getAllProjectsResponse,
            },
        },
        handler: async (request) => {
            await requireSiteOrgAdmin(request);
            return await getAllProjects({ db });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/administrator/project/get-project-options`,
        schema: {
            response: {
                200: Dto.getProjectOptionsResponse,
            },
        },
        handler: async (request) => {
            await requireSiteOrgAdmin(request);
            return await getProjectOptions({ db });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/administrator/project/get-project-details`,
        schema: {
            body: Dto.getProjectDetailsRequest,
            response: {
                200: Dto.getProjectDetailsResponse,
            },
        },
        handler: async (request) => {
            await requireSiteOrgAdmin(request);
            return await getProjectDetails({
                db,
                projectSlug: request.body.projectSlug,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/administrator/project/create`,
        schema: {
            body: Dto.createProjectRequest,
            response: {
                200: Dto.createProjectResponse,
            },
        },
        handler: async (request) => {
            await requireSiteOrgAdmin(request);
            const result = await createProject({
                db,
                data: request.body,
                googleCloudCredentials,
            });
            if (result.success) {
                try {
                    await contentTranslationService.enqueueEagerContentTranslationWork(
                        {
                            valkey: queueValkeyRef.current,
                            queueScript: contentTranslationQueueScript,
                            workIds: result.eagerContentTranslationWorkIds,
                            now: nowZeroMs(),
                            log,
                        },
                    );
                } catch (error: unknown) {
                    log.error(
                        error,
                        `[ContentTranslation] Failed to schedule eager work for projectId=${String(result.projectId)}`,
                    );
                }
                return {
                    success: true as const,
                    projectId: result.projectId,
                    projectSlug: result.projectSlug,
                };
            }
            return result;
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/administrator/project/language-settings/update`,
        schema: {
            body: Dto.updateProjectLanguageSettingsRequest,
            response: {
                200: Dto.updateProjectLanguageSettingsResponse,
            },
        },
        handler: async (request) => {
            await requireSiteOrgAdmin(request);
            const result = await updateProjectLanguageSettings({
                db,
                data: request.body,
                googleCloudCredentials,
            });
            if (!result.success) {
                return result;
            }

            try {
                await contentTranslationService.enqueueEagerContentTranslationWork(
                    {
                        valkey: queueValkeyRef.current,
                        queueScript: contentTranslationQueueScript,
                        workIds: result.eagerContentTranslationWorkIds,
                        now: nowZeroMs(),
                        log,
                    },
                );
            } catch (error: unknown) {
                log.error(
                    error,
                    `[ContentTranslation] Failed to schedule eager work for projectId=${String(result.projectId)}`,
                );
            }
            return { success: true as const };
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/administrator/project/slug/update`,
        schema: {
            body: Dto.updateProjectSlugRequest,
            response: {
                200: Dto.updateProjectSlugResponse,
            },
        },
        handler: async (request) => {
            await requireSiteOrgAdmin(request);
            return await updateProjectSlug({
                db,
                currentProjectSlug: request.body.currentProjectSlug,
                newProjectSlug: request.body.newProjectSlug,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/administrator/project/update`,
        schema: {
            body: Dto.updateProjectRequest,
            response: {
                200: Dto.updateProjectResponse,
            },
        },
        handler: async (request) => {
            await requireSiteOrgAdmin(request);
            const result = await updateProject({
                db,
                data: request.body,
                googleCloudCredentials,
            });
            if (result.success) {
                try {
                    await contentTranslationService.enqueueEagerContentTranslationWork(
                        {
                            valkey: queueValkeyRef.current,
                            queueScript: contentTranslationQueueScript,
                            workIds: result.eagerContentTranslationWorkIds,
                            now: nowZeroMs(),
                            log,
                        },
                    );
                } catch (error: unknown) {
                    log.error(
                        error,
                        `[ContentTranslation] Failed to schedule eager work for projectId=${String(result.projectId)}`,
                    );
                }
                return {
                    success: true as const,
                    projectId: result.projectId,
                    projectSlug: result.projectSlug,
                };
            }
            return result;
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/administrator/project/delete-project`,
        schema: {
            body: Dto.deleteProjectRequest,
        },
        handler: async (request) => {
            await requireSiteOrgAdmin(request);
            await archiveProject({
                db,
                projectSlug: request.body.projectSlug,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/administrator/project/external-organization/localization/update`,
        schema: {
            body: Dto.updateProjectExternalOrganizationLocalizationRequest,
            response: {
                200: Dto.updateProjectExternalOrganizationLocalizationResponse,
            },
        },
        handler: async (request) => {
            await requireSiteOrgAdmin(request);
            return await updateProjectExternalOrganizationLocalization({
                db,
                data: request.body,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/administrator/organization/add-user-organization-mapping`,
        schema: {
            body: Dto.addUserOrganizationMappingRequest,
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isRegistered: true,
                        isLoggedIn: true,
                    },
                },
            );
            const isOrgAdmin = await isSiteOrgAdminAccount({
                db: db,
                userId: deviceStatus.userId,
            });

            if (!isOrgAdmin) {
                throw server.httpErrors.unauthorized(
                    "User is not a site org admin",
                );
            }

            await addUserOrganizationMapping({
                db: db,
                username: request.body.username,
                organizationName: request.body.organizationName,
            });
            return;
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/administrator/organization/remove-user-organization-mapping`,
        schema: {
            body: Dto.removeUserOrganizationMappingRequest,
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isRegistered: true,
                        isLoggedIn: true,
                    },
                },
            );
            const isOrgAdmin = await isSiteOrgAdminAccount({
                db: db,
                userId: deviceStatus.userId,
            });

            if (!isOrgAdmin) {
                throw server.httpErrors.unauthorized(
                    "User is not a site org admin",
                );
            }

            await removeUserOrganizationMapping({
                db: db,
                username: request.body.username,
                organizationName: request.body.organizationName,
            });
            return;
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/administrator/organization/get-organization-names-by-username`,
        schema: {
            body: Dto.getOrganizationsByUsernameRequest,
            response: {
                200: Dto.getOrganizationsByUsernameResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isRegistered: true,
                        isLoggedIn: true,
                    },
                },
            );
            const isOrgAdmin = await isSiteOrgAdminAccount({
                db: db,
                userId: deviceStatus.userId,
            });

            if (!isOrgAdmin) {
                throw server.httpErrors.unauthorized(
                    "User is not a site org admin",
                );
            }

            return await getOrganizationsByUsername({
                db: db,
                username: request.body.username,
                baseImageServiceUrl: config.IMAGES_SERVICE_BASE_URL,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/administrator/organization/get-members`,
        schema: {
            body: Dto.getOrganizationMembersRequest,
            response: {
                200: Dto.getOrganizationMembersResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isRegistered: true,
                        isLoggedIn: true,
                    },
                },
            );
            const isOrgAdmin = await isSiteOrgAdminAccount({
                db: db,
                userId: deviceStatus.userId,
            });

            if (!isOrgAdmin) {
                throw server.httpErrors.unauthorized(
                    "User is not a site org admin",
                );
            }

            return await getOrganizationMembers({
                db,
                organizationName: request.body.organizationName,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/administrator/organization/get-all-organizations`,
        schema: {
            response: {
                200: Dto.getAllOrganizationsResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isRegistered: true,
                        isLoggedIn: true,
                    },
                },
            );
            const isOrgAdmin = await isSiteOrgAdminAccount({
                db: db,
                userId: deviceStatus.userId,
            });

            if (!isOrgAdmin) {
                throw server.httpErrors.unauthorized(
                    "User is not a site org admin",
                );
            }

            return await getAllOrganizations({
                db: db,
                baseImageServiceUrl: config.IMAGES_SERVICE_BASE_URL,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/administrator/organization/get-organization-options`,
        schema: {
            response: {
                200: Dto.getOrganizationOptionsResponse,
            },
        },
        handler: async (request) => {
            await requireSiteOrgAdmin(request);
            return await getOrganizationOptions({ db });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/administrator/organization/get-organization-details`,
        schema: {
            body: Dto.getOrganizationDetailsRequest,
            response: {
                200: Dto.getOrganizationDetailsResponse,
            },
        },
        handler: async (request) => {
            await requireSiteOrgAdmin(request);
            return await getOrganizationDetails({
                db,
                baseImageServiceUrl: config.IMAGES_SERVICE_BASE_URL,
                organizationSlug: request.body.organizationSlug,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/administrator/organization/create-organization`,
        schema: {
            body: Dto.createOrganizationRequest,
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isRegistered: true,
                        isLoggedIn: true,
                    },
                },
            );
            const isOrgAdmin = await isSiteOrgAdminAccount({
                db: db,
                userId: deviceStatus.userId,
            });

            if (!isOrgAdmin) {
                throw server.httpErrors.unauthorized(
                    "User is not a site org admin",
                );
            }

            await createOrganization({
                db: db,
                organizationName: request.body.organizationName,
                organizationSlug: request.body.organizationSlug,
                defaultLanguageCode: request.body.defaultLanguageCode,
                imagePath: request.body.imagePath,
                isFullImagePath: request.body.isFullImagePath,
                websiteUrl: request.body.websiteUrl,
                description: request.body.description,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/administrator/organization/localization/update`,
        schema: {
            body: Dto.updateOrganizationLocalizationRequest,
            response: {
                200: Dto.updateOrganizationLocalizationResponse,
            },
        },
        handler: async (request) => {
            await requireSiteOrgAdmin(request);
            return await updateOrganizationLocalization({
                db,
                data: request.body,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/administrator/organization/slug/update`,
        schema: {
            body: Dto.updateOrganizationSlugRequest,
            response: {
                200: Dto.updateOrganizationSlugResponse,
            },
        },
        handler: async (request) => {
            await requireSiteOrgAdmin(request);
            return await updateOrganizationSlug({
                db,
                currentOrganizationSlug: request.body.currentOrganizationSlug,
                newOrganizationSlug: request.body.newOrganizationSlug,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/administrator/organization/delete-organization`,
        schema: {
            body: Dto.deleteOrganizationRequest,
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isRegistered: true,
                        isLoggedIn: true,
                    },
                },
            );
            const isOrgAdmin = await isSiteOrgAdminAccount({
                db: db,
                userId: deviceStatus.userId,
            });

            if (!isOrgAdmin) {
                throw server.httpErrors.unauthorized(
                    "User is not a site org admin",
                );
            }

            await archiveOrganization({
                db: db,
                organizationName: request.body.organizationName,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/report/conversation/create`,
        schema: {
            body: Dto.createConversationReportRequest,
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isRegistered: true,
                        isLoggedIn: true,
                    },
                },
            );
            await createUserReportByPostSlugId({
                db: db,
                postSlugId: request.body.conversationSlugId,
                userReportReason: request.body.reportReason,
                userReportExplanation: request.body.reportExplanation,
                userId: deviceStatus.userId,
            });
            return;
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/report/opinion/create`,
        schema: {
            body: Dto.createOpinionReportRequest,
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isRegistered: true,
                        isLoggedIn: true,
                    },
                },
            );
            await createUserReportByCommentSlugId({
                db: db,
                commentSlugId: request.body.opinionSlugId,
                userReportReason: request.body.reportReason,
                userReportExplanation: request.body.reportExplanation,
                userId: deviceStatus.userId,
            });
            return;
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/report/conversation/fetch`,
        schema: {
            body: Dto.fetchConversationReportsRequest,
            response: {
                200: Dto.fetchConversationReportsResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isRegistered: true,
                        isLoggedIn: true,
                    },
                },
            );
            const { isAuthorized } = await canModerateConversation({
                db: db,
                userId: deviceStatus.userId,
                conversationSlugId: request.body.conversationSlugId,
            });

            if (!isAuthorized) {
                throw server.httpErrors.unauthorized(
                    "User is not authorized to view reports for this conversation",
                );
            }

            return await fetchUserReportsByPostSlugId({
                db: db,
                postSlugId: request.body.conversationSlugId,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/report/opinion/fetch`,
        schema: {
            body: Dto.fetchOpinionReportsRequest,
            response: {
                200: Dto.fetchOpinionReportsResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isRegistered: true,
                        isLoggedIn: true,
                    },
                },
            );
            const { isAuthorized } =
                await canModerateConversationByOpinionSlugId({
                    db: db,
                    userId: deviceStatus.userId,
                    opinionSlugId: request.body.opinionSlugId,
                });

            if (!isAuthorized) {
                throw server.httpErrors.unauthorized(
                    "User is not authorized to view reports for this conversation",
                );
            }

            return await fetchUserReportsByCommentSlugId({
                db: db,
                commentSlugId: request.body.opinionSlugId,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/mute/user/get`,
        schema: {
            response: {
                200: Dto.getMutedUsersResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isRegistered: true,
                        isLoggedIn: true,
                    },
                },
            );
            return await getUserMutePreferences({
                db: db,
                userId: deviceStatus.userId,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/mute/user/create`,
        schema: {
            body: Dto.muteUserByUsernameRequest,
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isRegistered: true,
                        isLoggedIn: true,
                    },
                },
            );
            await muteUserByUsername({
                db: db,
                muteAction: request.body.action,
                sourceUserId: deviceStatus.userId,
                targetUsername: request.body.targetUsername,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/notification/fetch`,
        schema: {
            body: Dto.fetchNotificationsRequest,
            response: {
                200: Dto.fetchNotificationsResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
                },
            );
            return await getNotifications({
                db: db,
                userId: deviceStatus.userId,
                lastSlugId: request.body.lastSlugId,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/notification/mark-all-read`,
        schema: {},
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
                },
            );
            await markAllNotificationsAsRead({
                db: db,
                userId: deviceStatus.userId,
            });
        },
    });

    // SSE endpoint for real-time events (notifications + global broadcasts).
    // Auth is optional: authenticated users receive personal notifications +
    // global events; anonymous users receive only global events.
    server.withTypeProvider<ZodTypeProvider>().route({
        method: "GET",
        url: `/api/${apiVersion}/realtime/stream`,
        sse: true, // Enable SSE mode - provides reply.sse.* methods
        handler: async (request, reply) => {
            let subscription: RealtimeSubscriptionRequest;
            try {
                subscription = parseRealtimeSubscriptionRequest(request.query);
            } catch (error) {
                log.warn(error, "Invalid realtime stream query");
                return reply.code(400).send("Invalid realtime stream query");
            }
            let authResult: VerifyUcanOptionalAuthReturn;
            try {
                authResult = await verifyUcanOptionalAuth(db, request);
            } catch (error) {
                log.error(error, "Realtime stream authentication failed");
                return reply.code(401).send("Authentication failed");
            }

            if (canUseAuthenticatedRealtimeStream(authResult.deviceStatus)) {
                try {
                    reply.sse.keepAlive();
                    realtimeSSEManager.connect({
                        userId: authResult.deviceStatus.userId,
                        reply,
                        subscribedTopics: subscription.topics,
                    });
                    await replaySubscribedRealtimeEvents({
                        reply,
                        subscription,
                    });
                    await sendLatestSubscribedConversationAnalysisEvent({
                        reply,
                        conversationSlugId: subscription.conversationSlugId,
                    });

                    await new Promise<void>((resolve) => {
                        request.raw.on("close", () => {
                            resolve();
                        });
                    });
                } catch (error) {
                    log.error(
                        error,
                        "Error during authenticated realtime stream connection",
                    );
                }
            } else {
                // Unknown or logged-out devices still get the public stream.
                try {
                    reply.sse.keepAlive();
                    realtimeSSEManager.connectAnonymous({
                        reply,
                        subscribedTopics: subscription.topics,
                    });
                    await replaySubscribedRealtimeEvents({
                        reply,
                        subscription,
                    });
                    await sendLatestSubscribedConversationAnalysisEvent({
                        reply,
                        conversationSlugId: subscription.conversationSlugId,
                    });

                    await new Promise<void>((resolve) => {
                        request.raw.on("close", () => {
                            resolve();
                        });
                    });
                } catch (error) {
                    log.error(
                        error,
                        "Error during anonymous realtime stream connection",
                    );
                }
            }
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/topic/get-all-topics`,
        schema: {
            response: {
                200: Dto.getAllTopicsResponse,
            },
        },
        handler: async () => {
            return await getAllTopics({
                db: db,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/user/language-preferences/get`,
        schema: {
            body: Dto.getLanguagePreferencesRequest,
            response: {
                200: Dto.getLanguagePreferencesResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
                },
            );
            return await getLanguagePreferences({
                db: db,
                userId: deviceStatus.userId,
                request: request.body,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/user/language-preferences/update`,
        schema: {
            body: Dto.updateLanguagePreferencesRequest,
            response: {
                200: Dto.updateLanguagePreferencesResponse,
            },
        },
        handler: async (request) => {
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
                },
            );
            await updateLanguagePreferences({
                db: db,
                userId: deviceStatus.userId,
                preferences: request.body,
            });
            return { success: true as const };
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/conversation/content/fetch`,
        schema: {
            body: Dto.conversationContentFetchRequest,
            response: {
                200: Dto.conversationContentFetchResponse,
            },
        },
        handler: async (request) => {
            const { didWrite } = await verifyUcan(request);
            const now = nowZeroMs();
            const userAgent = request.headers["user-agent"] ?? "Unknown device";
            const deviceStatus = await authUtilService.getDeviceStatus({
                db,
                didWrite,
                now,
            });
            const headerDisplayLanguage = getRequestDisplayLanguage({
                request,
            });
            const requesterUserId = deviceStatus.isKnown
                ? deviceStatus.userId
                : (
                      await authService.createGuestUser({
                          db,
                          didWrite,
                          now,
                          userAgent,
                          currentDisplayLanguage: headerDisplayLanguage,
                      })
                  ).userId;
            const languagePreferences = await getLanguagePreferences({
                db,
                userId: requesterUserId,
                request: {
                    currentDisplayLanguage: headerDisplayLanguage,
                },
            });

            const preferredContentTranslation =
                await getPreferredContentTranslationAvailabilityForConversation(
                    {
                        conversationSlugId: request.body.conversationSlugId,
                        displayLanguage: languagePreferences.displayLanguage,
                    },
                );
            const queueValkey = queueValkeyRef.current;
            const content =
                await contentTranslationService.requestConversationContentTranslation(
                    {
                        db,
                        valkey: queueValkey,
                        queueScript: contentTranslationQueueScript,
                        conversationSlugId: request.body.conversationSlugId,
                        sourceVersion: request.body.sourceVersion,
                        targetLanguageCode:
                            preferredContentTranslation.targetLanguageCode,
                        requestMode:
                            request.body.mode === "translated" &&
                            preferredContentTranslation.isAllowed
                                ? request.body.requestMode
                                : "read_existing",
                        now,
                        log,
                        beforeQueueTranslationWork: async () => {
                            if (queueValkey === undefined) {
                                throw server.httpErrors.serviceUnavailable(
                                    "Content translation rate limiter is unavailable",
                                );
                            }
                            let rateLimit: Awaited<
                                ReturnType<
                                    typeof consumeContentTranslationUserRateLimit
                                >
                            >;
                            try {
                                rateLimit =
                                    await consumeContentTranslationUserRateLimit(
                                        {
                                            valkey: queueValkey,
                                            script: contentTranslationUserRateLimitScript,
                                            userId: requesterUserId,
                                            maxRequests:
                                                CONTENT_TRANSLATION_USER_RATE_LIMIT_MAX,
                                            windowMs:
                                                CONTENT_TRANSLATION_USER_RATE_LIMIT_WINDOW_MS,
                                        },
                                    );
                            } catch (error) {
                                log.error(
                                    error,
                                    "[ConversationContent] User rate limiter failed",
                                );
                                throw server.httpErrors.serviceUnavailable(
                                    "Content translation rate limiter is unavailable",
                                );
                            }
                            if (!rateLimit.isAllowed) {
                                log.info(
                                    {
                                        requesterUserId,
                                        retryAfterMs: rateLimit.retryAfterMs,
                                        conversationSlugId:
                                            request.body.conversationSlugId,
                                        targetLanguageCode:
                                            preferredContentTranslation.targetLanguageCode,
                                    },
                                    "[ConversationContent] User rate limit exceeded",
                                );
                                throw server.httpErrors.createError(
                                    429,
                                    `Content translation rate limit exceeded. Retry after ${String(Math.ceil(rateLimit.retryAfterMs / 1000))}s`,
                                );
                            }
                        },
                    },
                );
            if (content === undefined) {
                throw server.httpErrors.notFound(
                    "Conversation content not found",
                );
            }

            return conversationContentService.toConversationContentFetchResponse(
                {
                    content: content.content,
                    mode: request.body.mode,
                    translationAllowed: preferredContentTranslation.isAllowed,
                    displayLanguage: languagePreferences.displayLanguage,
                    spokenLanguages: languagePreferences.spokenLanguages,
                },
            );
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/content-translation/request`,
        schema: {
            body: Dto.contentTranslationRequest,
            response: {
                200: Dto.contentTranslationResponse,
            },
        },
        handler: async (request) => {
            const { didWrite } = await verifyUcan(request);
            const now = nowZeroMs();
            const userAgent = request.headers["user-agent"] ?? "Unknown device";
            const deviceStatus = await authUtilService.getDeviceStatus({
                db,
                didWrite,
                now,
            });
            const requesterUserId = deviceStatus.isKnown
                ? deviceStatus.userId
                : (
                      await authService.createGuestUser({
                          db,
                          didWrite,
                          now,
                          userAgent,
                          currentDisplayLanguage: getRequestDisplayLanguage({
                              request,
                          }),
                      })
                  ).userId;

            log.info(
                {
                    subject: request.body.subject,
                    targetLanguageCode: request.body.targetLanguageCode,
                    requestMode: request.body.requestMode,
                    requesterUserId,
                    createdGuestUser: !deviceStatus.isKnown,
                },
                "[ContentTranslation] Request received",
            );

            const queueValkey = queueValkeyRef.current;

            const availability =
                request.body.subject.kind === "project"
                    ? await getContentTranslationAvailabilityForProject({
                          projectSlug: request.body.subject.projectSlug,
                          targetLanguageCode: request.body.targetLanguageCode,
                      })
                    : await getContentTranslationAvailabilityForConversation({
                          conversationSlugId:
                              request.body.subject.conversationSlugId,
                          targetLanguageCode: request.body.targetLanguageCode,
                      });
            log.info(
                {
                    subject: request.body.subject,
                    targetLanguageCode: request.body.targetLanguageCode,
                    isAllowed: availability.isAllowed,
                    multilingualSetting: availability.multilingualSetting,
                },
                "[ContentTranslation] Availability checked",
            );
            if (!availability.isAllowed) {
                const productFailureResponse = {
                    success: false,
                    reason: "content_translation_not_enabled",
                    multilingualSetting: availability.multilingualSetting,
                } satisfies ContentTranslationResponse;
                return productFailureResponse;
            }

            if (
                request.body.subject.kind === "opinion" &&
                (await isPersonalNonSeedOpinionAuthoredByUser({
                    db,
                    conversationSlugId: request.body.subject.conversationSlugId,
                    opinionSlugId: request.body.subject.opinionSlugId,
                    userId: requesterUserId,
                }))
            ) {
                const productFailureResponse = {
                    success: false,
                    reason: "content_translation_not_enabled",
                    multilingualSetting: availability.multilingualSetting,
                } satisfies ContentTranslationResponse;
                return productFailureResponse;
            }

            const requesterIsSiteModerator =
                request.body.subject.kind === "opinion" &&
                authUtilService.isActiveRegisteredDeviceStatus(deviceStatus)
                    ? await isSiteModeratorAccount({
                          db,
                          userId: requesterUserId,
                      })
                    : false;

            const response =
                await contentTranslationService.requestContentTranslation({
                    db,
                    valkey: queueValkey,
                    queueScript: contentTranslationQueueScript,
                    subject: request.body.subject,
                    targetLanguageCode: request.body.targetLanguageCode,
                    requestMode: request.body.requestMode,
                    requesterIsSiteModerator,
                    now,
                    log,
                    beforeQueueTranslationWork: async () => {
                        if (queueValkey === undefined) {
                            throw server.httpErrors.serviceUnavailable(
                                "Content translation rate limiter is unavailable",
                            );
                        }
                        let rateLimit: Awaited<
                            ReturnType<
                                typeof consumeContentTranslationUserRateLimit
                            >
                        >;
                        try {
                            rateLimit =
                                await consumeContentTranslationUserRateLimit({
                                    valkey: queueValkey,
                                    script: contentTranslationUserRateLimitScript,
                                    userId: requesterUserId,
                                    maxRequests:
                                        CONTENT_TRANSLATION_USER_RATE_LIMIT_MAX,
                                    windowMs:
                                        CONTENT_TRANSLATION_USER_RATE_LIMIT_WINDOW_MS,
                                });
                        } catch (error) {
                            log.error(
                                error,
                                "[ContentTranslation] User rate limiter failed",
                            );
                            throw server.httpErrors.serviceUnavailable(
                                "Content translation rate limiter is unavailable",
                            );
                        }
                        if (!rateLimit.isAllowed) {
                            log.info(
                                {
                                    requesterUserId,
                                    retryAfterMs: rateLimit.retryAfterMs,
                                    subject: request.body.subject,
                                    targetLanguageCode:
                                        request.body.targetLanguageCode,
                                },
                                "[ContentTranslation] User rate limit exceeded",
                            );
                            throw server.httpErrors.createError(
                                429,
                                `Content translation rate limit exceeded. Retry after ${String(Math.ceil(rateLimit.retryAfterMs / 1000))}s`,
                            );
                        }
                    },
                });
            if (response === undefined) {
                throw server.httpErrors.notFound(
                    "Content translation subject not found",
                );
            }
            const productSuccessResponse = {
                ...response,
                success: true,
            } satisfies ContentTranslationResponse;
            log.info(
                {
                    subject: request.body.subject,
                    targetLanguageCode: request.body.targetLanguageCode,
                    requestMode: request.body.requestMode,
                    contentKind: response.content.kind,
                    translationStatus:
                        response.content.kind === "translatable"
                            ? response.content.translation.status
                            : undefined,
                    initialMode: response.content.initialMode,
                },
                "[ContentTranslation] Request completed",
            );
            return productSuccessResponse;
        },
    });

    // Conversation Export Routes
    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/conversation/export/request`,
        schema: {
            body: Dto.requestConversationExportRequest,
            response: {
                200: Dto.requestConversationExportResponse,
            },
        },
        handler: async (request) => {
            checkConversationExportEnabled();
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
                },
            );
            return await conversationExportService.requestConversationExport({
                db: db,
                conversationSlugId: request.body.conversationSlugId,
                userId: deviceStatus.userId,
                realtimeSSEManager,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/conversation/export/status`,
        schema: {
            body: Dto.getConversationExportStatusRequest,
            response: {
                200: Dto.getConversationExportStatusResponse,
            },
        },
        handler: async (request) => {
            checkConversationExportEnabled();
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
                },
            );
            return await conversationExportService.getConversationExportStatus({
                db: db,
                exportSlugId: request.body.exportSlugId,
                userId: deviceStatus.userId,
            });
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/conversation/export/history`,
        schema: {
            body: Dto.getConversationExportHistoryRequest,
            response: {
                200: Dto.getConversationExportHistoryResponse,
            },
        },
        handler: async (request) => {
            checkConversationExportEnabled();
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
                },
            );
            return await conversationExportService.getConversationExportHistory(
                {
                    db: db,
                    conversationSlugId: request.body.conversationSlugId,
                    userId: deviceStatus.userId,
                },
            );
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/conversation/export/readiness`,
        schema: {
            body: Dto.getConversationExportHistoryRequest,
            response: {
                200: Dto.getExportReadinessResponse,
            },
        },
        handler: async (request) => {
            checkConversationExportEnabled();
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: { isGuestOrLoggedIn: true },
                },
            );
            return await conversationExportService.getExportReadinessForConversation(
                {
                    db: db,
                    conversationSlugId: request.body.conversationSlugId,
                    userId: deviceStatus.userId,
                    cooldownSeconds: config.EXPORT_CONVOS_COOLDOWN_SECONDS,
                },
            );
        },
    });

    server.withTypeProvider<ZodTypeProvider>().route({
        method: "POST",
        url: `/api/${apiVersion}/conversation/export/delete`,
        schema: {
            body: Dto.deleteConversationExportRequest,
        },
        handler: async (request) => {
            checkConversationExportEnabled();
            const { deviceStatus } = await verifyUcanAndKnownDeviceStatus(
                db,
                request,
                {
                    expectedKnownDeviceStatus: {
                        isLoggedIn: true,
                        isRegistered: true,
                    },
                },
            );
            const isMod = await isSiteModeratorAccount({
                db: db,
                userId: deviceStatus.userId,
            });

            if (!isMod) {
                throw server.httpErrors.unauthorized(
                    "User is not a site moderator",
                );
            }

            await conversationExportService.deleteConversationExport({
                db: db,
                exportSlugId: request.body.exportSlugId,
            });
        },
    });
});

server.ready((e) => {
    if (e) {
        log.error(e);
        process.exit(1);
    }
    if (config.NODE_ENV === "development") {
        const swaggerObj = server.swagger({ yaml: false });
        const swaggerJson = JSON.stringify(swaggerObj, null, 4);
        fs.writeFileSync("./openapi-zkorum.json", swaggerJson);
    }
});

const host =
    config.NODE_ENV === "development"
        ? config.MODE === "capacitor"
            ? "192.168.1.96"
            : "0.0.0.0"
        : "0.0.0.0";

server.listen({ port: config.PORT, host: host }, (err) => {
    if (err) {
        log.error(err);
        process.exit(1);
    }
});

// Graceful shutdown handling
const shutdown = async (signal: string) => {
    log.info(`[API] ${signal} received, shutting down gracefully...`);

    try {
        if (queueValkeyReconnectInterval !== undefined) {
            clearInterval(queueValkeyReconnectInterval);
            queueValkeyReconnectInterval = undefined;
        }

        // Flush pending votes before shutdown
        await voteBuffer.shutdown();

        // Stop export worker before shutdown
        await exportWorker.shutdown();

        // Stop import queue/event helpers before shutdown
        await importBuffer.shutdown();

        importWorkerEventBridge.shutdown();

        // Stop UCAN replay guard cleanup interval
        ucanReplayGuard.shutdown();

        contentTranslationQueueScript.release();
        contentTranslationUserRateLimitScript.release();

        // Stop popular conversation periodic check
        clearInterval(popularConversationCheckInterval);

        await realtimeEventOutboxBridge.shutdown();

        // Close SSE connections before shutdown
        await realtimeSSEManager.shutdown();

        // Close Valkey connection
        if (queueValkeyRef.current !== undefined) {
            queueValkeyRef.current.close();
            log.info("[QueueValkey] Connection closed");
        }

        // Close server
        await server.close();
        log.info("[API] Server closed");

        process.exit(0);
    } catch (error) {
        log.error(error, "[API] Error during shutdown");
        process.exit(1);
    }
};

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
