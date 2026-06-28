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
    conversationTable,
    conversationTranslationTargetLanguageTable,
    organizationMembershipTable,
    organizationTable,
    premiumFeatureEntitlementTable,
    projectOrganizationOwnershipTable,
    surveyConfigTable,
    userTable,
} from "@/shared-backend/schema.js";
import type { Valkey } from "@/shared-backend/valkey.js";
import type { SupportedDisplayLanguageCodes } from "@/shared/languages.js";
import type {
    CreatePremiumFeatureEntitlementRequest,
    ListPremiumFeatureEntitlementsResponse,
    PremiumFeatureEntitlementItem,
    UpdatePremiumFeatureEntitlementRequest,
} from "@/shared/types/dto.js";
import {
    type EventSlug,
    type GrantablePremiumFeature,
    type PremiumFeature,
    type ConversationMultilingualSetting,
} from "@/shared/types/zod.js";
import { log } from "@/app.js";
import {
    getOrCreatePersonalOrganization,
    resolveConversationCreateTarget,
} from "./projectAccess.js";
import { getAutoProvisionedDefaultLanguage } from "./projectLanguage.js";

type PremiumFeatureEntitlementUpdateValues = Partial<
    typeof premiumFeatureEntitlementTable.$inferInsert
>;

const PREMIUM_EDIT_GRACE_DAYS = 5;
const PREMIUM_ANALYSIS_FEATURE: GrantablePremiumFeature = "analysis_variants";
const PREMIUM_DYNAMIC_TRANSLATION_FEATURE: GrantablePremiumFeature =
    "dynamic_translation";
const premiumFeatureSortValues = {
    survey: 0,
    event_ticket: 1,
    analysis_variants: 2,
    dynamic_translation: 3,
} satisfies Record<PremiumFeature, number>;

export type PremiumEntitlementSubject =
    | { organizationId: number; projectId?: never; userId?: never }
    | { projectId: number; userId: string; organizationId?: never };

type PremiumAccessMode = "creation" | "edit";

interface ConversationPremiumFeatureContext {
    conversationId: number;
    requiresEventTicket: EventSlug | null;
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
    canAddEventTicket: boolean;
    canChangeEventTicket: boolean;
    canRemoveEventTicket: boolean;
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
    autoProvisionedDefaultLanguage,
}: {
    db: PostgresJsDatabase;
    userId: string;
    postAsOrganization?: string;
    autoProvisionedDefaultLanguage: SupportedDisplayLanguageCodes;
}): Promise<PremiumEntitlementSubject> {
    const target = await resolveConversationCreateTarget({
        db,
        userId,
        postAsOrganizationSlug: postAsOrganization,
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
        return await db
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
    }

    return await db
        .select({
            feature: premiumFeatureEntitlementTable.feature,
            expiresAt: premiumFeatureEntitlementTable.expiresAt,
        })
        .from(organizationMembershipTable)
        .innerJoin(
            projectOrganizationOwnershipTable,
            eq(
                projectOrganizationOwnershipTable.organizationId,
                organizationMembershipTable.organizationId,
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
                eq(projectOrganizationOwnershipTable.projectId, subject.projectId),
                inArray(premiumFeatureEntitlementTable.feature, features),
                lte(premiumFeatureEntitlementTable.startsAt, now),
                isNull(premiumFeatureEntitlementTable.revokedAt),
            ),
        )
        .orderBy(desc(premiumFeatureEntitlementTable.expiresAt));
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
            eq(
                projectOrganizationOwnershipTable.projectId,
                conversationTable.projectId,
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
                      eq(
                          organizationMembershipTable.organizationId,
                          projectOrganizationOwnershipTable.organizationId,
                      ),
                  )
                  .where(
                      and(
                          eq(organizationMembershipTable.userId, subject.userId),
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

    if (conversation.requiresEventTicket !== null) {
        features.push("event_ticket");
    }

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
            dynamicTranslationEnabled:
                conversationTable.dynamicTranslationEnabled,
            languageId: conversationTranslationTargetLanguageTable.id,
        })
        .from(conversationTable)
        .leftJoin(
            conversationTranslationTargetLanguageTable,
            eq(
                conversationTranslationTargetLanguageTable.conversationId,
                conversationTable.id,
            ),
        )
        .where(eq(conversationTable.id, conversation.conversationId));

    if (
        translationRows.some(
            (row) => row.dynamicTranslationEnabled || row.languageId !== null,
        )
    ) {
        features.push(PREMIUM_DYNAMIC_TRANSLATION_FEATURE);
    }

    return uniqueSortedFeatures(features);
}

export function getPremiumFeaturesFromCreateRequest({
    requiresEventTicket,
    hasSurvey,
    preferredOpinionGroupCount,
    multilingualSetting,
}: {
    requiresEventTicket?: EventSlug;
    hasSurvey: boolean;
    preferredOpinionGroupCount?: number | null;
    multilingualSetting?: ConversationMultilingualSetting;
}): GrantablePremiumFeature[] {
    const features: GrantablePremiumFeature[] = [];

    if (requiresEventTicket !== undefined) {
        features.push("event_ticket");
    }

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
                  .select({ conversationId: conversationTable.id })
                  .from(conversationTable)
                  .innerJoin(
                      projectOrganizationOwnershipTable,
                      eq(
                          projectOrganizationOwnershipTable.projectId,
                          conversationTable.projectId,
                      ),
                  )
                  .where(
                      and(
                          eq(
                              projectOrganizationOwnershipTable.organizationId,
                              subject.organizationId,
                          ),
                          isNotNull(conversationTable.preferredOpinionGroupCount),
                      ),
                  )
            : await db
                  .select({ conversationId: conversationTable.id })
                  .from(conversationTable)
                  .where(
                      and(
                          eq(conversationTable.projectId, subject.projectId),
                          isNotNull(conversationTable.preferredOpinionGroupCount),
                      ),
                  );

    const conversationIds = conversationRows.map((row) => row.conversationId);
    if (conversationIds.length === 0) {
        return;
    }

    await db
        .update(conversationTable)
        .set({ preferredOpinionGroupCount: null })
        .where(inArray(conversationTable.id, conversationIds));
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
    const contentEditPremiumFeatures = premiumFeatures.filter(
        (feature) => feature !== "event_ticket",
    );
    const restrictedConversationFeatures = await getRestrictedPremiumFeatures({
        db,
        subject,
        features: contentEditPremiumFeatures,
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
        canAddEventTicket: false,
        canChangeEventTicket: conversation.requiresEventTicket !== null,
        canRemoveEventTicket: true,
        canUseAnalysisVariantsPreference:
            restrictedAnalysisPreference.length === 0,
        canUseDynamicTranslation: restrictedDynamicTranslation.length === 0,
        restrictedPremiumFeatures: restrictedConversationFeatures,
        premiumEditAccessEndsAt: await getPremiumEditAccessEndsAt({
            db,
            subject,
            features: contentEditPremiumFeatures,
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
    if (subject.username !== undefined) {
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

    if (subject.organizationName !== undefined) {
        const organizations = await db
            .select({ organizationId: organizationTable.id })
            .from(organizationTable)
            .where(
                and(
                    eq(organizationTable.slug, subject.organizationName),
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

    throw httpErrors.badRequest("Invalid entitlement subject");
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
    feature: PremiumFeature;
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
        feature: row.feature,
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

    const hasPremiumAnalysisAccess = await hasPremiumFeatureAccess({
        db,
        subject,
        feature: PREMIUM_ANALYSIS_FEATURE,
        now,
    });
    if (!hasPremiumAnalysisAccess) {
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
    const existingRows = await db
        .select({
            organizationId: premiumFeatureEntitlementTable.organizationId,
            feature: premiumFeatureEntitlementTable.feature,
            revokedAt: premiumFeatureEntitlementTable.revokedAt,
        })
        .from(premiumFeatureEntitlementTable)
        .where(eq(premiumFeatureEntitlementTable.id, data.entitlementId))
        .limit(1);
    const existingEntitlement = existingRows.at(0);
    const subject =
        existingEntitlement === undefined
            ? undefined
            : { organizationId: existingEntitlement.organizationId };
    const hadPremiumAnalysisAccess =
        existingEntitlement?.feature === PREMIUM_ANALYSIS_FEATURE &&
        subject !== undefined
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
            ? existingEntitlement?.revokedAt
            : updateValues.revokedAt;
    if (existingEntitlement !== undefined && finalRevokedAt == null) {
        await assertNoOverlappingPremiumFeatureEntitlements({
            db,
            organizationId: existingEntitlement.organizationId,
            features: [existingEntitlement.feature],
            startsAt,
            expiresAt,
            excludedEntitlementId: data.entitlementId,
        });
    }

    await db
        .update(premiumFeatureEntitlementTable)
        .set(updateValues)
        .where(eq(premiumFeatureEntitlementTable.id, data.entitlementId));

    if (
        existingEntitlement?.feature !== PREMIUM_ANALYSIS_FEATURE ||
        subject === undefined ||
        hadPremiumAnalysisAccess
    ) {
        return;
    }

    const hasPremiumAnalysisAccess = await hasPremiumFeatureAccess({
        db,
        subject,
        feature: PREMIUM_ANALYSIS_FEATURE,
        now,
    });
    if (!hasPremiumAnalysisAccess) {
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
    await db
        .update(premiumFeatureEntitlementTable)
        .set({
            revokedAt: now,
            updatedByUserId: adminUserId,
            updatedAt: now,
        })
        .where(eq(premiumFeatureEntitlementTable.id, entitlementId));
}
