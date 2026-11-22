import { httpErrors } from "@fastify/sensible";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { log } from "@/app.js";
import { logApiError } from "@/logging/privacy.js";
import { getPrimaryDatabase } from "@/shared-backend/db.js";
import type { GoogleCloudCredentials } from "@/shared-backend/googleCloudAuth.js";
import type { SupportedDisplayLanguageCodes } from "@/shared/languages.js";
import type {
    CreateNewConversationRequest,
    CreateNewConversationResponse,
    UpdateConversationRequest,
    UpdateConversationResponse,
} from "@/shared/types/dto.js";
import { nowZeroMs } from "@/shared/util.js";
import type { createComparisonGitHubAccess } from "./comparisonGitHubAccess.js";
import { getLanguagePreferences } from "./language.js";
import {
    requireConversationCapabilityBySlug,
    requireConversationDestination,
} from "./organizationAuthorization.js";
import {
    createNewPost,
    normalizeCreateConversationRichText,
    type ClaimDraftPublication,
} from "./post.js";
import { updateConversation } from "./postEdit.js";
import {
    getPremiumFeaturesFromCreateRequest,
    requirePremiumAccess,
} from "./premiumEntitlement.js";
import {
    canConfigureConversationEmailUpdatesForOrganization,
    getProjectLanguageSettings,
    resolveConversationCreateTargetResult,
} from "./projectAccess.js";
import type { RealtimeSSEManager } from "./realtimeSSE.js";
import {
    getManualMultilingualSettingsFromProjectLanguageSettings,
    type InheritableProjectLanguageSettingsInput,
} from "./translationLanguageSetting.js";
import type { ValkeyRef } from "./valkeyRef.js";
import type { VoteBuffer } from "./voteBuffer.js";

export function createConversationWriteService({
    db,
    googleCloudCredentials,
    valkeyRef,
    realtimeSSEManager,
    voteBuffer,
    assertComparisonGitHubAllowed,
    enqueueTranslationWork,
}: {
    db: PostgresJsDatabase;
    googleCloudCredentials: GoogleCloudCredentials | undefined;
    valkeyRef: ValkeyRef;
    realtimeSSEManager: RealtimeSSEManager;
    voteBuffer: VoteBuffer | undefined;
    assertComparisonGitHubAllowed: ReturnType<
        typeof createComparisonGitHubAccess
    >["assertComparisonGitHubAllowed"];
    enqueueTranslationWork: (workIds: number[]) => Promise<void>;
}) {
    async function scheduleTranslations(workIds: number[]): Promise<void> {
        if (workIds.length === 0) return;
        try {
            await enqueueTranslationWork(workIds);
        } catch (error: unknown) {
            // The write is already committed; queue wakeup failure must not turn it into a failed request.
            logApiError({
                logger: log,
                level: "error",
                event: { event: "application_error" },
                error,
            });
        }
    }

    async function create({
        request,
        userId,
        displayLanguage,
        draft,
    }: {
        request: CreateNewConversationRequest;
        userId: string;
        displayLanguage: SupportedDisplayLanguageCodes;
        draft?: {
            target: { projectId: number; organizationId: number };
            claim: ClaimDraftPublication;
            projectLanguageSettings:
                | InheritableProjectLanguageSettingsInput
                | undefined;
        };
    }): Promise<CreateNewConversationResponse> {
        const normalized = normalizeCreateConversationRichText(request);
        if (!normalized.success) return normalized;

        // Reject invalid requests before resolving a target, which may provision
        // a personal organization and project.
        if (
            request.languageSettingsSource === "project_inherited" &&
            request.projectSlug === undefined
        ) {
            throw httpErrors.badRequest(
                "Project language inheritance requires a selected project",
            );
        }
        if (
            request.conversationType === "prioritizing" &&
            request.prioritizationType === "comparisons" &&
            request.externalSourceConfig != null
        ) {
            assertComparisonGitHubAllowed({
                userId,
                postAsOrganization: request.postAsOrganization,
            });
        }
        const createTargetResult =
            draft === undefined
                ? await resolveConversationCreateTargetResult({
                      db,
                      userId,
                      postAsOrganizationSlug: request.postAsOrganization,
                      projectSlug: request.projectSlug,
                      autoProvisionedDefaultLanguage: displayLanguage,
                  })
                : { success: true as const, target: draft.target };
        if (!createTargetResult.success) {
            return {
                success: false,
                failure: {
                    target: "project",
                    reason: createTargetResult.reason,
                },
            };
        }
        const { target } = createTargetResult;
        const projectLanguageSettings =
            request.languageSettingsSource === "project_inherited"
                ? (draft?.projectLanguageSettings ??
                  (await getProjectLanguageSettings({
                      db,
                      projectId: target.projectId,
                  })))
                : undefined;
        const features = getPremiumFeaturesFromCreateRequest({
            hasSurvey:
                "surveyConfig" in request &&
                (request.surveyConfig?.questions.length ?? 0) > 0,
            preferredOpinionGroupCount:
                request.conversationType === "polis"
                    ? request.preferredOpinionGroupCount
                    : null,
            multilingualSetting:
                projectLanguageSettings === undefined
                    ? request.multilingualSetting
                    : getManualMultilingualSettingsFromProjectLanguageSettings({
                          languageSettings: projectLanguageSettings,
                      }),
        });
        async function requireConfigurationAccess(
            reader: PostgresJsDatabase,
        ): Promise<void> {
            const now = nowZeroMs();
            if (
                request.conversationEmailUpdateEnabledOverride !== undefined &&
                !(await canConfigureConversationEmailUpdatesForOrganization({
                    db: reader,
                    userId,
                    organizationId: target.organizationId,
                    now,
                }))
            ) {
                throw httpErrors.forbidden(
                    "Missing conversation_email_update access",
                );
            }
            if (features.length > 0) {
                await requirePremiumAccess({
                    db: reader,
                    subject: { projectId: target.projectId, userId },
                    features,
                    mode: "creation",
                    now,
                });
            }
        }
        await requireConfigurationAccess(getPrimaryDatabase(db));

        const result = await createNewPost({
            db,
            request,
            normalizedRichText: normalized.content,
            authorId: userId,
            createTarget: target,
            autoProvisionedDefaultLanguage: displayLanguage,
            isImporting: false,
            googleCloudCredentials,
            valkey: valkeyRef.current,
            claimDraftPublication:
                draft === undefined
                    ? undefined
                    : async (tx) => {
                          const claim = await draft.claim(tx);
                          // Premium or email-update access can change during preparation.
                          if (claim.kind === "publish")
                              await requireConfigurationAccess(tx);
                          return claim;
                      },
            preparedProjectLanguageSettings: projectLanguageSettings,
        });
        if (!result.success) return result;
        if (result.publication === "created") {
            await scheduleTranslations(result.eagerContentTranslationWorkIds);
            realtimeSSEManager.broadcastToAllExcept({
                event: "new_conversation",
                data: { timestamp: Date.now() },
                excludeUserId: userId,
            });
        }
        return { success: true, conversationSlugId: result.conversationSlugId };
    }

    async function update({
        request,
        userId,
        displayLanguage,
    }: {
        request: UpdateConversationRequest;
        userId: string;
        displayLanguage: SupportedDisplayLanguageCodes;
    }): Promise<UpdateConversationResponse> {
        const { conversationSlugId } = request;
        await requireConversationCapabilityBySlug({
            db,
            userId,
            conversationSlugId,
            capability: "conversation_edit",
        });
        if (request.projectChange !== undefined) {
            await requireConversationDestination({
                db,
                userId,
                target: request.projectChange.target,
            });
        }
        if (request.conversationEmailUpdateEnabledOverride !== undefined) {
            await requireConversationCapabilityBySlug({
                db,
                userId,
                conversationSlugId,
                capability: "conversation_email_update",
            });
        }
        const preferences = (request.seedOpinionChanges ?? []).some(
            (change) => change.action === "edit",
        )
            ? await getLanguagePreferences({
                  db,
                  userId,
                  request: { currentDisplayLanguage: displayLanguage },
              })
            : undefined;
        const result = await updateConversation({
            db,
            userId,
            realtimeSSEManager,
            googleCloudCredentials,
            valkey: valkeyRef.current,
            data: request,
            voteBuffer,
            displayContentViewerPreferences:
                preferences === undefined
                    ? undefined
                    : {
                          viewerUserId: userId,
                          displayLanguage: preferences.displayLanguage,
                          spokenLanguages: preferences.spokenLanguages,
                      },
        });
        if (!result.success) return result;
        await scheduleTranslations(result.eagerContentTranslationWorkIds);
        // Preserve the route's existing response projection, not all edit internals.
        return {
            success: true,
            addedSeedOpinions: result.addedSeedOpinions,
            participantStatements: result.participantStatements,
            addedOpinions: result.addedOpinions,
            updatedOpinions: result.updatedOpinions,
            projectAssignment: result.projectAssignment,
        };
    }

    return { create, update };
}
