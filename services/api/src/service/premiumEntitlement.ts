import { httpErrors } from "@fastify/sensible";
import {
    and,
    desc,
    eq,
    gt,
    inArray,
    isNotNull,
    isNull,
    lt,
    lte,
    ne,
    or,
} from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    enqueueScheduledConversationForMathWork,
    hasActiveVotesForMathWork,
    scheduleAnalysisUpdate,
} from "@/shared-backend/analysisScheduler.js";
import {
    conversationContentTable,
    conversationTable,
    conversationTranslationTargetLanguageTable,
    organizationMembershipTable,
    organizationTable,
    polisConversationConfigTable,
    premiumFeatureEntitlementTable,
    projectOrganizationOwnershipTable,
    surveyConfigTable,
    userTable,
} from "@/shared-backend/schema.js";
import type { Valkey } from "@/shared-backend/valkey.js";
import { getPrimaryDatabase } from "@/shared-backend/db.js";
import type { SupportedDisplayLanguageCodes } from "@/shared/languages.js";
import type {
    CreatePremiumFeatureEntitlementRequest,
    ListPremiumFeatureEntitlementsResponse,
    PremiumFeatureEntitlementItem,
    UpdatePremiumFeatureEntitlementRequest,
} from "@/shared/types/dto.js";
import {
    zodPremiumFeature,
    type GrantablePremiumFeature,
    type PremiumFeature,
    type ConversationMultilingualSetting,
} from "@/shared/types/zod.js";
import { log } from "@/app.js";
import {
    getProjectLanguageSettings,
    getOrCreatePersonalOrganization,
    resolveConversationCreateTarget,
} from "./projectAccess.js";
import { getAutoProvisionedDefaultLanguage } from "./projectLanguage.js";
import {
    getManualMultilingualSettingsFromEffectiveTargets,
    getManualMultilingualSettingsFromProjectLanguageSettings,
    sourceLanguageToDisplayLanguage,
} from "./translationLanguageSetting.js";

type PremiumFeatureEntitlementUpdateValues = Partial<
    typeof premiumFeatureEntitlementTable.$inferInsert
>;

const PREMIUM_EDIT_GRACE_DAYS = 5;
const PREMIUM_ANALYSIS_FEATURE: GrantablePremiumFeature = "analysis_variants";
const PREMIUM_DYNAMIC_TRANSLATION_FEATURE: GrantablePremiumFeature =
    "dynamic_translation";
const premiumFeatureSortValues = {
    survey: 0,
    analysis_variants: 1,
    dynamic_translation: 2,
    conversation_email_update: 3,
} satisfies Record<PremiumFeature, number>;

export type PremiumEntitlementSubject =
    | { organizationId: number; projectId?: never; userId?: never }
    | { projectId: number; userId: string; organizationId?: never };

type PremiumAccessMode = "creation" | "edit";

interface ConversationPremiumFeatureContext {
    conversationId: number;
}

interface ConversationEntitlementContext {
    projectId: number;
    userId: string;
}

export interface ConversationEditPermissions {
    canEditNormalSettings: boolean;
    canEditConversationContent: boolean;
    canEditSurvey: boolean;
    canDeleteSurvey: boolean;
    canUseAnalysisVariantsPreference: boolean;
    canUseDynamicTranslation: boolean;
    restrictedPremiumFeatures: PremiumFeature[];
    premiumEditAccessEndsAt?: Date;
}

interface EntitlementRow {
    feature: PremiumFeature;
    expiresAt: Date | null;
}

function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function toUnionUndefined<T>(value: T | null): T | undefined {
    return value ?? undefined;
}

function getFeatureSortValue(feature: PremiumFeature): number {
    return premiumFeatureSortValues[feature];
}

function uniqueSortedFeatures<T extends PremiumFeature>(features: T[]): T[] {
    return Array.from(new Set(features)).sort(
        (left, right) => getFeatureSortValue(left) - getFeatureSortValue(right),
    );
}

function hasAccessForMode({
    entitlement,
    mode,
    now,
}: {
    entitlement: EntitlementRow;
    mode: PremiumAccessMode;
    now: Date;
}): boolean {
    if (entitlement.expiresAt === null) {
        return true;
    }

    if (mode === "creation") {
        return entitlement.expiresAt > now;
    }

    return addDays(entitlement.expiresAt, PREMIUM_EDIT_GRACE_DAYS) > now;
}

function isEntitlementActiveForCreation({
    startsAt,
    expiresAt,
    revokedAt,
    now,
}: {
    startsAt: Date;
    expiresAt: Date | null;
    revokedAt: Date | null | undefined;
    now: Date;
}): boolean {
    return (
        startsAt <= now &&
        revokedAt == null &&
        (expiresAt === null || expiresAt > now)
    );
}

function getEditAccessEnd(entitlement: EntitlementRow): Date | undefined {
    if (entitlement.expiresAt === null) {
        return undefined;
    }

    return addDays(entitlement.expiresAt, PREMIUM_EDIT_GRACE_DAYS);
}

export function getPremiumEntitlementSubjectForConversation({
    conversation,
}: {
    conversation: ConversationEntitlementContext;
}): PremiumEntitlementSubject {
    return { projectId: conversation.projectId, userId: conversation.userId };
}

export async function getPremiumEntitlementSubjectForCreate({
    db,
    userId,
    postAsOrganization,
    projectSlug,
    autoProvisionedDefaultLanguage,
}: {
    db: PostgresJsDatabase;
    userId: string;
    postAsOrganization?: string;
    projectSlug?: string;
    autoProvisionedDefaultLanguage: SupportedDisplayLanguageCodes;
}): Promise<PremiumEntitlementSubject> {
    const target = await resolveConversationCreateTarget({
        db,
        userId,
        postAsOrganizationSlug: postAsOrganization,
        projectSlug,
        autoProvisionedDefaultLanguage,
    });
    return { projectId: target.projectId, userId };
}

async function getCandidateEntitlements({
    db,
    subject,
    features,
    now,
}: {
    db: PostgresJsDatabase;
    subject: PremiumEntitlementSubject;
    features: PremiumFeature[];
    now: Date;
}): Promise<EntitlementRow[]> {
    if (features.length === 0) {
        return [];
    }

    if (subject.organizationId !== undefined) {
        const rows = await db
            .select({
                feature: premiumFeatureEntitlementTable.feature,
                expiresAt: premiumFeatureEntitlementTable.expiresAt,
            })
            .from(premiumFeatureEntitlementTable)
            .where(
                and(
                    eq(
                        premiumFeatureEntitlementTable.organizationId,
                        subject.organizationId,
                    ),
                    inArray(premiumFeatureEntitlementTable.feature, features),
                    lte(premiumFeatureEntitlementTable.startsAt, now),
                    isNull(premiumFeatureEntitlementTable.revokedAt),
                ),
            )
            .orderBy(desc(premiumFeatureEntitlementTable.expiresAt));
        return rows.map((row) => ({
            ...row,
            feature: zodPremiumFeature.parse(row.feature),
        }));
    }

    const rows = await db
        .select({
            feature: premiumFeatureEntitlementTable.feature,
            expiresAt: premiumFeatureEntitlementTable.expiresAt,
        })
        .from(organizationMembershipTable)
        .innerJoin(
            projectOrganizationOwnershipTable,
            and(
                eq(
                    projectOrganizationOwnershipTable.organizationId,
                    organizationMembershipTable.organizationId,
                ),
                isNull(projectOrganizationOwnershipTable.deletedAt),
            ),
        )
        .innerJoin(
            premiumFeatureEntitlementTable,
            eq(
                premiumFeatureEntitlementTable.organizationId,
                organizationMembershipTable.organizationId,
            ),
        )
        .where(
            and(
                eq(organizationMembershipTable.userId, subject.userId),
                isNull(organizationMembershipTable.deletedAt),
                eq(
                    projectOrganizationOwnershipTable.projectId,
                    subject.projectId,
                ),
                inArray(premiumFeatureEntitlementTable.feature, features),
                lte(premiumFeatureEntitlementTable.startsAt, now),
                isNull(premiumFeatureEntitlementTable.revokedAt),
            ),
        )
        .orderBy(desc(premiumFeatureEntitlementTable.expiresAt));
    return rows.map((row) => ({
        ...row,
        feature: zodPremiumFeature.parse(row.feature),
    }));
}

export async function hasPremiumFeatureAccess({
    db,
    subject,
    feature,
    now,
}: {
    db: PostgresJsDatabase;
    subject: PremiumEntitlementSubject;
    feature: PremiumFeature;
    now: Date;
}): Promise<boolean> {
    const restrictedFeatures = await getRestrictedPremiumFeatures({
        db,
        subject,
        features: [feature],
        mode: "creation",
        now,
    });

    return restrictedFeatures.length === 0;
}

export async function hasPremiumAnalysisVariantsAccess({
    db,
    conversation,
    now,
}: {
    db: PostgresJsDatabase;
    conversation: ConversationEntitlementContext;
    now: Date;
}): Promise<boolean> {
    return await hasPremiumFeatureAccess({
        db,
        subject: getPremiumEntitlementSubjectForConversation({ conversation }),
        feature: PREMIUM_ANALYSIS_FEATURE,
        now,
    });
}

export async function getOrganizationIdsWithActiveDynamicTranslationEntitlement({
    db,
    organizationIds,
    now,
}: {
    db: PostgresJsDatabase;
    organizationIds: number[];
    now: Date;
}): Promise<Set<number>> {
    if (organizationIds.length === 0) {
        return new Set();
    }

    const rows = await db
        .select({
            organizationId: premiumFeatureEntitlementTable.organizationId,
        })
        .from(premiumFeatureEntitlementTable)
        .where(
            and(
                inArray(
                    premiumFeatureEntitlementTable.organizationId,
                    organizationIds,
                ),
                eq(
                    premiumFeatureEntitlementTable.feature,
                    PREMIUM_DYNAMIC_TRANSLATION_FEATURE,
                ),
                lte(premiumFeatureEntitlementTable.startsAt, now),
                isNull(premiumFeatureEntitlementTable.revokedAt),
                or(
                    isNull(premiumFeatureEntitlementTable.expiresAt),
                    gt(premiumFeatureEntitlementTable.expiresAt, now),
                ),
            ),
        );

    return new Set(rows.map((row) => row.organizationId));
}

export async function hasActiveDynamicTranslationEntitlementForOrganizations({
    db,
    organizationIds,
    now,
}: {
    db: PostgresJsDatabase;
    organizationIds: number[];
    now: Date;
}): Promise<boolean> {
    const entitledOrganizationIds =
        await getOrganizationIdsWithActiveDynamicTranslationEntitlement({
            db,
            organizationIds,
            now,
        });
    return entitledOrganizationIds.size > 0;
}

async function refreshPremiumAnalysisForSubject({
    db,
    subject,
    valkey,
}: {
    db: PostgresJsDatabase;
    subject: PremiumEntitlementSubject;
    valkey: Valkey | undefined;
}): Promise<void> {
    const baseQuery = db
        .select({ conversationId: conversationTable.id })
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
        );

    const conversationRows =
        subject.organizationId !== undefined
            ? await baseQuery
                  .where(
                      and(
                          eq(
                              projectOrganizationOwnershipTable.organizationId,
                              subject.organizationId,
                          ),
                          eq(conversationTable.conversationType, "polis"),
                          eq(conversationTable.isImporting, false),
                          isNotNull(conversationTable.currentContentId),
                      ),
                  )
                  .orderBy(desc(conversationTable.createdAt))
            : await baseQuery
                  .innerJoin(
                      organizationMembershipTable,
                      and(
                          eq(
                              organizationMembershipTable.organizationId,
                              projectOrganizationOwnershipTable.organizationId,
                          ),
                          isNull(organizationMembershipTable.deletedAt),
                      ),
                  )
                  .where(
                      and(
                          eq(
                              organizationMembershipTable.userId,
                              subject.userId,
                          ),
                          eq(
                              projectOrganizationOwnershipTable.projectId,
                              subject.projectId,
                          ),
                          eq(conversationTable.conversationType, "polis"),
                          eq(conversationTable.isImporting, false),
                          isNotNull(conversationTable.currentContentId),
                      ),
                  )
                  .orderBy(desc(conversationTable.createdAt));

    for (const row of conversationRows) {
        const hasActiveVotes = await hasActiveVotesForMathWork({
            db,
            conversationId: row.conversationId,
        });
        if (!hasActiveVotes) {
            log.info(
                `[PremiumEntitlement] Skipping math work schedule for premium refresh without active votes conversationId=${String(row.conversationId)}`,
            );
            continue;
        }
        await scheduleAnalysisUpdate({
            db,
            conversationId: row.conversationId,
            log,
        });
        await enqueueScheduledConversationForMathWork({
            db,
            valkey,
            conversationId: row.conversationId,
            log,
        });
    }
}

export async function getRestrictedPremiumFeatures({
    db,
    subject,
    features,
    mode,
    now,
}: {
    db: PostgresJsDatabase;
    subject: PremiumEntitlementSubject;
    features: PremiumFeature[];
    mode: PremiumAccessMode;
    now: Date;
}): Promise<PremiumFeature[]> {
    const uniqueFeatures = uniqueSortedFeatures(features);
    const entitlements = await getCandidateEntitlements({
        db,
        subject,
        features: uniqueFeatures,
        now,
    });

    return uniqueFeatures.filter((feature) => {
        return !entitlements.some(
            (entitlement) =>
                entitlement.feature === feature &&
                hasAccessForMode({ entitlement, mode, now }),
        );
    });
}

export async function requirePremiumAccess({
    db,
    subject,
    features,
    mode,
    now,
}: {
    db: PostgresJsDatabase;
    subject: PremiumEntitlementSubject;
    features: PremiumFeature[];
    mode: PremiumAccessMode;
    now: Date;
}): Promise<void> {
    const restrictedFeatures = await getRestrictedPremiumFeatures({
        db,
        subject,
        features,
        mode,
        now,
    });

    if (restrictedFeatures.length > 0) {
        throw httpErrors.forbidden("Premium access is required");
    }
}

async function getPremiumEditAccessEndsAt({
    db,
    subject,
    features,
    now,
}: {
    db: PostgresJsDatabase;
    subject: PremiumEntitlementSubject;
    features: PremiumFeature[];
    now: Date;
}): Promise<Date | undefined> {
    const uniqueFeatures = uniqueSortedFeatures(features);
    const entitlements = await getCandidateEntitlements({
        db,
        subject,
        features: uniqueFeatures,
        now,
    });

    const featureAccessEndsAt: Date[] = [];

    for (const feature of uniqueFeatures) {
        const accessibleEntitlementEndsAt = entitlements
            .filter(
                (entitlement) =>
                    entitlement.feature === feature &&
                    hasAccessForMode({ entitlement, mode: "edit", now }),
            )
            .map(getEditAccessEnd)
            .filter((date): date is Date => date !== undefined)
            .sort((left, right) => right.getTime() - left.getTime());

        const latestAccessEnd = accessibleEntitlementEndsAt.at(0);
        if (latestAccessEnd !== undefined) {
            featureAccessEndsAt.push(latestAccessEnd);
        }
    }

    return featureAccessEndsAt.sort(
        (left, right) => left.getTime() - right.getTime(),
    )[0];
}

export async function getPremiumFeaturesInConversation({
    db,
    conversation,
}: {
    db: PostgresJsDatabase;
    conversation: ConversationPremiumFeatureContext;
}): Promise<PremiumFeature[]> {
    const features: PremiumFeature[] = [];

    const surveyRows = await db
        .select({ id: surveyConfigTable.id })
        .from(surveyConfigTable)
        .where(
            and(
                eq(
                    surveyConfigTable.conversationId,
                    conversation.conversationId,
                ),
                isNull(surveyConfigTable.deletedAt),
            ),
        )
        .limit(1);

    if (surveyRows.length > 0) {
        features.push("survey");
    }

    const translationRows = await db
        .select({
            projectId: conversationTable.projectId,
            dynamicTranslationEnabled:
                conversationTable.dynamicTranslationEnabled,
            languageSettingsSource: conversationTable.languageSettingsSource,
            sourceLanguageCode: conversationContentTable.sourceLanguageCode,
            targetLanguageCode:
                conversationTranslationTargetLanguageTable.languageCode,
        })
        .from(conversationTable)
        .leftJoin(
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
        .where(eq(conversationTable.id, conversation.conversationId));
    const translationContext = translationRows.at(0);

    if (translationContext !== undefined) {
        const premiumMultilingualSetting =
            translationContext.languageSettingsSource === "project_inherited"
                ? getManualMultilingualSettingsFromProjectLanguageSettings({
                      languageSettings: await getProjectLanguageSettings({
                          db,
                          projectId: translationContext.projectId,
                      }),
                  })
                : getManualMultilingualSettingsFromEffectiveTargets({
                      effectiveMultilingualSettings: {
                          dynamicTranslationEnabled:
                              translationContext.dynamicTranslationEnabled,
                          additionalLanguageCodes: translationRows.flatMap(
                              (row) =>
                                  row.targetLanguageCode === null
                                      ? []
                                      : [row.targetLanguageCode],
                          ),
                      },
                      detectedTargetLanguageCode:
                          sourceLanguageToDisplayLanguage({
                              sourceLanguageCode:
                                  translationContext.sourceLanguageCode,
                          }),
                  });

        if (
            premiumMultilingualSetting.dynamicTranslationEnabled ||
            premiumMultilingualSetting.additionalLanguageCodes.length > 0
        ) {
            features.push(PREMIUM_DYNAMIC_TRANSLATION_FEATURE);
        }
    }

    return uniqueSortedFeatures(features);
}

export function getPremiumFeaturesFromCreateRequest({
    hasSurvey,
    preferredOpinionGroupCount,
    multilingualSetting,
}: {
    hasSurvey: boolean;
    preferredOpinionGroupCount?: number | null;
    multilingualSetting?: ConversationMultilingualSetting;
}): GrantablePremiumFeature[] {
    const features: GrantablePremiumFeature[] = [];

    if (hasSurvey) {
        features.push("survey");
    }

    if (
        preferredOpinionGroupCount !== undefined &&
        preferredOpinionGroupCount !== null
    ) {
        features.push(PREMIUM_ANALYSIS_FEATURE);
    }

    if (
        multilingualSetting !== undefined &&
        (multilingualSetting.additionalLanguageCodes.length > 0 ||
            multilingualSetting.dynamicTranslationEnabled)
    ) {
        features.push(PREMIUM_DYNAMIC_TRANSLATION_FEATURE);
    }

    return uniqueSortedFeatures(features);
}

async function clearPreferredOpinionGroupCountForSubject({
    db,
    subject,
}: {
    db: PostgresJsDatabase;
    subject: PremiumEntitlementSubject;
}): Promise<void> {
    const conversationRows =
        subject.organizationId !== undefined
            ? await db
                  .select({ polisConfigId: polisConversationConfigTable.id })
                  .from(conversationTable)
                  .innerJoin(
                      polisConversationConfigTable,
                      eq(
                          polisConversationConfigTable.id,
                          conversationTable.polisConfigId,
                      ),
                  )
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
                  .where(
                      and(
                          eq(
                              projectOrganizationOwnershipTable.organizationId,
                              subject.organizationId,
                          ),
                          isNotNull(
                              polisConversationConfigTable.preferredOpinionGroupCount,
                          ),
                      ),
                  )
            : await db
                  .select({ polisConfigId: polisConversationConfigTable.id })
                  .from(conversationTable)
                  .innerJoin(
                      polisConversationConfigTable,
                      eq(
                          polisConversationConfigTable.id,
                          conversationTable.polisConfigId,
                      ),
                  )
                  .where(
                      and(
                          eq(conversationTable.projectId, subject.projectId),
                          isNotNull(
                              polisConversationConfigTable.preferredOpinionGroupCount,
                          ),
                      ),
                  );

    const polisConfigIds = conversationRows.map((row) => row.polisConfigId);
    if (polisConfigIds.length === 0) {
        return;
    }

    await db
        .update(polisConversationConfigTable)
        .set({ preferredOpinionGroupCount: null })
        .where(inArray(polisConversationConfigTable.id, polisConfigIds));
}

export async function buildConversationEditPermissions({
    db,
    conversation,
    hasSurvey,
    now,
}: {
    db: PostgresJsDatabase;
    conversation: ConversationPremiumFeatureContext &
        ConversationEntitlementContext;
    hasSurvey: boolean;
    now: Date;
}): Promise<ConversationEditPermissions> {
    const subject = getPremiumEntitlementSubjectForConversation({
        conversation,
    });
    const premiumFeatures = await getPremiumFeaturesInConversation({
        db,
        conversation,
    });
    const restrictedConversationFeatures = await getRestrictedPremiumFeatures({
        db,
        subject,
        features: premiumFeatures,
        mode: "edit",
        now,
    });
    const restrictedSurveyFeatures = await getRestrictedPremiumFeatures({
        db,
        subject,
        features: ["survey"],
        mode: hasSurvey ? "edit" : "creation",
        now,
    });
    const restrictedAnalysisPreference = await getRestrictedPremiumFeatures({
        db,
        subject,
        features: [PREMIUM_ANALYSIS_FEATURE],
        mode: "creation",
        now,
    });
    const restrictedDynamicTranslation = await getRestrictedPremiumFeatures({
        db,
        subject,
        features: [PREMIUM_DYNAMIC_TRANSLATION_FEATURE],
        mode: "creation",
        now,
    });

    return {
        canEditNormalSettings: true,
        canEditConversationContent: restrictedConversationFeatures.length === 0,
        canEditSurvey: restrictedSurveyFeatures.length === 0,
        canDeleteSurvey: true,
        canUseAnalysisVariantsPreference:
            restrictedAnalysisPreference.length === 0,
        canUseDynamicTranslation: restrictedDynamicTranslation.length === 0,
        restrictedPremiumFeatures: restrictedConversationFeatures,
        premiumEditAccessEndsAt: await getPremiumEditAccessEndsAt({
            db,
            subject,
            features: premiumFeatures,
            now,
        }),
    };
}

async function resolveEntitlementSubject({
    db,
    subject,
}: {
    db: PostgresJsDatabase;
    subject: CreatePremiumFeatureEntitlementRequest["subject"];
}): Promise<{ organizationId: number }> {
    if ("username" in subject) {
        const users = await db
            .select({ userId: userTable.id })
            .from(userTable)
            .where(eq(userTable.username, subject.username))
            .limit(1);

        const user = users.at(0);
        if (user === undefined) {
            throw httpErrors.notFound("User not found");
        }

        const organization = await getOrCreatePersonalOrganization({
            db,
            userId: user.userId,
            autoProvisionedDefaultLanguage: getAutoProvisionedDefaultLanguage({
                storedUserDisplayLanguage: undefined,
                currentDisplayLanguage: undefined,
            }),
        });
        return { organizationId: organization.organizationId };
    }

    const organizations = await db
        .select({ organizationId: organizationTable.id })
        .from(organizationTable)
        .where(
            and(
                eq(organizationTable.slug, subject.organizationName),
                eq(organizationTable.directoryVisibility, "listed"),
                isNull(organizationTable.deletedAt),
            ),
        )
        .limit(1);

    const organization = organizations.at(0);
    if (organization === undefined) {
        throw httpErrors.notFound("Organization not found");
    }

    return { organizationId: organization.organizationId };
}

async function assertNoOverlappingPremiumFeatureEntitlements({
    db,
    organizationId,
    features,
    startsAt,
    expiresAt,
    excludedEntitlementId,
}: {
    db: PostgresJsDatabase;
    organizationId: number;
    features: PremiumFeature[];
    startsAt: Date;
    expiresAt: Date | null;
    excludedEntitlementId?: number;
}): Promise<void> {
    const overlapConditions = [
        eq(premiumFeatureEntitlementTable.organizationId, organizationId),
        inArray(premiumFeatureEntitlementTable.feature, features),
        isNull(premiumFeatureEntitlementTable.revokedAt),
        or(
            isNull(premiumFeatureEntitlementTable.expiresAt),
            gt(premiumFeatureEntitlementTable.expiresAt, startsAt),
        ),
    ];

    if (expiresAt !== null) {
        overlapConditions.push(
            lt(premiumFeatureEntitlementTable.startsAt, expiresAt),
        );
    }

    if (excludedEntitlementId !== undefined) {
        overlapConditions.push(
            ne(premiumFeatureEntitlementTable.id, excludedEntitlementId),
        );
    }

    const rows = await db
        .select({ feature: premiumFeatureEntitlementTable.feature })
        .from(premiumFeatureEntitlementTable)
        .where(and(...overlapConditions))
        .limit(1);

    const overlappingEntitlement = rows.at(0);
    if (overlappingEntitlement !== undefined) {
        throw httpErrors.conflict(
            `Premium feature entitlement already exists within that period for ${overlappingEntitlement.feature}`,
        );
    }
}

function toEntitlementItem(row: {
    id: number;
    userId: string | null;
    username: string | null;
    organizationId: number;
    organizationName: string | null;
    feature: (typeof premiumFeatureEntitlementTable.$inferSelect)["feature"];
    startsAt: Date;
    expiresAt: Date | null;
    revokedAt: Date | null;
    adminNote: string | null;
    createdAt: Date;
    updatedAt: Date;
}): PremiumFeatureEntitlementItem {
    return {
        id: row.id,
        userId: toUnionUndefined(row.userId),
        username: toUnionUndefined(row.username),
        organizationId: toUnionUndefined(row.organizationId),
        organizationName: toUnionUndefined(row.organizationName),
        feature: zodPremiumFeature.parse(row.feature),
        startsAt: row.startsAt,
        expiresAt: toUnionUndefined(row.expiresAt),
        revokedAt: toUnionUndefined(row.revokedAt),
        adminNote: toUnionUndefined(row.adminNote),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

export async function listPremiumFeatureEntitlements({
    db,
}: {
    db: PostgresJsDatabase;
}): Promise<ListPremiumFeatureEntitlementsResponse> {
    const rows = await db
        .select({
            id: premiumFeatureEntitlementTable.id,
            userId: organizationTable.autoProvisionedForUserId,
            username: userTable.username,
            organizationId: premiumFeatureEntitlementTable.organizationId,
            organizationName: organizationTable.displayName,
            feature: premiumFeatureEntitlementTable.feature,
            startsAt: premiumFeatureEntitlementTable.startsAt,
            expiresAt: premiumFeatureEntitlementTable.expiresAt,
            revokedAt: premiumFeatureEntitlementTable.revokedAt,
            adminNote: premiumFeatureEntitlementTable.adminNote,
            createdAt: premiumFeatureEntitlementTable.createdAt,
            updatedAt: premiumFeatureEntitlementTable.updatedAt,
        })
        .from(premiumFeatureEntitlementTable)
        .innerJoin(
            organizationTable,
            eq(
                organizationTable.id,
                premiumFeatureEntitlementTable.organizationId,
            ),
        )
        .leftJoin(
            userTable,
            eq(userTable.id, organizationTable.autoProvisionedForUserId),
        )
        .where(
            inArray(
                premiumFeatureEntitlementTable.feature,
                zodPremiumFeature.options,
            ),
        )
        .orderBy(desc(premiumFeatureEntitlementTable.updatedAt));

    return { entitlements: rows.map(toEntitlementItem) };
}

export async function createPremiumFeatureEntitlement({
    db,
    data,
    adminUserId,
    now,
    valkey,
}: {
    db: PostgresJsDatabase;
    data: CreatePremiumFeatureEntitlementRequest;
    adminUserId: string;
    now: Date;
    valkey: Valkey | undefined;
}): Promise<void> {
    const subject = await resolveEntitlementSubject({
        db,
        subject: data.subject,
    });
    const features = uniqueSortedFeatures(data.features);
    if (features.length === 0) {
        throw httpErrors.badRequest("At least one premium feature is required");
    }

    const hadPremiumAnalysisAccess = features.includes(PREMIUM_ANALYSIS_FEATURE)
        ? await hasPremiumFeatureAccess({
              db,
              subject,
              feature: PREMIUM_ANALYSIS_FEATURE,
              now,
          })
        : false;

    const startsAt = new Date(data.startsAt);
    const expiresAt =
        data.expiresAt !== undefined ? new Date(data.expiresAt) : null;

    await assertNoOverlappingPremiumFeatureEntitlements({
        db,
        organizationId: subject.organizationId,
        features,
        startsAt,
        expiresAt,
    });

    await db.transaction(async (tx) => {
        for (const feature of features) {
            await tx.insert(premiumFeatureEntitlementTable).values({
                organizationId: subject.organizationId,
                feature,
                startsAt,
                expiresAt,
                adminNote: data.adminNote ?? null,
                createdByUserId: adminUserId,
                updatedByUserId: adminUserId,
                createdAt: now,
                updatedAt: now,
            });
        }
    });

    if (
        !features.includes(PREMIUM_ANALYSIS_FEATURE) ||
        hadPremiumAnalysisAccess
    ) {
        return;
    }

    const newPremiumAnalysisAccess = isEntitlementActiveForCreation({
        startsAt,
        expiresAt,
        revokedAt: null,
        now,
    });
    if (!newPremiumAnalysisAccess) {
        return;
    }

    await clearPreferredOpinionGroupCountForSubject({
        db,
        subject,
    });

    await refreshPremiumAnalysisForSubject({
        db,
        subject,
        valkey,
    });
}

function supportedEntitlementId(entitlementId: number) {
    return and(
        eq(premiumFeatureEntitlementTable.id, entitlementId),
        inArray(
            premiumFeatureEntitlementTable.feature,
            zodPremiumFeature.options,
        ),
    );
}

export async function updatePremiumFeatureEntitlement({
    db,
    data,
    adminUserId,
    now,
    valkey,
}: {
    db: PostgresJsDatabase;
    data: UpdatePremiumFeatureEntitlementRequest;
    adminUserId: string;
    now: Date;
    valkey: Valkey | undefined;
}): Promise<void> {
    const existingRows = await getPrimaryDatabase(db)
        .select({
            organizationId: premiumFeatureEntitlementTable.organizationId,
            feature: premiumFeatureEntitlementTable.feature,
            revokedAt: premiumFeatureEntitlementTable.revokedAt,
        })
        .from(premiumFeatureEntitlementTable)
        .where(supportedEntitlementId(data.entitlementId))
        .limit(1);
    const existingEntitlement = existingRows.at(0);
    if (existingEntitlement === undefined) {
        throw httpErrors.notFound("Premium entitlement not found");
    }
    const subject = { organizationId: existingEntitlement.organizationId };
    const hadPremiumAnalysisAccess =
        existingEntitlement.feature === PREMIUM_ANALYSIS_FEATURE
            ? await hasPremiumFeatureAccess({
                  db,
                  subject,
                  feature: PREMIUM_ANALYSIS_FEATURE,
                  now,
              })
            : false;

    const startsAt = new Date(data.startsAt);
    const expiresAt =
        data.expiresAt !== undefined ? new Date(data.expiresAt) : null;
    const updateValues: PremiumFeatureEntitlementUpdateValues = {
        startsAt,
        expiresAt,
        adminNote: data.adminNote ?? null,
        updatedByUserId: adminUserId,
        updatedAt: now,
    };

    if (data.revokedAt !== undefined) {
        updateValues.revokedAt =
            data.revokedAt === null ? null : new Date(data.revokedAt);
    }

    const finalRevokedAt =
        data.revokedAt === undefined
            ? existingEntitlement.revokedAt
            : updateValues.revokedAt;
    if (finalRevokedAt == null) {
        await assertNoOverlappingPremiumFeatureEntitlements({
            db,
            organizationId: existingEntitlement.organizationId,
            features: [zodPremiumFeature.parse(existingEntitlement.feature)],
            startsAt,
            expiresAt,
            excludedEntitlementId: data.entitlementId,
        });
    }

    const updatedRows = await db
        .update(premiumFeatureEntitlementTable)
        .set(updateValues)
        .where(supportedEntitlementId(data.entitlementId))
        .returning({ id: premiumFeatureEntitlementTable.id });
    if (updatedRows.length === 0) {
        throw httpErrors.notFound("Premium entitlement not found");
    }

    if (
        existingEntitlement.feature !== PREMIUM_ANALYSIS_FEATURE ||
        hadPremiumAnalysisAccess
    ) {
        return;
    }

    const newPremiumAnalysisAccess = isEntitlementActiveForCreation({
        startsAt,
        expiresAt,
        revokedAt: finalRevokedAt,
        now,
    });
    if (!newPremiumAnalysisAccess) {
        return;
    }

    await clearPreferredOpinionGroupCountForSubject({
        db,
        subject,
    });

    await refreshPremiumAnalysisForSubject({
        db,
        subject,
        valkey,
    });
}

export async function revokePremiumFeatureEntitlement({
    db,
    entitlementId,
    adminUserId,
    now,
}: {
    db: PostgresJsDatabase;
    entitlementId: number;
    adminUserId: string;
    now: Date;
}): Promise<void> {
    const revokedRows = await db
        .update(premiumFeatureEntitlementTable)
        .set({
            revokedAt: now,
            updatedByUserId: adminUserId,
            updatedAt: now,
        })
        .where(supportedEntitlementId(entitlementId))
        .returning({ id: premiumFeatureEntitlementTable.id });
    if (revokedRows.length === 0) {
        throw httpErrors.notFound("Premium entitlement not found");
    }
}
