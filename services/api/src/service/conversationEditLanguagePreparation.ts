import { and, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { GoogleCloudCredentials } from "@/shared-backend/googleCloudAuth.js";
import {
    conversationContentTable,
    conversationModerationTable,
    conversationTable,
    projectTable,
    rankingConversationConfigTable,
} from "@/shared-backend/schema.js";
import type {
    UpdateConversationRequest,
    UpdateConversationResponse,
} from "@/shared/types/dto.js";
import type { SurveyConfig } from "@/shared/types/zod.js";
import { toUnionUndefined } from "@/shared/shared.js";
import {
    buildContentBlockLanguageDetectionCorpus,
    buildSurveyLanguageDetectionCorpus,
    loadCurrentConversationOwnedLanguageSources,
    type ContentLanguageMetadataResolver,
} from "./contentLanguageMetadata.js";
import {
    buildConversationLanguageDetectionCorpus,
    buildGoogleConversationLanguageDetectionCorpus,
} from "./conversationLanguage.js";
import {
    getSeedOpinionChangeLanguageInputs,
    prepareSeedOpinionChanges,
} from "./conversationSeedOpinionChanges.js";
import { createPreparedContentLanguageMetadata } from "./preparedContentLanguageMetadata.js";
import {
    getProjectCapabilitiesById,
    getProjectLanguageSettings,
} from "./projectAccess.js";
import {
    getPremiumEntitlementSubjectForConversation,
    getPremiumFeaturesInConversation,
    getRestrictedPremiumFeatures,
} from "./premiumEntitlement.js";
import type { NormalizedUserRichText } from "./richText.js";
import { getSurveyConfigForConversation } from "./survey.js";
import type { VoteBuffer } from "./voteBuffer.js";
import {
    getQvItemLanguageInput,
    prepareQvItemUpdate,
    type NormalizedQvItemUpdate,
} from "./qvItems.js";

export function buildConversationEditLanguageInput({
    title,
    bodyPlainText,
    surveyConfig,
}: {
    title: string;
    bodyPlainText: string;
    surveyConfig: SurveyConfig | null;
}): { text: string; googleText: string } {
    return {
        text: buildContentBlockLanguageDetectionCorpus({
            conversationCorpus: buildConversationLanguageDetectionCorpus({
                conversationTitle: title,
                bodyPlainText,
            }),
            surveyConfig,
        }),
        googleText: buildGoogleConversationLanguageDetectionCorpus({
            conversationTitle: title,
            bodyPlainText,
            supplementalPlainText: buildSurveyLanguageDetectionCorpus({
                surveyConfig,
            }),
        }),
    };
}

export async function prepareConversationEditLanguages({
    db,
    userId,
    data,
    destinationProjectId,
    normalizedSeeds,
    sanitizedBody,
    bodyPlainText,
    googleCloudCredentials,
    voteBuffer,
    qvItemUpdate,
}: {
    db: PostgresJsDatabase;
    userId: string;
    data: UpdateConversationRequest;
    destinationProjectId: number | undefined;
    normalizedSeeds: readonly NormalizedUserRichText[];
    sanitizedBody: string | undefined;
    bodyPlainText: string;
    googleCloudCredentials: GoogleCloudCredentials | undefined;
    voteBuffer: VoteBuffer | undefined;
    qvItemUpdate: NormalizedQvItemUpdate | undefined;
}): Promise<
    | {
          success: true;
          resolveLanguageMetadata: ContentLanguageMetadataResolver;
      }
    | Extract<UpdateConversationResponse, { success: false }>
> {
    const language = createPreparedContentLanguageMetadata({
        googleCloudCredentials,
    });
    const ready = {
        success: true,
        resolveLanguageMetadata: language.resolve,
    } as const;
    if (googleCloudCredentials === undefined) return ready;

    // This is an unlocked writer-side preflight. The write transaction repeats
    // authorization, premium policy, revision, moderation, and vote checks.
    const source = (
        await db
            .select({
                id: conversationTable.id,
                projectId: conversationTable.projectId,
                projectSlug: projectTable.slug,
                conversationType: conversationTable.conversationType,
                title: conversationContentTable.title,
                body: conversationContentTable.body,
                dynamicTranslationEnabled:
                    conversationTable.dynamicTranslationEnabled,
                isImporting: conversationTable.isImporting,
                isClosed: conversationTable.isClosed,
                creditVotingConfigId: conversationTable.creditVotingConfigId,
                externalSourceConfig:
                    rankingConversationConfigTable.externalSourceConfig,
                moderationAction: conversationModerationTable.moderationAction,
            })
            .from(conversationTable)
            .innerJoin(
                conversationContentTable,
                eq(
                    conversationContentTable.id,
                    conversationTable.currentContentId,
                ),
            )
            .innerJoin(
                projectTable,
                eq(projectTable.id, conversationTable.projectId),
            )
            .leftJoin(
                rankingConversationConfigTable,
                eq(
                    rankingConversationConfigTable.id,
                    conversationTable.rankingConfigId,
                ),
            )
            .leftJoin(
                conversationModerationTable,
                and(
                    eq(
                        conversationModerationTable.conversationId,
                        conversationTable.id,
                    ),
                    isNull(conversationModerationTable.deletedAt),
                ),
            )
            .where(
                and(
                    eq(conversationTable.slugId, data.conversationSlugId),
                    isNull(projectTable.deletedAt),
                ),
            )
    ).at(0);
    if (source === undefined) return { success: false, reason: "not_found" };
    const targetProjectId = destinationProjectId ?? source.projectId;
    const projectChanged = targetProjectId !== source.projectId;
    const capabilities = await getProjectCapabilitiesById({
        db,
        userId,
        projectIds: [...new Set([source.projectId, targetProjectId])],
        requestedCapabilities: ["conversation_edit", "conversation_create"],
    });
    if (capabilities.get(source.projectId)?.has("conversation_edit") !== true)
        return { success: false, reason: "not_author" };
    if (
        projectChanged &&
        (!capabilities.get(targetProjectId)?.has("conversation_edit") ||
            !capabilities.get(targetProjectId)?.has("conversation_create"))
    )
        return { success: false, reason: "missing_project_capability" };
    if (source.moderationAction === "lock")
        return { success: false, reason: "conversation_locked" };
    if (
        data.projectChange !== undefined &&
        data.projectChange.expectedProjectSlug !== source.projectSlug
    )
        return { success: false, reason: "project_assignment_changed" };

    const dynamicTranslationRequested =
        data.languageSettingsSource === "project_inherited"
            ? (
                  await getProjectLanguageSettings({
                      db,
                      projectId: targetProjectId,
                  })
              ).dynamicTranslationEnabled
            : data.multilingualSetting.dynamicTranslationEnabled;
    if (!dynamicTranslationRequested) return ready;
    const subject = getPremiumEntitlementSubjectForConversation({
        conversation: { projectId: targetProjectId, userId },
    });
    const restricted = await getRestrictedPremiumFeatures({
        db,
        subject,
        features: ["dynamic_translation"],
        mode: "creation",
        now: new Date(),
    });
    if (restricted.length > 0) return ready;

    const changes = data.seedOpinionChanges ?? [];
    if (
        (changes.length > 0 || normalizedSeeds.length > 0) &&
        (source.isImporting || source.externalSourceConfig !== null)
    )
        return { success: false, reason: "seed_opinions_not_allowed" };
    const seedChanges = await prepareSeedOpinionChanges({
        db,
        conversationId: source.id,
        conversationType: source.conversationType,
        changes,
        voteBuffer,
        lockTargets: false,
    });
    if (!seedChanges.success) return seedChanges;
    if (qvItemUpdate !== undefined) {
        if (source.creditVotingConfigId === null)
            return { success: false, reason: "seed_opinions_not_allowed" };
        const qvChanges = await prepareQvItemUpdate({
            db,
            conversationId: source.id,
            configId: source.creditVotingConfigId,
            isClosed: source.isClosed,
            update: qvItemUpdate,
            lockConfig: false,
        });
        if (!qvChanges.success) return qvChanges;
    }
    const contentChanged =
        data.conversationTitle !== source.title ||
        sanitizedBody !== toUnionUndefined(source.body);
    if (
        !projectChanged &&
        (contentChanged ||
            normalizedSeeds.length > 0 ||
            seedChanges.changes.length > 0 ||
            qvItemUpdate !== undefined)
    ) {
        const features = await getPremiumFeaturesInConversation({
            db,
            conversation: {
                conversationId: source.id,
            },
        });
        const expired = await getRestrictedPremiumFeatures({
            db,
            subject,
            features,
            mode: "edit",
            now: new Date(),
        });
        if (expired.length > 0)
            return { success: false, reason: "premium_access_expired" };
    }

    const inputs: { text: string; googleText?: string }[] = [
        ...normalizedSeeds.map((opinion) => ({ text: opinion.plainText })),
        ...getSeedOpinionChangeLanguageInputs(seedChanges.changes),
        ...(qvItemUpdate?.changes.flatMap((change) =>
            change.action === "delete"
                ? []
                : [getQvItemLanguageInput(change.content)],
        ) ?? []),
    ];
    if (contentChanged || data.surveyConfig !== undefined) {
        const effectiveSurvey =
            data.surveyConfig === undefined
                ? ((await getSurveyConfigForConversation({
                      db,
                      conversationId: source.id,
                  })) ?? null)
                : data.surveyConfig;
        inputs.push(
            buildConversationEditLanguageInput({
                title: data.conversationTitle,
                bodyPlainText,
                surveyConfig: effectiveSurvey,
            }),
        );
    }
    if (
        !contentChanged &&
        !source.dynamicTranslationEnabled &&
        data.surveyConfig === undefined
    ) {
        const owned = await loadCurrentConversationOwnedLanguageSources({
            db,
            conversationId: source.id,
        });
        if (owned === undefined) return { success: false, reason: "not_found" };
        const replaced = new Set(
            seedChanges.changes.map((change) => change.target.slugId),
        );
        inputs.push(
            owned.blockInput,
            ...owned.seedOpinions
                .filter((opinion) => !replaced.has(opinion.slugId))
                .map((opinion) => ({ text: opinion.text })),
        );
    }
    await language.prepare(inputs);
    return ready;
}
