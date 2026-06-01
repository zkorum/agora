import { httpErrors } from "@fastify/sensible";
import { and, desc, eq, inArray, isNotNull, isNull, lte } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    enqueueScheduledConversationForMathWork,
    hasActiveVotesForMathWork,
    scheduleAnalysisUpdate,
} from "@/shared-backend/analysisScheduler.js";
import {
    conversationTable,
    organizationTable,
    premiumFeatureEntitlementTable,
    surveyConfigTable,
    userTable,
} from "@/shared-backend/schema.js";
import type { Valkey } from "@/shared-backend/valkey.js";
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
} from "@/shared/types/zod.js";
import { log } from "@/app.js";
import * as authUtilService from "./authUtil.js";

type PremiumFeatureEntitlementUpdateValues = Partial<
    typeof premiumFeatureEntitlementTable.$inferInsert
>;

const PREMIUM_EDIT_GRACE_DAYS = 5;
const PREMIUM_ANALYSIS_FEATURE: GrantablePremiumFeature = "analysis_variants";
const premiumFeatureSortValues = {
    survey: 0,
    event_ticket: 1,
    analysis_variants: 2,
} satisfies Record<PremiumFeature, number>;

export type PremiumEntitlementSubject =
    | { userId: string; organizationId?: never }
    | { organizationId: number; userId?: never };

type PremiumAccessMode = "creation" | "edit";

interface ConversationPremiumFeatureContext {
    conversationId: number;
    requiresEventTicket: EventSlug | null;
}

interface ConversationEntitlementContext {
    authorId: string;
    organizationId: number | null;
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

function getEntitlementSubjectFilter({
    subject,
}: {
    subject: PremiumEntitlementSubject;
}) {
    if (subject.userId !== undefined) {
        return and(
            eq(premiumFeatureEntitlementTable.userId, subject.userId),
            isNull(premiumFeatureEntitlementTable.organizationId),
        );
    }

    return and(
        eq(
            premiumFeatureEntitlementTable.organizationId,
            subject.organizationId,
        ),
        isNull(premiumFeatureEntitlementTable.userId),
    );
}

function getConversationSubjectFilter({
    subject,
}: {
    subject: PremiumEntitlementSubject;
}) {
    if (subject.userId !== undefined) {
        return and(
            eq(conversationTable.authorId, subject.userId),
            isNull(conversationTable.organizationId),
        );
    }

    return eq(conversationTable.organizationId, subject.organizationId);
}

export function getPremiumEntitlementSubjectForConversation({
    conversation,
}: {
    conversation: ConversationEntitlementContext;
}): PremiumEntitlementSubject {
    if (conversation.organizationId !== null) {
        return { organizationId: conversation.organizationId };
    }

    return { userId: conversation.authorId };
}

export async function getPremiumEntitlementSubjectForCreate({
    db,
    userId,
    postAsOrganization,
}: {
    db: PostgresJsDatabase;
    userId: string;
    postAsOrganization?: string;
}): Promise<PremiumEntitlementSubject> {
    if (postAsOrganization === undefined || postAsOrganization === "") {
        return { userId };
    }

    const organizationId = await authUtilService.isUserPartOfOrganization({
        db,
        userId,
        organizationName: postAsOrganization,
    });

    if (organizationId === undefined) {
        throw httpErrors.forbidden(
            `User '${userId}' is not part of the organization: '${postAsOrganization}'`,
        );
    }

    return { organizationId };
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

    const subjectFilter = getEntitlementSubjectFilter({ subject });

    return await db
        .select({
            feature: premiumFeatureEntitlementTable.feature,
            expiresAt: premiumFeatureEntitlementTable.expiresAt,
        })
        .from(premiumFeatureEntitlementTable)
        .where(
            and(
                subjectFilter,
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
    const conversationRows = await db
        .select({ conversationId: conversationTable.id })
        .from(conversationTable)
        .where(
            and(
                getConversationSubjectFilter({ subject }),
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

    return uniqueSortedFeatures(features);
}

export function getPremiumFeaturesFromCreateRequest({
    requiresEventTicket,
    hasSurvey,
    preferredOpinionGroupCount,
}: {
    requiresEventTicket?: EventSlug;
    hasSurvey: boolean;
    preferredOpinionGroupCount?: number | null;
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

    return uniqueSortedFeatures(features);
}

async function clearPreferredOpinionGroupCountForSubject({
    db,
    subject,
}: {
    db: PostgresJsDatabase;
    subject: PremiumEntitlementSubject;
}): Promise<void> {
    await db
        .update(conversationTable)
        .set({ preferredOpinionGroupCount: null })
        .where(
            and(
                getConversationSubjectFilter({ subject }),
                isNotNull(conversationTable.preferredOpinionGroupCount),
            ),
        );
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
}): Promise<PremiumEntitlementSubject> {
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

        return { userId: user.userId };
    }

    if (subject.organizationName !== undefined) {
        const organizations = await db
            .select({ organizationId: organizationTable.id })
            .from(organizationTable)
            .where(eq(organizationTable.name, subject.organizationName))
            .limit(1);

        const organization = organizations.at(0);
        if (organization === undefined) {
            throw httpErrors.notFound("Organization not found");
        }

        return { organizationId: organization.organizationId };
    }

    throw httpErrors.badRequest("Invalid entitlement subject");
}

function toEntitlementItem(row: {
    id: number;
    userId: string | null;
    username: string | null;
    organizationId: number | null;
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
            userId: premiumFeatureEntitlementTable.userId,
            username: userTable.username,
            organizationId: premiumFeatureEntitlementTable.organizationId,
            organizationName: organizationTable.name,
            feature: premiumFeatureEntitlementTable.feature,
            startsAt: premiumFeatureEntitlementTable.startsAt,
            expiresAt: premiumFeatureEntitlementTable.expiresAt,
            revokedAt: premiumFeatureEntitlementTable.revokedAt,
            adminNote: premiumFeatureEntitlementTable.adminNote,
            createdAt: premiumFeatureEntitlementTable.createdAt,
            updatedAt: premiumFeatureEntitlementTable.updatedAt,
        })
        .from(premiumFeatureEntitlementTable)
        .leftJoin(
            userTable,
            eq(userTable.id, premiumFeatureEntitlementTable.userId),
        )
        .leftJoin(
            organizationTable,
            eq(
                organizationTable.id,
                premiumFeatureEntitlementTable.organizationId,
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

    await db.transaction(async (tx) => {
        for (const feature of features) {
            await tx.insert(premiumFeatureEntitlementTable).values({
                userId: subject.userId ?? null,
                organizationId: subject.organizationId ?? null,
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
            userId: premiumFeatureEntitlementTable.userId,
            organizationId: premiumFeatureEntitlementTable.organizationId,
            feature: premiumFeatureEntitlementTable.feature,
        })
        .from(premiumFeatureEntitlementTable)
        .where(eq(premiumFeatureEntitlementTable.id, data.entitlementId))
        .limit(1);
    const existingEntitlement = existingRows.at(0);
    const subject =
        existingEntitlement?.userId !== null &&
        existingEntitlement?.userId !== undefined
            ? { userId: existingEntitlement.userId }
            : existingEntitlement?.organizationId !== null &&
                existingEntitlement?.organizationId !== undefined
              ? { organizationId: existingEntitlement.organizationId }
              : undefined;
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

    const updateValues: PremiumFeatureEntitlementUpdateValues = {
        startsAt: new Date(data.startsAt),
        expiresAt:
            data.expiresAt !== undefined ? new Date(data.expiresAt) : null,
        adminNote: data.adminNote ?? null,
        updatedByUserId: adminUserId,
        updatedAt: now,
    };

    if (data.revokedAt !== undefined) {
        updateValues.revokedAt =
            data.revokedAt === null ? null : new Date(data.revokedAt);
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
