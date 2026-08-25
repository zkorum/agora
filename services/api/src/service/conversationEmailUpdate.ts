import {
    and,
    countDistinct,
    desc,
    eq,
    exists,
    gt,
    gte,
    inArray,
    isNotNull,
    isNull,
    lt,
    lte,
    ne,
    notExists,
    notInArray,
    or,
    sql,
} from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { buildConversationEmailParticipationQuery } from "@/shared-backend/conversationEmailUpdateParticipation.js";
import { getPrimaryDatabase } from "@/shared-backend/db.js";
import {
    conversationEmailUpdateConversationTable,
    conversationEmailUpdateDeliveryTable,
    conversationEmailUpdateEmailSuppressionTable,
    conversationEmailUpdateRecipientConversationTable,
    conversationEmailUpdateRecipientTable,
    conversationEmailUpdateScopeSafetyBlockTable,
    conversationEmailUpdateTable,
    conversationEmailUpdateTestAttemptTable,
    conversationEmailUpdateUserComplaintSuppressionTable,
    conversationEmailUpdateUserConversationPreferenceTable,
    conversationEmailUpdateUserGlobalSettingTable,
    conversationEmailUpdateUserProjectPreferenceTable,
    conversationContentTable,
    conversationTable,
    emailTable,
    organizationMembershipAllProjectCapabilityTable,
    organizationMembershipTable,
    organizationTable,
    premiumFeatureEntitlementTable,
    projectContactTable,
    projectOrganizationOwnershipTable,
    projectTable,
    userDisplayLanguageTable,
    userTable,
} from "@/shared-backend/schema.js";
import type {
    ConversationEmailUpdateAudienceEstimateRequest,
    ConversationEmailUpdateAudienceEstimateResponse,
    ConversationEmailUpdateConfigurationRequest,
    ConversationEmailUpdateConfigurationResponse,
    ConversationEmailUpdateConfigurationUpdateRequest,
    ConversationEmailUpdateConfigurationUpdateResponse,
    ConversationEmailUpdateConversationSummaryRequest,
    ConversationEmailUpdateConversationSummaryResponse,
    ConversationEmailUpdateHistoryDetailRequest,
    ConversationEmailUpdateHistoryDetailResponse,
    ConversationEmailUpdateHistoryListRequest,
    ConversationEmailUpdateHistoryListResponse,
    ConversationEmailUpdateHistoryRecord,
    ConversationEmailUpdateHistorySummary,
    ConversationEmailUpdatePreferenceGroup,
    ConversationEmailUpdatePreferenceUpdateRequest,
    ConversationEmailUpdatePreferenceUpdateResponse,
    ConversationEmailUpdatePreferencesRequest,
    ConversationEmailUpdatePreferencesResponse,
    ConversationEmailUpdateProjectSummaryRequest,
    ConversationEmailUpdateProjectSummaryResponse,
    ConversationEmailUpdateScope,
    ConversationEmailUpdateSelection,
    ConversationEmailUpdateSendRequest,
    ConversationEmailUpdateSendResponse,
    ConversationEmailUpdateSendTestRequest,
    ConversationEmailUpdateSendTestResponse,
    ConversationEmailUpdateTestStatusRequest,
    ConversationEmailUpdateTestStatusResponse,
    ConversationEmailUpdateWorkspaceRequest,
    ConversationEmailUpdateWorkspaceResponse,
} from "@/shared/types/dto.js";
import {
    decideConversationEmailFinalSend,
    decideConversationEmailTestRateLimit,
    resolveConversationEmailOnboardingAction,
    resolveConversationEmailParticipantPreferenceScope,
    resolveConversationEmailPreference,
    resolveConversationEmailSendingAvailability,
} from "./conversationEmailUpdatePolicy.js";
import { normalizeUserRichTextInput } from "./richText.js";

const NO_PROJECT_TITLE = "No Project";

export function resolveConversationEmailUpdateAuthoringAction({
    canAccessWorkspace,
    hasHistory,
}: {
    canAccessWorkspace: boolean;
    hasHistory: boolean;
}): "none" | "compose" | "history" {
    if (canAccessWorkspace) {
        return "compose";
    }
    return hasHistory ? "history" : "none";
}

interface AuthenticatedRequest<Request> {
    userId: string;
    request: Request;
}

export interface ConversationEmailUpdateService {
    getWorkspace: (
        params: AuthenticatedRequest<ConversationEmailUpdateWorkspaceRequest>,
    ) => Promise<ConversationEmailUpdateWorkspaceResponse>;
    listHistory: (
        params: AuthenticatedRequest<ConversationEmailUpdateHistoryListRequest>,
    ) => Promise<ConversationEmailUpdateHistoryListResponse>;
    getHistoryDetail: (
        params: AuthenticatedRequest<ConversationEmailUpdateHistoryDetailRequest>,
    ) => Promise<ConversationEmailUpdateHistoryDetailResponse>;
    estimateAudience: (
        params: AuthenticatedRequest<ConversationEmailUpdateAudienceEstimateRequest>,
    ) => Promise<ConversationEmailUpdateAudienceEstimateResponse>;
    sendTest: (
        params: AuthenticatedRequest<ConversationEmailUpdateSendTestRequest>,
    ) => Promise<ConversationEmailUpdateSendTestResponse>;
    getTestStatus: (
        params: AuthenticatedRequest<ConversationEmailUpdateTestStatusRequest>,
    ) => Promise<ConversationEmailUpdateTestStatusResponse>;
    send: (
        params: AuthenticatedRequest<ConversationEmailUpdateSendRequest>,
    ) => Promise<ConversationEmailUpdateSendResponse>;
    getPreferences: (
        params: AuthenticatedRequest<ConversationEmailUpdatePreferencesRequest>,
    ) => Promise<ConversationEmailUpdatePreferencesResponse>;
    updatePreference: (
        params: AuthenticatedRequest<ConversationEmailUpdatePreferenceUpdateRequest>,
    ) => Promise<ConversationEmailUpdatePreferenceUpdateResponse>;
    getConfiguration: (
        params: AuthenticatedRequest<ConversationEmailUpdateConfigurationRequest>,
    ) => Promise<ConversationEmailUpdateConfigurationResponse>;
    updateConfiguration: (
        params: AuthenticatedRequest<ConversationEmailUpdateConfigurationUpdateRequest>,
    ) => Promise<ConversationEmailUpdateConfigurationUpdateResponse>;
    getConversationSummary: (
        params: AuthenticatedRequest<ConversationEmailUpdateConversationSummaryRequest>,
    ) => Promise<ConversationEmailUpdateConversationSummaryResponse>;
    getProjectSummary: (
        params: AuthenticatedRequest<ConversationEmailUpdateProjectSummaryRequest>,
    ) => Promise<ConversationEmailUpdateProjectSummaryResponse>;
}

type AuthorizedConversationDao = Awaited<
    ReturnType<typeof listAuthorizedConversations>
>[number];
type PreferenceProjectDao = Awaited<
    ReturnType<typeof queryPreferenceProjects>
>[number];
type PreferenceConversationDao = Awaited<
    ReturnType<typeof queryPreferenceConversations>
>[number];
type HistoryDao = Awaited<ReturnType<typeof queryVisibleHistoryRows>>[number];
type HistoryContext = ConversationEmailUpdateHistoryListRequest["context"];
type HistoryConversationDao = Awaited<
    ReturnType<typeof loadHistoryConversations>
>[number];
type ConfigurationProjectDao = Awaited<
    ReturnType<typeof queryProjectConfigurationRows>
>[number];
type ConfigurationConversationDao = Awaited<
    ReturnType<typeof queryConversationConfigurationRows>
>[number];
type DisplayLanguage =
    (typeof userDisplayLanguageTable.$inferSelect)["languageCode"];
type TestAttemptStatus =
    (typeof conversationEmailUpdateTestAttemptTable.$inferSelect)["status"];
type TestStatus = Extract<
    ConversationEmailUpdateTestStatusResponse,
    { success: true }
>["status"];

const WORKSPACE_QUERY_BATCH_SIZE = 8;

export async function mapInBatches<Input, Output>({
    items,
    batchSize,
    map,
}: {
    items: readonly Input[];
    batchSize: number;
    map: (item: Input) => Promise<Output>;
}): Promise<Output[]> {
    if (!Number.isInteger(batchSize) || batchSize < 1) {
        throw new RangeError("batchSize must be a positive integer");
    }
    const outputs: Output[] = [];
    for (let offset = 0; offset < items.length; offset += batchSize) {
        outputs.push(
            ...(await Promise.all(
                items.slice(offset, offset + batchSize).map(map),
            )),
        );
    }
    return outputs;
}

export function mapConversationEmailUpdateTestStatus({
    status,
    finishedAt,
    errorCode,
}: {
    status: TestAttemptStatus;
    finishedAt: Date | null;
    errorCode: string | null;
}): TestStatus | undefined {
    if (status === "provider_accepted") {
        return finishedAt === null
            ? undefined
            : { state: "provider_accepted", providerAcceptedAt: finishedAt };
    }
    if (
        status === "retryable_rejected" ||
        status === "permanent_rejected" ||
        status === "unknown"
    ) {
        return {
            state: "failed",
            reason:
                status === "permanent_rejected" &&
                errorCode === "authorization_failed"
                    ? "authorization_rejected"
                    : status,
        };
    }
    return { state: status };
}

export interface RequiredOwnerSnapshot {
    userId: string;
    emailCredentialId: number;
    email: string;
    displayLanguage: DisplayLanguage;
}

export interface RequiredOwnerCopySet {
    requiredOwnerUserIds: string[];
    ownerSnapshots: RequiredOwnerSnapshot[] | undefined;
}

export function resolveCompleteOwnerSnapshots({
    requiredOwnerUserIds,
    candidates,
}: {
    requiredOwnerUserIds: readonly string[];
    candidates: readonly RequiredOwnerSnapshot[];
}): RequiredOwnerSnapshot[] | undefined {
    const requiredIds = [...new Set(requiredOwnerUserIds)];
    const candidateByUserId = new Map<string, RequiredOwnerSnapshot>();
    for (const candidate of candidates) {
        if (candidateByUserId.has(candidate.userId)) return undefined;
        candidateByUserId.set(candidate.userId, candidate);
    }
    const snapshots = requiredIds.flatMap((userId) => {
        const candidate = candidateByUserId.get(userId);
        return candidate === undefined ? [] : [candidate];
    });
    return snapshots.length === requiredIds.length ? snapshots : undefined;
}

export function resolveRequiredOwnerCopySet({
    requiredOwnerUserIds,
    candidates,
}: {
    requiredOwnerUserIds: readonly string[];
    candidates: readonly RequiredOwnerSnapshot[];
}): RequiredOwnerCopySet {
    const uniqueRequiredOwnerUserIds = [...new Set(requiredOwnerUserIds)];
    return {
        requiredOwnerUserIds: uniqueRequiredOwnerUserIds,
        ownerSnapshots: resolveCompleteOwnerSnapshots({
            requiredOwnerUserIds: uniqueRequiredOwnerUserIds,
            candidates,
        }),
    };
}

interface BuildPreferenceGroupsParams {
    globalPaused: boolean;
    projectRows: readonly PreferenceProjectDao[];
    conversationRows: readonly PreferenceConversationDao[];
}

export function buildConversationEmailPreferenceGroups({
    globalPaused,
    projectRows,
    conversationRows,
}: BuildPreferenceGroupsParams): ConversationEmailUpdatePreferenceGroup[] {
    const projectById = new Map(
        projectRows.map((row) => [row.project_id, row]),
    );
    const conversationByProject = new Map<
        number,
        PreferenceConversationDao[]
    >();
    const noProjectRows: PreferenceConversationDao[] = [];
    for (const row of conversationRows) {
        if (row.scope_kind === "no_project") {
            noProjectRows.push(row);
            continue;
        }
        const rows = conversationByProject.get(row.project_id) ?? [];
        rows.push(row);
        conversationByProject.set(row.project_id, rows);
    }

    const projectIds = new Set([
        ...projectRows.map((row) => row.project_id),
        ...conversationByProject.keys(),
    ]);
    const groups: ConversationEmailUpdatePreferenceGroup[] = [];
    for (const projectId of [...projectIds].sort(
        (left, right) => left - right,
    )) {
        const project = projectById.get(projectId);
        const children = conversationByProject.get(projectId) ?? [];
        const firstChild = children.at(0);
        if (project === undefined && firstChild === undefined) continue;
        const projectEnabled = project?.enabled;
        groups.push({
            kind: "project",
            projectSlug:
                project?.project_slug ?? firstChild?.project_slug ?? "",
            projectTitle:
                project?.project_title ?? firstChild?.project_title ?? "",
            state:
                projectEnabled === undefined
                    ? "undisclosed"
                    : projectEnabled
                      ? "enabled"
                      : "disabled",
            resolvedEnabled: !globalPaused && projectEnabled === true,
            availability:
                (project?.available ??
                children.some((conversation) => conversation.available))
                    ? "available"
                    : "temporarily_unavailable",
            conversations: children
                .sort((left, right) =>
                    left.conversation_title.localeCompare(
                        right.conversation_title,
                    ),
                )
                .map((row) => ({
                    conversationSlugId: row.conversation_slug_id,
                    conversationTitle: row.conversation_title,
                    state: row.enabled ? "enabled" : "disabled",
                    resolvedEnabled: resolveConversationEmailPreference({
                        globalPaused,
                        projectEnabled,
                        conversationEnabled: row.enabled,
                        scopeKind: "project",
                    }),
                    availability: row.available
                        ? "available"
                        : "temporarily_unavailable",
                })),
        });
    }
    if (noProjectRows.length > 0) {
        groups.push({
            kind: "no_project",
            availability: noProjectRows.some((row) => row.available)
                ? "available"
                : "temporarily_unavailable",
            conversations: noProjectRows
                .sort((left, right) =>
                    left.conversation_title.localeCompare(
                        right.conversation_title,
                    ),
                )
                .map((row) => ({
                    conversationSlugId: row.conversation_slug_id,
                    conversationTitle: row.conversation_title,
                    state: row.enabled ? "enabled" : "disabled",
                    resolvedEnabled: resolveConversationEmailPreference({
                        globalPaused,
                        projectEnabled: undefined,
                        conversationEnabled: row.enabled,
                        scopeKind: "no_project",
                    }),
                    availability: row.available
                        ? "available"
                        : "temporarily_unavailable",
                })),
        });
    }
    return groups;
}

function isUniqueViolation(error: unknown): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23505"
    );
}

function normalizeContactEmail(email: string | null): string | undefined {
    const normalized = email?.trim().toLowerCase();
    return normalized === undefined || normalized === ""
        ? undefined
        : normalized;
}

function getProjectScopeKind(
    autoProvisionedForOrganizationId: number | null,
): "project" | "no_project" {
    return autoProvisionedForOrganizationId === null ? "project" : "no_project";
}

async function getPrimaryEmail({
    db,
    userId,
}: {
    db: PostgresJsDatabase;
    userId: string;
}) {
    const rows = await db
        .select({ credential_id: emailTable.id, email: emailTable.email })
        .from(emailTable)
        .innerJoin(
            userTable,
            and(
                eq(userTable.id, emailTable.userId),
                eq(userTable.isDeleted, false),
            ),
        )
        .where(
            and(
                eq(emailTable.userId, userId),
                eq(emailTable.type, "primary"),
                eq(emailTable.isDeleted, false),
            ),
        )
        .limit(1);
    return rows.at(0);
}

async function listAuthorizedConversations({
    db,
    userId,
    now,
    projectId,
}: {
    db: PostgresJsDatabase;
    userId: string;
    now: Date;
    projectId?: number;
}) {
    const authorizedProject = db
        .selectDistinctOn([projectTable.id], {
            projectId: sql<number>`${projectTable.id}`.as(
                "authorized_project_id",
            ),
            organizationId:
                sql<number>`${projectOrganizationOwnershipTable.organizationId}`.as(
                    "authorized_organization_id",
                ),
            entitlementId: sql<number>`${premiumFeatureEntitlementTable.id}`.as(
                "authorized_entitlement_id",
            ),
        })
        .from(projectTable)
        .innerJoin(
            projectOrganizationOwnershipTable,
            and(
                eq(
                    projectOrganizationOwnershipTable.projectId,
                    projectTable.id,
                ),
                isNull(projectOrganizationOwnershipTable.deletedAt),
            ),
        )
        .innerJoin(
            organizationTable,
            and(
                eq(
                    organizationTable.id,
                    projectOrganizationOwnershipTable.organizationId,
                ),
                isNull(organizationTable.deletedAt),
            ),
        )
        .innerJoin(
            organizationMembershipTable,
            and(
                eq(
                    organizationMembershipTable.organizationId,
                    projectOrganizationOwnershipTable.organizationId,
                ),
                eq(organizationMembershipTable.userId, userId),
                isNull(organizationMembershipTable.deletedAt),
            ),
        )
        .innerJoin(
            userTable,
            and(
                eq(userTable.id, organizationMembershipTable.userId),
                eq(userTable.isDeleted, false),
            ),
        )
        .innerJoin(
            organizationMembershipAllProjectCapabilityTable,
            and(
                eq(
                    organizationMembershipAllProjectCapabilityTable.organizationMembershipId,
                    organizationMembershipTable.id,
                ),
                eq(
                    organizationMembershipAllProjectCapabilityTable.capability,
                    "conversation_email_update",
                ),
                isNull(
                    organizationMembershipAllProjectCapabilityTable.deletedAt,
                ),
            ),
        )
        .innerJoin(
            premiumFeatureEntitlementTable,
            and(
                eq(
                    premiumFeatureEntitlementTable.organizationId,
                    projectOrganizationOwnershipTable.organizationId,
                ),
                eq(
                    premiumFeatureEntitlementTable.feature,
                    "conversation_email_update",
                ),
                lte(premiumFeatureEntitlementTable.startsAt, now),
                isNull(premiumFeatureEntitlementTable.revokedAt),
                or(
                    isNull(premiumFeatureEntitlementTable.expiresAt),
                    gt(premiumFeatureEntitlementTable.expiresAt, now),
                ),
            ),
        )
        .where(
            and(
                isNull(projectTable.deletedAt),
                projectId === undefined
                    ? undefined
                    : eq(projectTable.id, projectId),
            ),
        )
        .orderBy(
            projectTable.id,
            projectOrganizationOwnershipTable.organizationId,
            premiumFeatureEntitlementTable.id,
        )
        .as("authorized_project");

    const rows = await db
        .select({
            project_id: projectTable.id,
            project_slug: projectTable.slug,
            project_title: projectTable.title,
            auto_provisioned_for_organization_id:
                projectTable.autoProvisionedForOrganizationId,
            project_default_enabled:
                projectTable.conversationEmailUpdateDefaultEnabled,
            conversation_id: conversationTable.id,
            conversation_slug_id: conversationTable.slugId,
            conversation_title: conversationContentTable.title,
            participation_mode: conversationTable.participationMode,
            conversation_override:
                conversationTable.conversationEmailUpdateEnabledOverride,
            contact_first_name: projectContactTable.firstName,
            contact_last_name: projectContactTable.lastName,
            contact_email: projectContactTable.email,
            authorizing_organization_id: authorizedProject.organizationId,
            authorizing_entitlement_id: authorizedProject.entitlementId,
            safety_blocked: exists(
                db
                    .select({
                        id: conversationEmailUpdateScopeSafetyBlockTable.id,
                    })
                    .from(conversationEmailUpdateScopeSafetyBlockTable)
                    .where(
                        and(
                            isNull(
                                conversationEmailUpdateScopeSafetyBlockTable.liftedAt,
                            ),
                            or(
                                and(
                                    eq(
                                        conversationEmailUpdateScopeSafetyBlockTable.targetKind,
                                        "organization",
                                    ),
                                    eq(
                                        conversationEmailUpdateScopeSafetyBlockTable.organizationId,
                                        authorizedProject.organizationId,
                                    ),
                                ),
                                and(
                                    eq(
                                        conversationEmailUpdateScopeSafetyBlockTable.targetKind,
                                        "project",
                                    ),
                                    eq(
                                        conversationEmailUpdateScopeSafetyBlockTable.projectId,
                                        projectTable.id,
                                    ),
                                ),
                                and(
                                    eq(
                                        conversationEmailUpdateScopeSafetyBlockTable.targetKind,
                                        "conversation",
                                    ),
                                    eq(
                                        conversationEmailUpdateScopeSafetyBlockTable.conversationId,
                                        conversationTable.id,
                                    ),
                                ),
                                and(
                                    eq(
                                        conversationEmailUpdateScopeSafetyBlockTable.targetKind,
                                        "facilitator",
                                    ),
                                    eq(
                                        conversationEmailUpdateScopeSafetyBlockTable.facilitatorUserId,
                                        userId,
                                    ),
                                ),
                            ),
                        ),
                    ),
            ),
        })
        .from(authorizedProject)
        .innerJoin(
            projectTable,
            eq(projectTable.id, authorizedProject.projectId),
        )
        .innerJoin(
            conversationTable,
            and(
                eq(conversationTable.projectId, projectTable.id),
                isNotNull(conversationTable.currentContentId),
            ),
        )
        .innerJoin(
            conversationContentTable,
            eq(conversationContentTable.id, conversationTable.currentContentId),
        )
        .leftJoin(
            projectContactTable,
            and(
                eq(projectContactTable.projectId, projectTable.id),
                isNull(projectContactTable.deletedAt),
            ),
        )
        .where(
            or(
                isNotNull(projectTable.autoProvisionedForOrganizationId),
                eq(projectTable.directoryVisibility, "listed"),
            ),
        )
        .orderBy(projectTable.slug, conversationTable.slugId);

    return rows.map((row) => {
        const contactName =
            `${row.contact_first_name ?? ""} ${row.contact_last_name ?? ""}`.trim();
        return {
            project_id: row.project_id,
            project_slug: row.project_slug,
            project_title: row.project_title,
            scope_kind: getProjectScopeKind(
                row.auto_provisioned_for_organization_id,
            ),
            project_default_enabled: row.project_default_enabled,
            conversation_id: row.conversation_id,
            conversation_slug_id: row.conversation_slug_id,
            conversation_title: row.conversation_title,
            participation_mode: row.participation_mode,
            conversation_override: row.conversation_override,
            contact_name: contactName === "" ? null : contactName,
            contact_email: row.contact_email,
            authorizing_organization_id: row.authorizing_organization_id,
            authorizing_entitlement_id: row.authorizing_entitlement_id,
            safety_blocked: row.safety_blocked === true,
        };
    });
}

function historyProjectVisibilityPredicate({
    db,
    userId,
}: {
    db: PostgresJsDatabase;
    userId: string;
}) {
    return and(
        isNull(projectTable.deletedAt),
        or(
            isNotNull(projectTable.autoProvisionedForOrganizationId),
            eq(projectTable.directoryVisibility, "listed"),
        ),
        exists(
            db
                .select({ id: projectOrganizationOwnershipTable.id })
                .from(projectOrganizationOwnershipTable)
                .innerJoin(
                    organizationTable,
                    and(
                        eq(
                            organizationTable.id,
                            projectOrganizationOwnershipTable.organizationId,
                        ),
                        isNull(organizationTable.deletedAt),
                    ),
                )
                .innerJoin(
                    organizationMembershipTable,
                    and(
                        eq(
                            organizationMembershipTable.organizationId,
                            projectOrganizationOwnershipTable.organizationId,
                        ),
                        eq(organizationMembershipTable.userId, userId),
                        isNull(organizationMembershipTable.deletedAt),
                    ),
                )
                .innerJoin(
                    userTable,
                    and(
                        eq(userTable.id, organizationMembershipTable.userId),
                        eq(userTable.isDeleted, false),
                    ),
                )
                .innerJoin(
                    organizationMembershipAllProjectCapabilityTable,
                    and(
                        eq(
                            organizationMembershipAllProjectCapabilityTable.organizationMembershipId,
                            organizationMembershipTable.id,
                        ),
                        eq(
                            organizationMembershipAllProjectCapabilityTable.capability,
                            "conversation_email_update",
                        ),
                        isNull(
                            organizationMembershipAllProjectCapabilityTable.deletedAt,
                        ),
                    ),
                )
                .where(
                    and(
                        eq(
                            projectOrganizationOwnershipTable.projectId,
                            projectTable.id,
                        ),
                        isNull(projectOrganizationOwnershipTable.deletedAt),
                    ),
                ),
        ),
    );
}

async function isHistoryContextVisible({
    db,
    userId,
    context,
}: {
    db: PostgresJsDatabase;
    userId: string;
    context: HistoryContext;
}): Promise<boolean> {
    const visibility = historyProjectVisibilityPredicate({ db, userId });
    if (context.kind === "conversation") {
        const rows = await db
            .select({ id: conversationTable.id })
            .from(conversationTable)
            .innerJoin(
                projectTable,
                eq(projectTable.id, conversationTable.projectId),
            )
            .where(
                and(
                    visibility,
                    eq(conversationTable.slugId, context.conversationSlugId),
                ),
            )
            .limit(1);
        return rows.length > 0;
    }

    const rows = await db
        .select({ id: projectTable.id })
        .from(projectTable)
        .where(
            and(
                visibility,
                context.kind === "project"
                    ? and(
                          eq(projectTable.slug, context.projectSlug),
                          isNull(projectTable.autoProvisionedForOrganizationId),
                      )
                    : undefined,
            ),
        )
        .limit(1);
    return rows.length > 0;
}

function isSendingEnabled({
    row,
    operationallyEnabled,
}: {
    row: AuthorizedConversationDao;
    operationallyEnabled: boolean;
}): boolean {
    return resolveConversationEmailSendingAvailability({
        operationallyEnabled,
        featureAvailable: true,
        safetyBlocked: row.safety_blocked,
        configuredEnabled:
            row.conversation_override ?? row.project_default_enabled,
        hasParticipantContactEmail:
            normalizeContactEmail(row.contact_email) !== undefined,
    }).available;
}

interface ResolvedSelection {
    project: AuthorizedConversationDao;
    conversations: AuthorizedConversationDao[];
}

type ResolveSelectionResult =
    | { success: true; value: ResolvedSelection }
    | {
          success: false;
          reason: "scope_not_found" | "conversation_not_in_scope";
      };

function resolveSelection({
    rows,
    selection,
}: {
    rows: readonly AuthorizedConversationDao[];
    selection: ConversationEmailUpdateSelection;
}): ResolveSelectionResult {
    if (selection.kind === "project") {
        const scopeRows = rows.filter(
            (row) =>
                row.scope_kind === "project" &&
                row.project_slug === selection.projectSlug,
        );
        const project = scopeRows.at(0);
        if (project === undefined) {
            return { success: false, reason: "scope_not_found" };
        }
        const requestedIds = new Set(selection.conversationSlugIds);
        const conversations = scopeRows.filter((row) =>
            requestedIds.has(row.conversation_slug_id),
        );
        if (
            requestedIds.size !== selection.conversationSlugIds.length ||
            conversations.length !== requestedIds.size
        ) {
            return { success: false, reason: "conversation_not_in_scope" };
        }
        return { success: true, value: { project, conversations } };
    }
    const conversation = rows.find(
        (row) =>
            row.scope_kind === "no_project" &&
            row.conversation_slug_id === selection.conversationSlugId,
    );
    return conversation === undefined
        ? { success: false, reason: "conversation_not_in_scope" }
        : {
              success: true,
              value: { project: conversation, conversations: [conversation] },
          };
}

async function countEligibleAudience({
    db,
    selection,
    cutoffAt,
    excludedUserIds,
}: {
    db: PostgresJsDatabase;
    selection: ResolvedSelection;
    cutoffAt: Date;
    excludedUserIds: readonly string[];
}): Promise<number> {
    const selectedConversation = selection.conversations.at(0);
    if (selectedConversation === undefined) return 0;
    const preferenceScope =
        resolveConversationEmailParticipantPreferenceScope({
            scopeKind: selectedConversation.scope_kind,
            projectDefaultEnabled:
                selectedConversation.project_default_enabled,
            conversationOverrideEnabled:
                selectedConversation.conversation_override,
        });
    if (preferenceScope === undefined) return 0;
    const conversationIds = selection.conversations.map(
        (row) => row.conversation_id,
    );
    const participation = buildConversationEmailParticipationQuery({
        db,
        cutoffAt,
        scope: { kind: "conversation_ids", conversationIds },
    }).as("participation");
    const preferenceCondition =
        preferenceScope === "project"
            ? and(
                  eq(
                      conversationEmailUpdateUserProjectPreferenceTable.enabled,
                      true,
                  ),
                  or(
                      isNull(
                          conversationEmailUpdateUserConversationPreferenceTable.enabled,
                      ),
                      ne(
                          conversationEmailUpdateUserConversationPreferenceTable.enabled,
                          false,
                      ),
                  ),
              )
            : eq(
                  conversationEmailUpdateUserConversationPreferenceTable.enabled,
                  true,
              );
    const rows = await db
        .select({ eligible_count: countDistinct(participation.userId) })
        .from(participation)
        .innerJoin(
            userTable,
            and(
                eq(userTable.id, participation.userId),
                eq(userTable.isDeleted, false),
            ),
        )
        .innerJoin(
            emailTable,
            and(
                eq(emailTable.userId, participation.userId),
                eq(emailTable.type, "primary"),
                eq(emailTable.isDeleted, false),
            ),
        )
        .leftJoin(
            conversationEmailUpdateUserGlobalSettingTable,
            eq(
                conversationEmailUpdateUserGlobalSettingTable.userId,
                participation.userId,
            ),
        )
        .leftJoin(
            conversationEmailUpdateUserProjectPreferenceTable,
            and(
                eq(
                    conversationEmailUpdateUserProjectPreferenceTable.userId,
                    participation.userId,
                ),
                eq(
                    conversationEmailUpdateUserProjectPreferenceTable.projectId,
                    selection.project.project_id,
                ),
            ),
        )
        .leftJoin(
            conversationEmailUpdateUserConversationPreferenceTable,
            and(
                eq(
                    conversationEmailUpdateUserConversationPreferenceTable.userId,
                    participation.userId,
                ),
                eq(
                    conversationEmailUpdateUserConversationPreferenceTable.conversationId,
                    participation.conversationId,
                ),
            ),
        )
        .where(
            and(
                isNull(conversationEmailUpdateUserGlobalSettingTable.pausedAt),
                notExists(
                    db
                        .select({
                            id: conversationEmailUpdateUserComplaintSuppressionTable.id,
                        })
                        .from(
                            conversationEmailUpdateUserComplaintSuppressionTable,
                        )
                        .where(
                            and(
                                eq(
                                    conversationEmailUpdateUserComplaintSuppressionTable.userId,
                                    participation.userId,
                                ),
                                isNull(
                                    conversationEmailUpdateUserComplaintSuppressionTable.liftedAt,
                                ),
                            ),
                        ),
                ),
                notExists(
                    db
                        .select({
                            id: conversationEmailUpdateEmailSuppressionTable.id,
                        })
                        .from(conversationEmailUpdateEmailSuppressionTable)
                        .where(
                            and(
                                eq(
                                    conversationEmailUpdateEmailSuppressionTable.canonicalEmail,
                                    emailTable.email,
                                ),
                                isNull(
                                    conversationEmailUpdateEmailSuppressionTable.liftedAt,
                                ),
                            ),
                        ),
                ),
                preferenceCondition,
                excludedUserIds.length === 0
                    ? undefined
                    : notInArray(participation.userId, [...excludedUserIds]),
            ),
        );
    return rows.at(0)?.eligible_count ?? 0;
}

async function listRequiredOwnerUserIds({
    db,
    projectId,
}: {
    db: PostgresJsDatabase;
    projectId: number;
}): Promise<string[]> {
    const rows = await db
        .select({ userId: organizationMembershipTable.userId })
        .from(organizationMembershipTable)
        .innerJoin(
            projectOrganizationOwnershipTable,
            and(
                eq(
                    projectOrganizationOwnershipTable.organizationId,
                    organizationMembershipTable.organizationId,
                ),
                eq(projectOrganizationOwnershipTable.projectId, projectId),
                isNull(projectOrganizationOwnershipTable.deletedAt),
            ),
        )
        .innerJoin(
            organizationTable,
            and(
                eq(
                    organizationTable.id,
                    organizationMembershipTable.organizationId,
                ),
                isNull(organizationTable.deletedAt),
            ),
        )
        .innerJoin(
            organizationMembershipAllProjectCapabilityTable,
            and(
                eq(
                    organizationMembershipAllProjectCapabilityTable.organizationMembershipId,
                    organizationMembershipTable.id,
                ),
                eq(
                    organizationMembershipAllProjectCapabilityTable.capability,
                    "conversation_email_update",
                ),
                isNull(
                    organizationMembershipAllProjectCapabilityTable.deletedAt,
                ),
            ),
        )
        .where(isNull(organizationMembershipTable.deletedAt));
    return [...new Set(rows.map((row) => row.userId))];
}

export async function lockRequiredOwnerUserIds({
    db,
    organizationIds,
}: {
    db: PostgresJsDatabase;
    organizationIds: readonly number[];
}): Promise<string[]> {
    const orderedOrganizationIds = [...new Set(organizationIds)].sort(
        (left, right) => left - right,
    );
    if (orderedOrganizationIds.length === 0) return [];

    // Parent UPDATE locks make concurrent FK inserts wait. Keep this global
    // organization -> membership -> capability order across projects.
    const organizations = await db
        .select({ id: organizationTable.id })
        .from(organizationTable)
        .where(
            and(
                inArray(organizationTable.id, orderedOrganizationIds),
                isNull(organizationTable.deletedAt),
            ),
        )
        .orderBy(organizationTable.id)
        .for("update");
    if (organizations.length === 0) return [];

    const memberships = await db
        .select({
            id: organizationMembershipTable.id,
            userId: organizationMembershipTable.userId,
        })
        .from(organizationMembershipTable)
        .where(
            and(
                inArray(
                    organizationMembershipTable.organizationId,
                    organizations.map((organization) => organization.id),
                ),
                isNull(organizationMembershipTable.deletedAt),
            ),
        )
        .orderBy(organizationMembershipTable.id)
        .for("update");
    if (memberships.length === 0) return [];

    const capabilities = await db
        .select({
            id: organizationMembershipAllProjectCapabilityTable.id,
            membershipId:
                organizationMembershipAllProjectCapabilityTable.organizationMembershipId,
        })
        .from(organizationMembershipAllProjectCapabilityTable)
        .where(
            and(
                inArray(
                    organizationMembershipAllProjectCapabilityTable.organizationMembershipId,
                    memberships.map((membership) => membership.id),
                ),
                eq(
                    organizationMembershipAllProjectCapabilityTable.capability,
                    "conversation_email_update",
                ),
                isNull(
                    organizationMembershipAllProjectCapabilityTable.deletedAt,
                ),
            ),
        )
        .orderBy(organizationMembershipAllProjectCapabilityTable.id)
        .for("update");
    const capableMembershipIds = new Set(
        capabilities.map((capability) => capability.membershipId),
    );
    return [
        ...new Set(
            memberships.flatMap((membership) =>
                capableMembershipIds.has(membership.id)
                    ? [membership.userId]
                    : [],
            ),
        ),
    ];
}

async function resolveRequiredOwnerCopies({
    db,
    projectId,
    conversationIds,
    facilitatorUserId,
}: {
    db: PostgresJsDatabase;
    projectId: number;
    conversationIds: readonly number[];
    facilitatorUserId: string;
}): Promise<RequiredOwnerCopySet> {
    const ownerships = await db
        .select({
            organizationId: projectOrganizationOwnershipTable.organizationId,
        })
        .from(projectOrganizationOwnershipTable)
        .innerJoin(
            organizationTable,
            and(
                eq(
                    organizationTable.id,
                    projectOrganizationOwnershipTable.organizationId,
                ),
                isNull(organizationTable.deletedAt),
            ),
        )
        .where(
            and(
                eq(projectOrganizationOwnershipTable.projectId, projectId),
                isNull(projectOrganizationOwnershipTable.deletedAt),
            ),
        )
        .orderBy(projectOrganizationOwnershipTable.organizationId)
        .for("update", { of: projectOrganizationOwnershipTable });
    const organizationIds = ownerships.map((row) => row.organizationId);
    if (organizationIds.length === 0) {
        return { requiredOwnerUserIds: [], ownerSnapshots: undefined };
    }

    const activeSafetyBlocks = await db
        .select({ id: conversationEmailUpdateScopeSafetyBlockTable.id })
        .from(conversationEmailUpdateScopeSafetyBlockTable)
        .where(
            and(
                isNull(conversationEmailUpdateScopeSafetyBlockTable.liftedAt),
                or(
                    and(
                        eq(
                            conversationEmailUpdateScopeSafetyBlockTable.targetKind,
                            "organization",
                        ),
                        inArray(
                            conversationEmailUpdateScopeSafetyBlockTable.organizationId,
                            organizationIds,
                        ),
                    ),
                    and(
                        eq(
                            conversationEmailUpdateScopeSafetyBlockTable.targetKind,
                            "project",
                        ),
                        eq(
                            conversationEmailUpdateScopeSafetyBlockTable.projectId,
                            projectId,
                        ),
                    ),
                    and(
                        eq(
                            conversationEmailUpdateScopeSafetyBlockTable.targetKind,
                            "conversation",
                        ),
                        inArray(
                            conversationEmailUpdateScopeSafetyBlockTable.conversationId,
                            conversationIds,
                        ),
                    ),
                    and(
                        eq(
                            conversationEmailUpdateScopeSafetyBlockTable.targetKind,
                            "facilitator",
                        ),
                        eq(
                            conversationEmailUpdateScopeSafetyBlockTable.facilitatorUserId,
                            facilitatorUserId,
                        ),
                    ),
                ),
            ),
        )
        .limit(1);
    const requiredOwnerUserIds = await lockRequiredOwnerUserIds({
        db,
        organizationIds,
    });
    if (requiredOwnerUserIds.length === 0) {
        return { requiredOwnerUserIds, ownerSnapshots: undefined };
    }
    if (activeSafetyBlocks.length > 0) {
        return { requiredOwnerUserIds, ownerSnapshots: undefined };
    }

    const accounts = await db
        .select({
            userId: userTable.id,
            emailCredentialId: emailTable.id,
            email: emailTable.email,
            displayLanguage: userDisplayLanguageTable.languageCode,
        })
        .from(userTable)
        .innerJoin(
            emailTable,
            and(
                eq(emailTable.userId, userTable.id),
                eq(emailTable.type, "primary"),
                eq(emailTable.isDeleted, false),
            ),
        )
        .leftJoin(
            userDisplayLanguageTable,
            eq(userDisplayLanguageTable.userId, userTable.id),
        )
        .where(
            and(
                inArray(userTable.id, requiredOwnerUserIds),
                eq(userTable.isDeleted, false),
            ),
        )
        .orderBy(userTable.id);
    const complaintRows = await db
        .select({
            userId: conversationEmailUpdateUserComplaintSuppressionTable.userId,
        })
        .from(conversationEmailUpdateUserComplaintSuppressionTable)
        .where(
            and(
                inArray(
                    conversationEmailUpdateUserComplaintSuppressionTable.userId,
                    requiredOwnerUserIds,
                ),
                isNull(
                    conversationEmailUpdateUserComplaintSuppressionTable.liftedAt,
                ),
            ),
        );
    const accountEmails = accounts.map((row) => row.email);
    const suppressedEmailRows =
        accountEmails.length === 0
            ? []
            : await db
                  .select({
                      email: conversationEmailUpdateEmailSuppressionTable.canonicalEmail,
                  })
                  .from(conversationEmailUpdateEmailSuppressionTable)
                  .where(
                      and(
                          inArray(
                              conversationEmailUpdateEmailSuppressionTable.canonicalEmail,
                              accountEmails,
                          ),
                          isNull(
                              conversationEmailUpdateEmailSuppressionTable.liftedAt,
                          ),
                      ),
                  );
    const complainedUserIds = new Set(complaintRows.map((row) => row.userId));
    const suppressedEmails = new Set(
        suppressedEmailRows.map((row) => row.email),
    );
    return resolveRequiredOwnerCopySet({
        requiredOwnerUserIds,
        candidates: accounts.flatMap((account) =>
            complainedUserIds.has(account.userId) ||
            suppressedEmails.has(account.email)
                ? []
                : [
                      {
                          userId: account.userId,
                          emailCredentialId: account.emailCredentialId,
                          email: account.email,
                          displayLanguage: account.displayLanguage ?? "en",
                      },
                  ],
        ),
    });
}

async function estimateResolvedSelection({
    db,
    selection,
    cutoffAt,
}: {
    db: PostgresJsDatabase;
    selection: ResolvedSelection;
    cutoffAt: Date;
}): Promise<{
    estimatedEligibleRecipientCount: number;
    requiredOwnerCopyCount: number;
}> {
    const requiredOwnerUserIds = await listRequiredOwnerUserIds({
        db,
        projectId: selection.project.project_id,
    });
    const estimatedEligibleRecipientCount = await countEligibleAudience({
        db,
        selection,
        cutoffAt,
        excludedUserIds: requiredOwnerUserIds,
    });
    return {
        estimatedEligibleRecipientCount,
        requiredOwnerCopyCount: requiredOwnerUserIds.length,
    };
}

function groupScopes({
    rows,
    estimates,
    operationalSendingEnabled,
}: {
    rows: readonly AuthorizedConversationDao[];
    estimates: ReadonlyMap<number, number>;
    operationalSendingEnabled: boolean;
}): ConversationEmailUpdateScope[] {
    const projectRows = new Map<number, AuthorizedConversationDao[]>();
    const noProjectRows: AuthorizedConversationDao[] = [];
    for (const row of rows) {
        if (row.scope_kind === "no_project") {
            noProjectRows.push(row);
            continue;
        }
        const current = projectRows.get(row.project_id) ?? [];
        current.push(row);
        projectRows.set(row.project_id, current);
    }
    const scopes: ConversationEmailUpdateScope[] = [];
    for (const rowsInProject of projectRows.values()) {
        const project = rowsInProject.at(0);
        const participantContactEmail = normalizeContactEmail(
            project?.contact_email ?? null,
        );
        if (project === undefined || participantContactEmail === undefined) {
            continue;
        }
        scopes.push({
            kind: "project",
            projectSlug: project.project_slug,
            title: project.project_title,
            participantContactEmail,
            conversations: rowsInProject.map((row) => ({
                conversationSlugId: row.conversation_slug_id,
                title: row.conversation_title,
                participationMode: row.participation_mode,
                estimatedEligibleRecipientCount:
                    estimates.get(row.conversation_id) ?? 0,
                sendingEnabled: isSendingEnabled({
                    row,
                    operationallyEnabled: operationalSendingEnabled,
                }),
            })),
        });
    }
    if (noProjectRows.length > 0) {
        scopes.push({
            kind: "no_project",
            title: NO_PROJECT_TITLE,
            conversations: noProjectRows.flatMap((row) => {
                const participantContactEmail = normalizeContactEmail(
                    row.contact_email,
                );
                return participantContactEmail === undefined
                    ? []
                    : [
                          {
                              conversationSlugId: row.conversation_slug_id,
                              title: row.conversation_title,
                              participationMode: row.participation_mode,
                              estimatedEligibleRecipientCount:
                                  estimates.get(row.conversation_id) ?? 0,
                              sendingEnabled: isSendingEnabled({
                                  row,
                                  operationallyEnabled:
                                      operationalSendingEnabled,
                              }),
                              participantContactEmail,
                          },
                      ];
            }),
        });
    }
    return scopes;
}

function historyBase(
    row: HistoryDao,
): Omit<
    ConversationEmailUpdateHistorySummary,
    "status" | "reason" | "conversations"
> {
    return {
        updateId: row.update_id,
        subject: row.subject,
        acceptedAt: row.accepted_at,
        audienceEstimate: row.audience_estimate,
        ownerCopyCount: row.owner_copy_count,
        scope:
            row.scope_kind === "listed_project"
                ? {
                      kind: "project",
                      title: row.project_title,
                      projectSlug: row.project_slug,
                  }
                : { kind: "no_project", title: NO_PROJECT_TITLE },
    };
}

function mapHistorySummary({
    row,
    conversations,
}: {
    row: HistoryDao;
    conversations: HistoryConversationDao[];
}): ConversationEmailUpdateHistorySummary {
    const base = {
        ...historyBase(row),
        conversations: conversations.map((conversation) => ({
            conversationSlugId: conversation.conversation_slug_id,
            title: conversation.conversation_title,
        })),
    };
    if (row.status === "failed") {
        return {
            ...base,
            status: row.status,
            reason: row.failure_reason ?? "materialization_failed",
        };
    }
    if (row.status === "stopping" || row.status === "stopped") {
        return {
            ...base,
            status: row.status,
            reason: row.stop_reason ?? "legal_or_abuse_block",
        };
    }
    return { ...base, status: row.status };
}

function mapHistoryRecord({
    row,
    conversations,
}: {
    row: HistoryDao;
    conversations: HistoryConversationDao[];
}): ConversationEmailUpdateHistoryRecord {
    return {
        ...mapHistorySummary({ row, conversations }),
        bodyHtml: row.body_html,
    };
}

async function loadHistoryConversations({
    db,
    updateIds,
}: {
    db: PostgresJsDatabase;
    updateIds: number[];
}) {
    if (updateIds.length === 0) return [];
    return await db
        .select({
            update_id: conversationEmailUpdateConversationTable.updateId,
            conversation_slug_id: conversationTable.slugId,
            conversation_title:
                conversationEmailUpdateConversationTable.conversationTitleSnapshot,
        })
        .from(conversationEmailUpdateConversationTable)
        .innerJoin(
            conversationTable,
            eq(
                conversationTable.id,
                conversationEmailUpdateConversationTable.conversationId,
            ),
        )
        .where(
            inArray(
                conversationEmailUpdateConversationTable.updateId,
                updateIds,
            ),
        )
        .orderBy(
            conversationEmailUpdateConversationTable.updateId,
            conversationTable.slugId,
        );
}

const historyRowSelection = {
    internal_update_id: conversationEmailUpdateTable.id,
    update_id: conversationEmailUpdateTable.publicId,
    project_slug: projectTable.slug,
    scope_kind: conversationEmailUpdateTable.scopeKind,
    project_title: conversationEmailUpdateTable.projectTitleSnapshot,
    subject: conversationEmailUpdateTable.subject,
    body_html: conversationEmailUpdateTable.bodyHtml,
    accepted_at: conversationEmailUpdateDeliveryTable.acceptedAt,
    audience_estimate:
        conversationEmailUpdateDeliveryTable.displayedParticipantEstimate,
    owner_copy_count:
        conversationEmailUpdateDeliveryTable.requiredOwnerCopyCount,
    status: conversationEmailUpdateDeliveryTable.status,
    failure_reason: conversationEmailUpdateDeliveryTable.failureReason,
    stop_reason: conversationEmailUpdateDeliveryTable.stopReason,
};

function historyContextPredicate({
    db,
    context,
}: {
    db: PostgresJsDatabase;
    context: HistoryContext;
}) {
    if (context.kind === "project") {
        return and(
            eq(projectTable.slug, context.projectSlug),
            isNull(projectTable.autoProvisionedForOrganizationId),
        );
    }
    if (context.kind === "conversation") {
        return exists(
            db
                .select({
                    update_id:
                        conversationEmailUpdateConversationTable.updateId,
                })
                .from(conversationEmailUpdateConversationTable)
                .innerJoin(
                    conversationTable,
                    eq(
                        conversationTable.id,
                        conversationEmailUpdateConversationTable.conversationId,
                    ),
                )
                .where(
                    and(
                        eq(
                            conversationEmailUpdateConversationTable.updateId,
                            conversationEmailUpdateDeliveryTable.updateId,
                        ),
                        eq(
                            conversationTable.slugId,
                            context.conversationSlugId,
                        ),
                    ),
                ),
        );
    }
    return undefined;
}

function historyAccessPredicate({
    db,
    userId,
    context,
}: {
    db: PostgresJsDatabase;
    userId: string;
    context: HistoryContext;
}) {
    return and(
        historyProjectVisibilityPredicate({ db, userId }),
        historyContextPredicate({ db, context }),
    );
}

interface HistoryCursorPosition {
    acceptedAt: Date;
    internalUpdateId: number;
}

async function resolveHistoryCursorPosition({
    db,
    userId,
    context,
    cursor,
}: {
    db: PostgresJsDatabase;
    userId: string;
    context: HistoryContext;
    cursor: string;
}): Promise<HistoryCursorPosition | undefined> {
    const rows = await db
        .select({
            acceptedAt: conversationEmailUpdateDeliveryTable.acceptedAt,
            internalUpdateId: conversationEmailUpdateDeliveryTable.updateId,
        })
        .from(conversationEmailUpdateDeliveryTable)
        .innerJoin(
            conversationEmailUpdateTable,
            eq(
                conversationEmailUpdateTable.id,
                conversationEmailUpdateDeliveryTable.updateId,
            ),
        )
        .innerJoin(
            projectTable,
            eq(projectTable.id, conversationEmailUpdateDeliveryTable.projectId),
        )
        .where(
            and(
                historyAccessPredicate({ db, userId, context }),
                eq(conversationEmailUpdateTable.publicId, cursor),
            ),
        )
        .limit(1);
    return rows.at(0);
}

async function queryVisibleHistoryRows({
    db,
    userId,
    context,
    cursorPosition,
    publicUpdateId,
    limit,
}: {
    db: PostgresJsDatabase;
    userId: string;
    context: HistoryContext;
    cursorPosition: HistoryCursorPosition | undefined;
    publicUpdateId: string | undefined;
    limit: number;
}) {
    const keysetPredicate =
        cursorPosition === undefined
            ? undefined
            : or(
                  lt(
                      conversationEmailUpdateDeliveryTable.acceptedAt,
                      cursorPosition.acceptedAt,
                  ),
                  and(
                      eq(
                          conversationEmailUpdateDeliveryTable.acceptedAt,
                          cursorPosition.acceptedAt,
                      ),
                      lt(
                          conversationEmailUpdateDeliveryTable.updateId,
                          cursorPosition.internalUpdateId,
                      ),
                  ),
              );
    return await db
        .select(historyRowSelection)
        .from(conversationEmailUpdateDeliveryTable)
        .innerJoin(
            conversationEmailUpdateTable,
            eq(
                conversationEmailUpdateTable.id,
                conversationEmailUpdateDeliveryTable.updateId,
            ),
        )
        .innerJoin(
            projectTable,
            eq(projectTable.id, conversationEmailUpdateDeliveryTable.projectId),
        )
        .where(
            and(
                historyAccessPredicate({ db, userId, context }),
                keysetPredicate,
                publicUpdateId === undefined
                    ? undefined
                    : eq(conversationEmailUpdateTable.publicId, publicUpdateId),
            ),
        )
        .orderBy(
            desc(conversationEmailUpdateDeliveryTable.acceptedAt),
            desc(conversationEmailUpdateDeliveryTable.updateId),
        )
        .limit(limit);
}

async function hasVisibleHistory({
    db,
    userId,
    context,
}: {
    db: PostgresJsDatabase;
    userId: string;
    context: HistoryContext;
}): Promise<boolean> {
    const rows = await db
        .select({ id: conversationEmailUpdateDeliveryTable.id })
        .from(conversationEmailUpdateDeliveryTable)
        .innerJoin(
            conversationEmailUpdateTable,
            eq(
                conversationEmailUpdateTable.id,
                conversationEmailUpdateDeliveryTable.updateId,
            ),
        )
        .innerJoin(
            projectTable,
            eq(projectTable.id, conversationEmailUpdateDeliveryTable.projectId),
        )
        .where(historyAccessPredicate({ db, userId, context }))
        .limit(1);
    return rows.length > 0;
}

function getPreferenceScopeKind({
    autoProvisionedForOrganizationId,
    directoryVisibility,
}: {
    autoProvisionedForOrganizationId: number | null;
    directoryVisibility: "listed" | "unlisted";
}): "project" | "no_project" | "unavailable" {
    if (autoProvisionedForOrganizationId !== null) return "no_project";
    return directoryVisibility === "listed" ? "project" : "unavailable";
}

async function queryPreferenceProjects({
    db,
    userId,
    now,
}: {
    db: PostgresJsDatabase;
    userId: string;
    now: Date;
}) {
    const rows = await db
        .select({
            project_id: projectTable.id,
            project_slug: projectTable.slug,
            project_title: projectTable.title,
            enabled: conversationEmailUpdateUserProjectPreferenceTable.enabled,
            deleted_at: projectTable.deletedAt,
            directory_visibility: projectTable.directoryVisibility,
            auto_provisioned_for_organization_id:
                projectTable.autoProvisionedForOrganizationId,
            contact_email: projectContactTable.email,
            feature_available: exists(
                db
                    .select({ id: projectOrganizationOwnershipTable.id })
                    .from(projectOrganizationOwnershipTable)
                    .innerJoin(
                        premiumFeatureEntitlementTable,
                        and(
                            eq(
                                premiumFeatureEntitlementTable.organizationId,
                                projectOrganizationOwnershipTable.organizationId,
                            ),
                            eq(
                                premiumFeatureEntitlementTable.feature,
                                "conversation_email_update",
                            ),
                            lte(premiumFeatureEntitlementTable.startsAt, now),
                            isNull(premiumFeatureEntitlementTable.revokedAt),
                            or(
                                isNull(
                                    premiumFeatureEntitlementTable.expiresAt,
                                ),
                                gt(
                                    premiumFeatureEntitlementTable.expiresAt,
                                    now,
                                ),
                            ),
                        ),
                    )
                    .where(
                        and(
                            eq(
                                projectOrganizationOwnershipTable.projectId,
                                projectTable.id,
                            ),
                            isNull(projectOrganizationOwnershipTable.deletedAt),
                            notExists(
                                db
                                    .select({
                                        id: conversationEmailUpdateScopeSafetyBlockTable.id,
                                    })
                                    .from(
                                        conversationEmailUpdateScopeSafetyBlockTable,
                                    )
                                    .where(
                                        and(
                                            eq(
                                                conversationEmailUpdateScopeSafetyBlockTable.targetKind,
                                                "organization",
                                            ),
                                            eq(
                                                conversationEmailUpdateScopeSafetyBlockTable.organizationId,
                                                projectOrganizationOwnershipTable.organizationId,
                                            ),
                                            isNull(
                                                conversationEmailUpdateScopeSafetyBlockTable.liftedAt,
                                            ),
                                        ),
                                    ),
                            ),
                        ),
                    ),
            ),
            safety_blocked: exists(
                db
                    .select({
                        id: conversationEmailUpdateScopeSafetyBlockTable.id,
                    })
                    .from(conversationEmailUpdateScopeSafetyBlockTable)
                    .where(
                        and(
                            eq(
                                conversationEmailUpdateScopeSafetyBlockTable.targetKind,
                                "project",
                            ),
                            eq(
                                conversationEmailUpdateScopeSafetyBlockTable.projectId,
                                projectTable.id,
                            ),
                            isNull(
                                conversationEmailUpdateScopeSafetyBlockTable.liftedAt,
                            ),
                        ),
                    ),
            ),
        })
        .from(conversationEmailUpdateUserProjectPreferenceTable)
        .innerJoin(
            projectTable,
            eq(
                projectTable.id,
                conversationEmailUpdateUserProjectPreferenceTable.projectId,
            ),
        )
        .leftJoin(
            projectContactTable,
            and(
                eq(projectContactTable.projectId, projectTable.id),
                isNull(projectContactTable.deletedAt),
            ),
        )
        .where(
            eq(
                conversationEmailUpdateUserProjectPreferenceTable.userId,
                userId,
            ),
        )
        .orderBy(projectTable.id);
    return rows.map((row) => ({
        project_id: row.project_id,
        project_slug: row.project_slug,
        project_title: row.project_title,
        enabled: row.enabled,
        available:
            row.deleted_at === null &&
            row.directory_visibility === "listed" &&
            row.auto_provisioned_for_organization_id === null &&
            row.contact_email !== null &&
            row.feature_available === true &&
            row.safety_blocked !== true,
    }));
}

async function queryPreferenceConversations({
    db,
    userId,
    now,
}: {
    db: PostgresJsDatabase;
    userId: string;
    now: Date;
}) {
    const rows = await db
        .select({
            project_id: projectTable.id,
            project_slug: projectTable.slug,
            project_title: projectTable.title,
            auto_provisioned_for_organization_id:
                projectTable.autoProvisionedForOrganizationId,
            directory_visibility: projectTable.directoryVisibility,
            project_deleted_at: projectTable.deletedAt,
            conversation_id: conversationTable.id,
            conversation_slug_id: conversationTable.slugId,
            conversation_title: conversationContentTable.title,
            current_content_id: conversationTable.currentContentId,
            enabled:
                conversationEmailUpdateUserConversationPreferenceTable.enabled,
            contact_email: projectContactTable.email,
            feature_available: exists(
                db
                    .select({ id: projectOrganizationOwnershipTable.id })
                    .from(projectOrganizationOwnershipTable)
                    .innerJoin(
                        premiumFeatureEntitlementTable,
                        and(
                            eq(
                                premiumFeatureEntitlementTable.organizationId,
                                projectOrganizationOwnershipTable.organizationId,
                            ),
                            eq(
                                premiumFeatureEntitlementTable.feature,
                                "conversation_email_update",
                            ),
                            lte(premiumFeatureEntitlementTable.startsAt, now),
                            isNull(premiumFeatureEntitlementTable.revokedAt),
                            or(
                                isNull(
                                    premiumFeatureEntitlementTable.expiresAt,
                                ),
                                gt(
                                    premiumFeatureEntitlementTable.expiresAt,
                                    now,
                                ),
                            ),
                        ),
                    )
                    .where(
                        and(
                            eq(
                                projectOrganizationOwnershipTable.projectId,
                                projectTable.id,
                            ),
                            isNull(projectOrganizationOwnershipTable.deletedAt),
                            notExists(
                                db
                                    .select({
                                        id: conversationEmailUpdateScopeSafetyBlockTable.id,
                                    })
                                    .from(
                                        conversationEmailUpdateScopeSafetyBlockTable,
                                    )
                                    .where(
                                        and(
                                            eq(
                                                conversationEmailUpdateScopeSafetyBlockTable.targetKind,
                                                "organization",
                                            ),
                                            eq(
                                                conversationEmailUpdateScopeSafetyBlockTable.organizationId,
                                                projectOrganizationOwnershipTable.organizationId,
                                            ),
                                            isNull(
                                                conversationEmailUpdateScopeSafetyBlockTable.liftedAt,
                                            ),
                                        ),
                                    ),
                            ),
                        ),
                    ),
            ),
            safety_blocked: exists(
                db
                    .select({
                        id: conversationEmailUpdateScopeSafetyBlockTable.id,
                    })
                    .from(conversationEmailUpdateScopeSafetyBlockTable)
                    .where(
                        and(
                            isNull(
                                conversationEmailUpdateScopeSafetyBlockTable.liftedAt,
                            ),
                            or(
                                and(
                                    eq(
                                        conversationEmailUpdateScopeSafetyBlockTable.targetKind,
                                        "project",
                                    ),
                                    eq(
                                        conversationEmailUpdateScopeSafetyBlockTable.projectId,
                                        projectTable.id,
                                    ),
                                ),
                                and(
                                    eq(
                                        conversationEmailUpdateScopeSafetyBlockTable.targetKind,
                                        "conversation",
                                    ),
                                    eq(
                                        conversationEmailUpdateScopeSafetyBlockTable.conversationId,
                                        conversationTable.id,
                                    ),
                                ),
                            ),
                        ),
                    ),
            ),
        })
        .from(conversationEmailUpdateUserConversationPreferenceTable)
        .innerJoin(
            conversationTable,
            eq(
                conversationTable.id,
                conversationEmailUpdateUserConversationPreferenceTable.conversationId,
            ),
        )
        .innerJoin(
            projectTable,
            eq(projectTable.id, conversationTable.projectId),
        )
        .leftJoin(
            conversationContentTable,
            eq(conversationContentTable.id, conversationTable.currentContentId),
        )
        .leftJoin(
            projectContactTable,
            and(
                eq(projectContactTable.projectId, projectTable.id),
                isNull(projectContactTable.deletedAt),
            ),
        )
        .where(
            eq(
                conversationEmailUpdateUserConversationPreferenceTable.userId,
                userId,
            ),
        )
        .orderBy(projectTable.id, conversationTable.id);
    return rows.map((row) => ({
        project_id: row.project_id,
        project_slug: row.project_slug,
        project_title: row.project_title,
        scope_kind: getPreferenceScopeKind({
            autoProvisionedForOrganizationId:
                row.auto_provisioned_for_organization_id,
            directoryVisibility: row.directory_visibility,
        }),
        conversation_id: row.conversation_id,
        conversation_slug_id: row.conversation_slug_id,
        conversation_title: row.conversation_title ?? row.conversation_slug_id,
        enabled: row.enabled,
        available:
            row.project_deleted_at === null &&
            row.current_content_id !== null &&
            (row.auto_provisioned_for_organization_id !== null ||
                row.directory_visibility === "listed") &&
            row.contact_email !== null &&
            row.feature_available === true &&
            row.safety_blocked !== true,
    }));
}

async function loadPreferenceRows({
    db,
    userId,
    now,
}: {
    db: PostgresJsDatabase;
    userId: string;
    now: Date;
}): Promise<{
    globalPaused: boolean;
    projectRows: PreferenceProjectDao[];
    conversationRows: PreferenceConversationDao[];
}> {
    const [globalRows, projectRows, conversationRows] = await Promise.all([
        db
            .select({
                pausedAt:
                    conversationEmailUpdateUserGlobalSettingTable.pausedAt,
            })
            .from(conversationEmailUpdateUserGlobalSettingTable)
            .where(
                eq(
                    conversationEmailUpdateUserGlobalSettingTable.userId,
                    userId,
                ),
            )
            .limit(1),
        queryPreferenceProjects({ db, userId, now }),
        queryPreferenceConversations({ db, userId, now }),
    ]);
    return {
        globalPaused:
            globalRows.at(0)?.pausedAt !== null && globalRows.length > 0,
        projectRows,
        conversationRows,
    };
}

async function loadConversationPreferenceState({
    db,
    userId,
    projectId,
    conversationId,
    preferenceScope,
}: {
    db: PostgresJsDatabase;
    userId: string;
    projectId: number;
    conversationId: number;
    preferenceScope: "project" | "conversation" | undefined;
}): Promise<{
    globalPaused: boolean;
    projectEnabled: boolean | undefined;
    conversationEnabled: boolean | undefined;
}> {
    const [globalRows, projectRows, conversationRows] = await Promise.all([
        db
            .select({
                pausedAt:
                    conversationEmailUpdateUserGlobalSettingTable.pausedAt,
            })
            .from(conversationEmailUpdateUserGlobalSettingTable)
            .where(
                eq(
                    conversationEmailUpdateUserGlobalSettingTable.userId,
                    userId,
                ),
            )
            .limit(1),
        preferenceScope === "project"
            ? db
                  .select({
                      enabled:
                          conversationEmailUpdateUserProjectPreferenceTable.enabled,
                  })
                  .from(conversationEmailUpdateUserProjectPreferenceTable)
                  .where(
                      and(
                          eq(
                              conversationEmailUpdateUserProjectPreferenceTable.userId,
                              userId,
                          ),
                          eq(
                              conversationEmailUpdateUserProjectPreferenceTable.projectId,
                              projectId,
                          ),
                      ),
                  )
                  .limit(1)
            : Promise.resolve([]),
        db
            .select({
                enabled:
                    conversationEmailUpdateUserConversationPreferenceTable.enabled,
            })
            .from(conversationEmailUpdateUserConversationPreferenceTable)
            .where(
                and(
                    eq(
                        conversationEmailUpdateUserConversationPreferenceTable.userId,
                        userId,
                    ),
                    eq(
                        conversationEmailUpdateUserConversationPreferenceTable.conversationId,
                        conversationId,
                    ),
                ),
            )
            .limit(1),
    ]);
    return {
        globalPaused:
            globalRows.at(0)?.pausedAt !== null && globalRows.length > 0,
        projectEnabled: projectRows.at(0)?.enabled,
        conversationEnabled: conversationRows.at(0)?.enabled,
    };
}

async function queryProjectConfigurationRows({
    db,
    projectSlug,
    now,
}: {
    db: PostgresJsDatabase;
    projectSlug: string;
    now: Date;
}) {
    const rows = await db
        .select({
            project_id: projectTable.id,
            project_slug: projectTable.slug,
            directory_visibility: projectTable.directoryVisibility,
            auto_provisioned_for_organization_id:
                projectTable.autoProvisionedForOrganizationId,
            default_enabled: projectTable.conversationEmailUpdateDefaultEnabled,
            contact_email: projectContactTable.email,
            safety_blocked: exists(
                db
                    .select({
                        id: conversationEmailUpdateScopeSafetyBlockTable.id,
                    })
                    .from(conversationEmailUpdateScopeSafetyBlockTable)
                    .where(
                        and(
                            eq(
                                conversationEmailUpdateScopeSafetyBlockTable.targetKind,
                                "project",
                            ),
                            eq(
                                conversationEmailUpdateScopeSafetyBlockTable.projectId,
                                projectTable.id,
                            ),
                            isNull(
                                conversationEmailUpdateScopeSafetyBlockTable.liftedAt,
                            ),
                        ),
                    ),
            ),
            feature_available: exists(
                db
                    .select({ id: projectOrganizationOwnershipTable.id })
                    .from(projectOrganizationOwnershipTable)
                    .innerJoin(
                        premiumFeatureEntitlementTable,
                        and(
                            eq(
                                premiumFeatureEntitlementTable.organizationId,
                                projectOrganizationOwnershipTable.organizationId,
                            ),
                            eq(
                                premiumFeatureEntitlementTable.feature,
                                "conversation_email_update",
                            ),
                            lte(premiumFeatureEntitlementTable.startsAt, now),
                            isNull(premiumFeatureEntitlementTable.revokedAt),
                            or(
                                isNull(
                                    premiumFeatureEntitlementTable.expiresAt,
                                ),
                                gt(
                                    premiumFeatureEntitlementTable.expiresAt,
                                    now,
                                ),
                            ),
                        ),
                    )
                    .where(
                        and(
                            eq(
                                projectOrganizationOwnershipTable.projectId,
                                projectTable.id,
                            ),
                            isNull(projectOrganizationOwnershipTable.deletedAt),
                            notExists(
                                db
                                    .select({
                                        id: conversationEmailUpdateScopeSafetyBlockTable.id,
                                    })
                                    .from(
                                        conversationEmailUpdateScopeSafetyBlockTable,
                                    )
                                    .where(
                                        and(
                                            eq(
                                                conversationEmailUpdateScopeSafetyBlockTable.targetKind,
                                                "organization",
                                            ),
                                            eq(
                                                conversationEmailUpdateScopeSafetyBlockTable.organizationId,
                                                projectOrganizationOwnershipTable.organizationId,
                                            ),
                                            isNull(
                                                conversationEmailUpdateScopeSafetyBlockTable.liftedAt,
                                            ),
                                        ),
                                    ),
                            ),
                        ),
                    ),
            ),
        })
        .from(projectTable)
        .leftJoin(
            projectContactTable,
            and(
                eq(projectContactTable.projectId, projectTable.id),
                isNull(projectContactTable.deletedAt),
            ),
        )
        .where(
            and(
                eq(projectTable.slug, projectSlug),
                isNull(projectTable.deletedAt),
                or(
                    isNotNull(projectTable.autoProvisionedForOrganizationId),
                    eq(projectTable.directoryVisibility, "listed"),
                ),
            ),
        )
        .limit(1);
    return rows.map((row) => ({
        ...row,
        safety_blocked: row.safety_blocked === true,
        feature_available: row.feature_available === true,
    }));
}

async function getProjectConfigurationRow({
    db,
    projectSlug,
    now,
}: {
    db: PostgresJsDatabase;
    projectSlug: string;
    now: Date;
}): Promise<ConfigurationProjectDao | undefined> {
    const rows = await queryProjectConfigurationRows({ db, projectSlug, now });
    return rows.at(0);
}

async function queryConversationConfigurationRows({
    db,
    conversationSlugId,
    now,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    now: Date;
}) {
    const rows = await db
        .select({
            project_id: projectTable.id,
            project_slug: projectTable.slug,
            default_enabled: projectTable.conversationEmailUpdateDefaultEnabled,
            contact_email: projectContactTable.email,
            auto_provisioned_for_organization_id:
                projectTable.autoProvisionedForOrganizationId,
            conversation_id: conversationTable.id,
            conversation_slug_id: conversationTable.slugId,
            override_enabled:
                conversationTable.conversationEmailUpdateEnabledOverride,
            has_history: exists(
                db
                    .select({
                        conversationId:
                            conversationEmailUpdateConversationTable.conversationId,
                    })
                    .from(conversationEmailUpdateConversationTable)
                    .where(
                        eq(
                            conversationEmailUpdateConversationTable.conversationId,
                            conversationTable.id,
                        ),
                    ),
            ),
            safety_blocked: exists(
                db
                    .select({
                        id: conversationEmailUpdateScopeSafetyBlockTable.id,
                    })
                    .from(conversationEmailUpdateScopeSafetyBlockTable)
                    .where(
                        and(
                            isNull(
                                conversationEmailUpdateScopeSafetyBlockTable.liftedAt,
                            ),
                            or(
                                and(
                                    eq(
                                        conversationEmailUpdateScopeSafetyBlockTable.targetKind,
                                        "project",
                                    ),
                                    eq(
                                        conversationEmailUpdateScopeSafetyBlockTable.projectId,
                                        projectTable.id,
                                    ),
                                ),
                                and(
                                    eq(
                                        conversationEmailUpdateScopeSafetyBlockTable.targetKind,
                                        "conversation",
                                    ),
                                    eq(
                                        conversationEmailUpdateScopeSafetyBlockTable.conversationId,
                                        conversationTable.id,
                                    ),
                                ),
                            ),
                        ),
                    ),
            ),
            feature_available: exists(
                db
                    .select({ id: projectOrganizationOwnershipTable.id })
                    .from(projectOrganizationOwnershipTable)
                    .innerJoin(
                        premiumFeatureEntitlementTable,
                        and(
                            eq(
                                premiumFeatureEntitlementTable.organizationId,
                                projectOrganizationOwnershipTable.organizationId,
                            ),
                            eq(
                                premiumFeatureEntitlementTable.feature,
                                "conversation_email_update",
                            ),
                            lte(premiumFeatureEntitlementTable.startsAt, now),
                            isNull(premiumFeatureEntitlementTable.revokedAt),
                            or(
                                isNull(
                                    premiumFeatureEntitlementTable.expiresAt,
                                ),
                                gt(
                                    premiumFeatureEntitlementTable.expiresAt,
                                    now,
                                ),
                            ),
                        ),
                    )
                    .where(
                        and(
                            eq(
                                projectOrganizationOwnershipTable.projectId,
                                projectTable.id,
                            ),
                            isNull(projectOrganizationOwnershipTable.deletedAt),
                            notExists(
                                db
                                    .select({
                                        id: conversationEmailUpdateScopeSafetyBlockTable.id,
                                    })
                                    .from(
                                        conversationEmailUpdateScopeSafetyBlockTable,
                                    )
                                    .where(
                                        and(
                                            eq(
                                                conversationEmailUpdateScopeSafetyBlockTable.targetKind,
                                                "organization",
                                            ),
                                            eq(
                                                conversationEmailUpdateScopeSafetyBlockTable.organizationId,
                                                projectOrganizationOwnershipTable.organizationId,
                                            ),
                                            isNull(
                                                conversationEmailUpdateScopeSafetyBlockTable.liftedAt,
                                            ),
                                        ),
                                    ),
                            ),
                        ),
                    ),
            ),
        })
        .from(conversationTable)
        .innerJoin(
            projectTable,
            and(
                eq(projectTable.id, conversationTable.projectId),
                isNull(projectTable.deletedAt),
            ),
        )
        .leftJoin(
            projectContactTable,
            and(
                eq(projectContactTable.projectId, projectTable.id),
                isNull(projectContactTable.deletedAt),
            ),
        )
        .where(
            and(
                eq(conversationTable.slugId, conversationSlugId),
                isNotNull(conversationTable.currentContentId),
                or(
                    isNotNull(projectTable.autoProvisionedForOrganizationId),
                    eq(projectTable.directoryVisibility, "listed"),
                ),
            ),
        )
        .limit(1);
    return rows.map((row) => ({
        project_id: row.project_id,
        project_slug: row.project_slug,
        default_enabled: row.default_enabled,
        contact_email: row.contact_email,
        conversation_id: row.conversation_id,
        conversation_slug_id: row.conversation_slug_id,
        override_enabled: row.override_enabled,
        scope_kind: getProjectScopeKind(
            row.auto_provisioned_for_organization_id,
        ),
        has_history: row.has_history === true,
        safety_blocked: row.safety_blocked === true,
        feature_available: row.feature_available === true,
    }));
}

async function getConversationConfigurationRow({
    db,
    conversationSlugId,
    now,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
    now: Date;
}): Promise<ConfigurationConversationDao | undefined> {
    const rows = await queryConversationConfigurationRows({
        db,
        conversationSlugId,
        now,
    });
    return rows.at(0);
}

async function hasConversationEmailUpdateCapability({
    db,
    userId,
    projectId,
    now,
}: {
    db: PostgresJsDatabase;
    userId: string;
    projectId: number;
    now: Date;
}): Promise<boolean> {
    const rows = await db
        .select({ id: projectOrganizationOwnershipTable.id })
        .from(projectOrganizationOwnershipTable)
        .innerJoin(
            organizationTable,
            and(
                eq(
                    organizationTable.id,
                    projectOrganizationOwnershipTable.organizationId,
                ),
                isNull(organizationTable.deletedAt),
            ),
        )
        .innerJoin(
            organizationMembershipTable,
            and(
                eq(
                    organizationMembershipTable.organizationId,
                    projectOrganizationOwnershipTable.organizationId,
                ),
                eq(organizationMembershipTable.userId, userId),
                isNull(organizationMembershipTable.deletedAt),
            ),
        )
        .innerJoin(
            userTable,
            and(
                eq(userTable.id, organizationMembershipTable.userId),
                eq(userTable.isDeleted, false),
            ),
        )
        .innerJoin(
            organizationMembershipAllProjectCapabilityTable,
            and(
                eq(
                    organizationMembershipAllProjectCapabilityTable.organizationMembershipId,
                    organizationMembershipTable.id,
                ),
                eq(
                    organizationMembershipAllProjectCapabilityTable.capability,
                    "conversation_email_update",
                ),
                isNull(
                    organizationMembershipAllProjectCapabilityTable.deletedAt,
                ),
            ),
        )
        .innerJoin(
            premiumFeatureEntitlementTable,
            and(
                eq(
                    premiumFeatureEntitlementTable.organizationId,
                    projectOrganizationOwnershipTable.organizationId,
                ),
                eq(
                    premiumFeatureEntitlementTable.feature,
                    "conversation_email_update",
                ),
                lte(premiumFeatureEntitlementTable.startsAt, now),
                isNull(premiumFeatureEntitlementTable.revokedAt),
                or(
                    isNull(premiumFeatureEntitlementTable.expiresAt),
                    gt(premiumFeatureEntitlementTable.expiresAt, now),
                ),
            ),
        )
        .where(
            and(
                eq(projectOrganizationOwnershipTable.projectId, projectId),
                isNull(projectOrganizationOwnershipTable.deletedAt),
            ),
        )
        .limit(1);
    return rows.length > 0;
}

async function lockUser({
    db,
    userId,
}: {
    db: PostgresJsDatabase;
    userId: string;
}): Promise<void> {
    await db
        .select({ id: userTable.id })
        .from(userTable)
        .where(eq(userTable.id, userId))
        .for("update");
}

async function resumeGloballyPausedEmailUpdates({
    db,
    userId,
    now,
}: {
    db: PostgresJsDatabase;
    userId: string;
    now: Date;
}): Promise<boolean> {
    const resumedRows = await db
        .update(conversationEmailUpdateUserGlobalSettingTable)
        .set({ pausedAt: null, updatedAt: now })
        .where(
            and(
                eq(
                    conversationEmailUpdateUserGlobalSettingTable.userId,
                    userId,
                ),
                isNotNull(
                    conversationEmailUpdateUserGlobalSettingTable.pausedAt,
                ),
            ),
        )
        .returning({ userId: conversationEmailUpdateUserGlobalSettingTable.userId });
    return resumedRows.length > 0;
}

async function lockProject({
    db,
    projectId,
}: {
    db: PostgresJsDatabase;
    projectId: number;
}): Promise<boolean> {
    const rows = await db
        .select({ id: projectTable.id })
        .from(projectTable)
        .where(eq(projectTable.id, projectId))
        .for("update");
    return rows.length === 1;
}

async function lockActiveEmailUpdateAuthorization({
    db,
    projectId,
    organizationId,
    entitlementId,
    userId,
    now,
}: {
    db: PostgresJsDatabase;
    projectId: number;
    organizationId: number;
    entitlementId: number;
    userId: string;
    now: Date;
}): Promise<boolean> {
    const rows = await db
        .select({ membershipId: organizationMembershipTable.id })
        .from(projectOrganizationOwnershipTable)
        .innerJoin(
            organizationTable,
            and(
                eq(
                    organizationTable.id,
                    projectOrganizationOwnershipTable.organizationId,
                ),
                isNull(organizationTable.deletedAt),
            ),
        )
        .innerJoin(
            organizationMembershipTable,
            and(
                eq(
                    organizationMembershipTable.organizationId,
                    projectOrganizationOwnershipTable.organizationId,
                ),
                eq(organizationMembershipTable.userId, userId),
                isNull(organizationMembershipTable.deletedAt),
            ),
        )
        .innerJoin(
            userTable,
            and(
                eq(userTable.id, organizationMembershipTable.userId),
                eq(userTable.isDeleted, false),
            ),
        )
        .innerJoin(
            organizationMembershipAllProjectCapabilityTable,
            and(
                eq(
                    organizationMembershipAllProjectCapabilityTable.organizationMembershipId,
                    organizationMembershipTable.id,
                ),
                eq(
                    organizationMembershipAllProjectCapabilityTable.capability,
                    "conversation_email_update",
                ),
                isNull(
                    organizationMembershipAllProjectCapabilityTable.deletedAt,
                ),
            ),
        )
        .innerJoin(
            premiumFeatureEntitlementTable,
            and(
                eq(premiumFeatureEntitlementTable.id, entitlementId),
                eq(
                    premiumFeatureEntitlementTable.organizationId,
                    projectOrganizationOwnershipTable.organizationId,
                ),
                eq(
                    premiumFeatureEntitlementTable.feature,
                    "conversation_email_update",
                ),
                lte(premiumFeatureEntitlementTable.startsAt, now),
                isNull(premiumFeatureEntitlementTable.revokedAt),
                or(
                    isNull(premiumFeatureEntitlementTable.expiresAt),
                    gt(premiumFeatureEntitlementTable.expiresAt, now),
                ),
            ),
        )
        .where(
            and(
                eq(projectOrganizationOwnershipTable.projectId, projectId),
                eq(
                    projectOrganizationOwnershipTable.organizationId,
                    organizationId,
                ),
                isNull(projectOrganizationOwnershipTable.deletedAt),
            ),
        )
        .limit(1)
        .for("update", {
            of: [
                projectOrganizationOwnershipTable,
                organizationTable,
                organizationMembershipTable,
                userTable,
                organizationMembershipAllProjectCapabilityTable,
                premiumFeatureEntitlementTable,
            ],
        });
    return rows.length === 1;
}

async function hasActiveDelivery({
    db,
    projectId,
}: {
    db: PostgresJsDatabase;
    projectId: number;
}): Promise<boolean> {
    const rows = await db
        .select({ id: conversationEmailUpdateDeliveryTable.id })
        .from(conversationEmailUpdateDeliveryTable)
        .where(
            and(
                eq(conversationEmailUpdateDeliveryTable.projectId, projectId),
                inArray(conversationEmailUpdateDeliveryTable.status, [
                    "preparing",
                    "queued",
                    "sending",
                    "stopping",
                ]),
            ),
        )
        .limit(1);
    return rows.length > 0;
}

function mapConfiguration({
    row,
    canConfigure,
    operationalSendingEnabled,
}: {
    row: ConfigurationConversationDao;
    canConfigure: boolean;
    operationalSendingEnabled: boolean;
}): ConversationEmailUpdateConfigurationResponse {
    const participantContactEmail = normalizeContactEmail(row.contact_email);
    const setting =
        row.override_enabled === null
            ? "inherit"
            : row.override_enabled
              ? "enabled"
              : "disabled";
    return {
        success: true,
        configuration: {
            target: "conversation",
            conversationSlugId: row.conversation_slug_id,
            canConfigure,
            scopeKind: row.scope_kind,
            scopeDefaultEnabled: row.default_enabled,
            setting,
            sendingEnabled:
                operationalSendingEnabled &&
                row.feature_available &&
                !row.safety_blocked &&
                participantContactEmail !== undefined &&
                (row.override_enabled ?? row.default_enabled),
            hasHistory: row.has_history,
            participantContactEmail,
        },
    };
}

export function createConversationEmailUpdateService({
    db,
    sendingEnabled,
}: {
    db: PostgresJsDatabase;
    sendingEnabled: boolean;
}): ConversationEmailUpdateService {
    const estimateAudience = async ({
        userId,
        request,
    }: AuthenticatedRequest<ConversationEmailUpdateAudienceEstimateRequest>): Promise<ConversationEmailUpdateAudienceEstimateResponse> => {
        if (!sendingEnabled) {
            return { success: false, reason: "sending_disabled" };
        }
        const now = new Date();
        const rows = await listAuthorizedConversations({ db, userId, now });
        const resolved = resolveSelection({
            rows,
            selection: request.selection,
        });
        if (!resolved.success) return resolved;
        if (
            resolved.value.conversations.some(
                (row) =>
                    !isSendingEnabled({
                        row,
                        operationallyEnabled: sendingEnabled,
                    }),
            )
        ) {
            return { success: false, reason: "sending_disabled" };
        }
        const estimate = await estimateResolvedSelection({
            db,
            selection: resolved.value,
            cutoffAt: now,
        });
        return { success: true, ...estimate };
    };

    const getConfigurationWithDatabase = async ({
        database,
        userId,
        request,
    }: AuthenticatedRequest<ConversationEmailUpdateConfigurationRequest> & {
        database: PostgresJsDatabase;
    }): Promise<ConversationEmailUpdateConfigurationResponse> => {
        const now = new Date();
        if (request.target === "project") {
            const row = await getProjectConfigurationRow({
                db: database,
                projectSlug: request.projectSlug,
                now,
            });
            if (row === undefined) {
                return { success: false, reason: "target_not_found" };
            }
            if (!row.feature_available) {
                return { success: false, reason: "feature_not_available" };
            }
            const canConfigure = await hasConversationEmailUpdateCapability({
                db: database,
                userId,
                projectId: row.project_id,
                now,
            });
            return {
                success: true,
                configuration: {
                    target: "project",
                    projectSlug: row.project_slug,
                    canConfigure,
                    defaultEnabled: row.default_enabled,
                    participantContactEmail: normalizeContactEmail(
                        row.contact_email,
                    ),
                },
            };
        }
        const row = await getConversationConfigurationRow({
            db: database,
            conversationSlugId: request.conversationSlugId,
            now,
        });
        if (row === undefined) {
            return { success: false, reason: "target_not_found" };
        }
        if (!row.feature_available) {
            return { success: false, reason: "feature_not_available" };
        }
        const canConfigure = await hasConversationEmailUpdateCapability({
            db: database,
            userId,
            projectId: row.project_id,
            now,
        });
        return mapConfiguration({
            row,
            canConfigure,
            operationalSendingEnabled: sendingEnabled,
        });
    };
    const getConfiguration = async ({
        userId,
        request,
    }: AuthenticatedRequest<ConversationEmailUpdateConfigurationRequest>): Promise<ConversationEmailUpdateConfigurationResponse> =>
        await getConfigurationWithDatabase({ database: db, userId, request });

    return {
        getWorkspace: async ({ userId, request }) => {
            const now = new Date();
            const [allRows, testDestination] = await Promise.all([
                listAuthorizedConversations({ db, userId, now }),
                getPrimaryEmail({ db: getPrimaryDatabase(db), userId }),
            ]);
            let rows = allRows;
            let initialSelection: ConversationEmailUpdateSelection | undefined;
            if (request.context.kind === "project") {
                const projectSlug = request.context.projectSlug;
                rows = allRows.filter(
                    (row) =>
                        row.scope_kind === "project" &&
                        row.project_slug === projectSlug,
                );
            } else if (request.context.kind === "conversation") {
                const conversationSlugId = request.context.conversationSlugId;
                const selected = allRows.find(
                    (row) => row.conversation_slug_id === conversationSlugId,
                );
                rows =
                    selected === undefined
                        ? []
                        : allRows.filter((row) =>
                              selected.scope_kind === "project"
                                  ? row.project_id === selected.project_id
                                  : row.scope_kind === "no_project",
                          );
                initialSelection =
                    selected?.scope_kind === "project"
                        ? {
                              kind: "project",
                              projectSlug: selected.project_slug,
                              conversationSlugIds: [
                                  selected.conversation_slug_id,
                              ],
                          }
                        : selected?.scope_kind === "no_project"
                          ? {
                                kind: "no_project",
                                conversationSlugId:
                                    selected.conversation_slug_id,
                            }
                          : undefined;
            }
            if (rows.length === 0) {
                if (request.context.kind === "global") {
                    return {
                        success: false,
                        reason: "feature_not_available",
                    };
                }
                if (request.context.kind === "conversation") {
                    const context = await getConversationConfigurationRow({
                        db,
                        conversationSlugId: request.context.conversationSlugId,
                        now,
                    });
                    return context === undefined
                        ? { success: false, reason: "context_not_found" }
                        : {
                              success: false,
                              reason: "feature_not_available",
                          };
                }
                const contextRows = await db
                    .select({ id: projectTable.id })
                    .from(projectTable)
                    .where(
                        and(
                            eq(projectTable.slug, request.context.projectSlug),
                            isNull(projectTable.deletedAt),
                            eq(projectTable.directoryVisibility, "listed"),
                            isNull(
                                projectTable.autoProvisionedForOrganizationId,
                            ),
                        ),
                    )
                    .limit(1);
                return contextRows.length === 0
                    ? { success: false, reason: "context_not_found" }
                    : {
                          success: false,
                          reason: "feature_not_available",
                      };
            }
            const requiredOwnerUserIdsByProjectId = new Map(
                await mapInBatches({
                    items: [...new Set(rows.map((row) => row.project_id))],
                    batchSize: WORKSPACE_QUERY_BATCH_SIZE,
                    map: async (projectId): Promise<[number, string[]]> => [
                        projectId,
                        await listRequiredOwnerUserIds({
                            db,
                            projectId,
                        }),
                    ],
                }),
            );
            const estimateEntries = await mapInBatches({
                items: rows,
                batchSize: WORKSPACE_QUERY_BATCH_SIZE,
                map: async (row): Promise<readonly [number, number]> => {
                    const count = await countEligibleAudience({
                        db,
                        selection: {
                            project: row,
                            conversations: [row],
                        },
                        cutoffAt: now,
                        excludedUserIds:
                            requiredOwnerUserIdsByProjectId.get(
                                row.project_id,
                            ) ?? [],
                    });
                    return [row.conversation_id, count];
                },
            });
            const scopes = groupScopes({
                rows,
                estimates: new Map(estimateEntries),
                operationalSendingEnabled: sendingEnabled,
            });
            if (scopes.length === 0) {
                return { success: false, reason: "feature_not_available" };
            }
            return {
                success: true,
                resolvedContext: request.context,
                initialSelection,
                testDestinationEmail: testDestination?.email,
                scopes,
            };
        },

        listHistory: async ({ userId, request }) => {
            const contextVisible = await isHistoryContextVisible({
                db,
                userId,
                context: request.context,
            });
            if (!contextVisible) {
                return { success: false, reason: "context_not_found" };
            }

            const cursorPosition =
                request.cursor === undefined
                    ? undefined
                    : await resolveHistoryCursorPosition({
                          db,
                          userId,
                          context: request.context,
                          cursor: request.cursor,
                      });
            if (request.cursor !== undefined && cursorPosition === undefined) {
                return { success: false, reason: "invalid_cursor" };
            }

            const rows = await queryVisibleHistoryRows({
                db,
                userId,
                context: request.context,
                cursorPosition,
                publicUpdateId: undefined,
                limit: request.limit + 1,
            });
            const hasNextPage = rows.length > request.limit;
            const page = rows.slice(0, request.limit);
            const conversations = await loadHistoryConversations({
                db,
                updateIds: page.map((row) => row.internal_update_id),
            });
            return {
                success: true,
                items: page.map((row) =>
                    mapHistoryRecord({
                        row,
                        conversations: conversations.filter(
                            (conversation) =>
                                conversation.update_id ===
                                row.internal_update_id,
                        ),
                    }),
                ),
                nextCursor: hasNextPage ? page.at(-1)?.update_id : undefined,
            };
        },

        getHistoryDetail: async ({ userId, request }) => {
            const rows = await queryVisibleHistoryRows({
                db,
                userId,
                context: { kind: "global" },
                cursorPosition: undefined,
                publicUpdateId: request.updateId,
                limit: 1,
            });
            const row = rows.at(0);
            if (row === undefined) {
                return { success: false, reason: "update_not_found" };
            }
            const conversations = await loadHistoryConversations({
                db,
                updateIds: [row.internal_update_id],
            });
            return {
                success: true,
                record: mapHistoryRecord({ row, conversations }),
            };
        },

        estimateAudience,

        sendTest: async ({ userId, request }) => {
            if (!sendingEnabled) {
                return {
                    success: false,
                    error: { reason: "sending_disabled" },
                };
            }
            const normalized = normalizeUserRichTextInput({
                html: request.bodyHtml,
                validationMode: "conversation_email_update",
            });
            if (!normalized.success) {
                return {
                    success: false,
                    error: { reason: "content_invalid" },
                };
            }
            const now = new Date();
            const result = await getPrimaryDatabase(db).transaction(
                async (tx) => {
                    await lockUser({ db: tx, userId });
                    const [accessRows, requesterEmail] = await Promise.all([
                        listAuthorizedConversations({
                            db: tx,
                            userId,
                            now,
                        }),
                        getPrimaryEmail({ db: tx, userId }),
                    ]);
                    if (requesterEmail === undefined) {
                        return {
                            success: false,
                            reason: "no_verified_test_email",
                        } as const;
                    }
                    const resolved = resolveSelection({
                        rows: accessRows,
                        selection: request.selection,
                    });
                    if (!resolved.success) return resolved;
                    if (
                        resolved.value.conversations.some(
                            (row) =>
                                !isSendingEnabled({
                                    row,
                                    operationallyEnabled: sendingEnabled,
                                }),
                        )
                    ) {
                        return {
                            success: false,
                            reason: "sending_disabled",
                        } as const;
                    }
                    const contactEmail = normalizeContactEmail(
                        resolved.value.project.contact_email,
                    );
                    if (contactEmail === undefined) {
                        return {
                            success: false,
                            reason: "missing_participant_contact_email",
                        } as const;
                    }
                    const requiredOwnerUserIds = await listRequiredOwnerUserIds(
                        {
                            db: tx,
                            projectId: resolved.value.project.project_id,
                        },
                    );
                    const participantEstimate = await countEligibleAudience({
                        db: tx,
                        selection: resolved.value,
                        cutoffAt: now,
                        excludedUserIds: requiredOwnerUserIds,
                    });
                    if (participantEstimate === 0) {
                        return {
                            success: false,
                            reason: "no_eligible_participants",
                        } as const;
                    }
                    const recentAttempts = await tx
                        .select({
                            createdAt:
                                conversationEmailUpdateTestAttemptTable.createdAt,
                        })
                        .from(conversationEmailUpdateTestAttemptTable)
                        .where(
                            and(
                                eq(
                                    conversationEmailUpdateTestAttemptTable.requestedByUserId,
                                    userId,
                                ),
                                gte(
                                    conversationEmailUpdateTestAttemptTable.createdAt,
                                    new Date(
                                        now.getTime() - 24 * 60 * 60 * 1_000,
                                    ),
                                ),
                            ),
                        );
                    const rateLimit = decideConversationEmailTestRateLimit({
                        now,
                        attemptCreatedAt: recentAttempts.map(
                            (attempt) => attempt.createdAt,
                        ),
                    });
                    if (!rateLimit.allowed) {
                        return {
                            success: false,
                            reason: "test_rate_limited",
                            retryAt: rateLimit.retryAt,
                        } as const;
                    }
                    const updateRows = await tx
                        .insert(conversationEmailUpdateTable)
                        .values({
                            projectId: resolved.value.project.project_id,
                            scopeKind:
                                resolved.value.project.scope_kind === "project"
                                    ? "listed_project"
                                    : "no_project",
                            createdByUserId: userId,
                            authorizingOrganizationId:
                                resolved.value.project
                                    .authorizing_organization_id,
                            authorizingPremiumFeatureId:
                                resolved.value.project
                                    .authorizing_entitlement_id,
                            projectTitleSnapshot:
                                resolved.value.project.project_title,
                            replyToNameSnapshot:
                                resolved.value.project.contact_name ??
                                resolved.value.project.project_title,
                            replyToEmailSnapshot: contactEmail,
                            subject: request.subject.trim(),
                            bodyHtml: normalized.content.html,
                            bodyPlainText: normalized.content.plainText,
                        })
                        .returning({
                            id: conversationEmailUpdateTable.id,
                            publicId: conversationEmailUpdateTable.publicId,
                        });
                    const update = updateRows.at(0);
                    if (update === undefined) {
                        throw new Error("Test update insert returned no row");
                    }
                    await tx
                        .insert(conversationEmailUpdateConversationTable)
                        .values(
                            resolved.value.conversations.map((row) => ({
                                updateId: update.id,
                                projectId: row.project_id,
                                conversationId: row.conversation_id,
                                conversationTitleSnapshot:
                                    row.conversation_title,
                            })),
                        );
                    const attemptRows = await tx
                        .insert(conversationEmailUpdateTestAttemptTable)
                        .values({
                            updateId: update.id,
                            requestedByUserId: userId,
                            destinationEmailCredentialId:
                                requesterEmail.credential_id,
                            destinationEmailSnapshot: requesterEmail.email,
                            status: "pending",
                        })
                        .returning({
                            publicId:
                                conversationEmailUpdateTestAttemptTable.publicId,
                        });
                    const attempt = attemptRows.at(0);
                    if (attempt === undefined) {
                        throw new Error("Test attempt insert returned no row");
                    }
                    return {
                        success: true,
                        updateId: update.publicId,
                        testAttemptId: attempt.publicId,
                    } as const;
                },
            );
            if (!result.success) {
                return result.reason === "test_rate_limited"
                    ? {
                          success: false,
                          error: {
                              reason: result.reason,
                              retryAt: result.retryAt,
                          },
                      }
                    : {
                          success: false,
                          error: { reason: result.reason },
                      };
            }
            return {
                success: true,
                updateId: result.updateId,
                testAttemptId: result.testAttemptId,
                status: "pending",
            };
        },

        getTestStatus: async ({ userId, request }) => {
            const rows = await getPrimaryDatabase(db)
                .select({
                    attempt_id: conversationEmailUpdateTestAttemptTable.id,
                    attempt_public_id:
                        conversationEmailUpdateTestAttemptTable.publicId,
                    update_id: conversationEmailUpdateTestAttemptTable.updateId,
                    update_public_id: conversationEmailUpdateTable.publicId,
                    project_id: conversationEmailUpdateTable.projectId,
                    authorizing_organization_id:
                        conversationEmailUpdateTable.authorizingOrganizationId,
                    requested_by_user_id:
                        conversationEmailUpdateTestAttemptTable.requestedByUserId,
                    status: conversationEmailUpdateTestAttemptTable.status,
                    finished_at:
                        conversationEmailUpdateTestAttemptTable.finishedAt,
                    error_code:
                        conversationEmailUpdateTestAttemptTable.errorCode,
                })
                .from(conversationEmailUpdateTestAttemptTable)
                .innerJoin(
                    conversationEmailUpdateTable,
                    eq(
                        conversationEmailUpdateTable.id,
                        conversationEmailUpdateTestAttemptTable.updateId,
                    ),
                )
                .where(
                    and(
                        eq(
                            conversationEmailUpdateTestAttemptTable.publicId,
                            request.testAttemptId,
                        ),
                        eq(
                            conversationEmailUpdateTestAttemptTable.requestedByUserId,
                            userId,
                        ),
                    ),
                )
                .limit(1);
            const attempt = rows.at(0);
            if (attempt === undefined) {
                return { success: false, reason: "test_not_found" };
            }
            const status = mapConversationEmailUpdateTestStatus({
                status: attempt.status,
                finishedAt: attempt.finished_at,
                errorCode: attempt.error_code,
            });
            if (status === undefined) {
                return {
                    success: false,
                    reason: "test_status_unavailable",
                };
            }
            return { success: true, status };
        },

        send: async ({ userId, request }) => {
            if (!sendingEnabled) {
                return { success: false, reason: "sending_disabled" };
            }
            try {
                const result = await getPrimaryDatabase(db).transaction(
                    async (tx) => {
                        const attemptRows = await tx
                            .select({
                                attempt_id:
                                    conversationEmailUpdateTestAttemptTable.id,
                                attempt_public_id:
                                    conversationEmailUpdateTestAttemptTable.publicId,
                                update_id:
                                    conversationEmailUpdateTestAttemptTable.updateId,
                                update_public_id:
                                    conversationEmailUpdateTable.publicId,
                                scope_kind:
                                    conversationEmailUpdateTable.scopeKind,
                                project_title:
                                    conversationEmailUpdateTable.projectTitleSnapshot,
                                subject: conversationEmailUpdateTable.subject,
                                body_html:
                                    conversationEmailUpdateTable.bodyHtml,
                                project_id:
                                    conversationEmailUpdateTable.projectId,
                                authorizing_organization_id:
                                    conversationEmailUpdateTable.authorizingOrganizationId,
                                authorizing_entitlement_id:
                                    conversationEmailUpdateTable.authorizingPremiumFeatureId,
                                reply_to_name:
                                    conversationEmailUpdateTable.replyToNameSnapshot,
                                reply_to_email:
                                    conversationEmailUpdateTable.replyToEmailSnapshot,
                                requested_by_user_id:
                                    conversationEmailUpdateTestAttemptTable.requestedByUserId,
                                status: conversationEmailUpdateTestAttemptTable.status,
                                finished_at:
                                    conversationEmailUpdateTestAttemptTable.finishedAt,
                            })
                            .from(conversationEmailUpdateTestAttemptTable)
                            .innerJoin(
                                conversationEmailUpdateTable,
                                eq(
                                    conversationEmailUpdateTable.id,
                                    conversationEmailUpdateTestAttemptTable.updateId,
                                ),
                            )
                            .where(
                                and(
                                    eq(
                                        conversationEmailUpdateTestAttemptTable.publicId,
                                        request.testAttemptId,
                                    ),
                                    eq(
                                        conversationEmailUpdateTable.publicId,
                                        request.updateId,
                                    ),
                                    eq(
                                        conversationEmailUpdateTestAttemptTable.requestedByUserId,
                                        userId,
                                    ),
                                ),
                            )
                            .for("update", {
                                of: [
                                    conversationEmailUpdateTestAttemptTable,
                                    conversationEmailUpdateTable,
                                ],
                            });
                        const attempt = attemptRows.at(0);
                        if (attempt === undefined) {
                            return {
                                success: false,
                                reason: "test_not_found",
                            } as const;
                        }
                        if (
                            !(await lockProject({
                                db: tx,
                                projectId: attempt.project_id,
                            }))
                        ) {
                            return {
                                success: false,
                                reason: "sending_disabled",
                            } as const;
                        }
                        const existing = await tx
                            .select({
                                id: conversationEmailUpdateDeliveryTable.id,
                            })
                            .from(conversationEmailUpdateDeliveryTable)
                            .where(
                                eq(
                                    conversationEmailUpdateDeliveryTable.acceptedTestAttemptId,
                                    attempt.attempt_id,
                                ),
                            )
                            .limit(1);
                        const activeDelivery = await hasActiveDelivery({
                            db: tx,
                            projectId: attempt.project_id,
                        });
                        const now = new Date();
                        const accessRows = await listAuthorizedConversations({
                            db: tx,
                            userId,
                            now,
                        });
                        const selectedRows = await tx
                            .select({
                                conversation_id:
                                    conversationEmailUpdateConversationTable.conversationId,
                                conversation_slug_id: conversationTable.slugId,
                                conversation_title:
                                    conversationEmailUpdateConversationTable.conversationTitleSnapshot,
                            })
                            .from(conversationEmailUpdateConversationTable)
                            .innerJoin(
                                conversationTable,
                                eq(
                                    conversationTable.id,
                                    conversationEmailUpdateConversationTable.conversationId,
                                ),
                            )
                            .where(
                                eq(
                                    conversationEmailUpdateConversationTable.updateId,
                                    attempt.update_id,
                                ),
                            )
                            .orderBy(conversationTable.slugId);
                        const selectedIds = new Set(
                            selectedRows.map((row) => row.conversation_id),
                        );
                        const conversations = accessRows.filter(
                            (row) =>
                                row.project_id === attempt.project_id &&
                                row.authorizing_organization_id ===
                                    attempt.authorizing_organization_id &&
                                selectedIds.has(row.conversation_id),
                        );
                        const project = conversations.at(0);
                        const everyConversationSendingEnabled =
                            project !== undefined &&
                            conversations.length === selectedIds.size &&
                            conversations.every((row) =>
                                isSendingEnabled({
                                    row,
                                    operationallyEnabled: sendingEnabled,
                                }),
                            );
                        const currentContactEmail = normalizeContactEmail(
                            project?.contact_email ?? null,
                        );
                        const sendDecision = decideConversationEmailFinalSend({
                            testStatus: attempt.status,
                            testUsed: existing.length > 0,
                            activeDelivery,
                            testedBasis: {
                                authorizingOrganizationId:
                                    attempt.authorizing_organization_id,
                                authorizingEntitlementId:
                                    attempt.authorizing_entitlement_id,
                                replyToName: attempt.reply_to_name,
                                replyToEmail: attempt.reply_to_email,
                                conversationIds: selectedRows.map(
                                    (row) => row.conversation_id,
                                ),
                            },
                            currentBasis:
                                project === undefined ||
                                currentContactEmail === undefined
                                    ? undefined
                                    : {
                                          authorizingOrganizationId:
                                              project.authorizing_organization_id,
                                          authorizingEntitlementId:
                                              project.authorizing_entitlement_id,
                                          replyToName:
                                              project.contact_name ??
                                              project.project_title,
                                          replyToEmail: currentContactEmail,
                                          conversationIds: conversations.map(
                                              (row) => row.conversation_id,
                                          ),
                                      },
                            everyConversationSendingEnabled,
                        });
                        if (!sendDecision.allowed) {
                            const reason =
                                sendDecision.reason === "test_used" ||
                                sendDecision.reason ===
                                    "delivery_already_active" ||
                                sendDecision.reason === "test_not_accepted"
                                    ? sendDecision.reason
                                    : "sending_disabled";
                            return {
                                success: false,
                                reason,
                            } as const;
                        }
                        if (project === undefined) {
                            return {
                                success: false,
                                reason: "sending_disabled",
                            } as const;
                        }
                        const participantPreferenceScope =
                            resolveConversationEmailParticipantPreferenceScope({
                                scopeKind: project.scope_kind,
                                projectDefaultEnabled:
                                    project.project_default_enabled,
                                conversationOverrideEnabled:
                                    project.conversation_override,
                            });
                        if (participantPreferenceScope === undefined) {
                            return {
                                success: false,
                                reason: "sending_disabled",
                            } as const;
                        }
                        const ownerCopySet = await resolveRequiredOwnerCopies({
                            db: tx,
                            projectId: attempt.project_id,
                            conversationIds: conversations.map(
                                (row) => row.conversation_id,
                            ),
                            facilitatorUserId: userId,
                        });
                        if (
                            !(await lockActiveEmailUpdateAuthorization({
                                db: tx,
                                projectId: attempt.project_id,
                                organizationId:
                                    attempt.authorizing_organization_id,
                                entitlementId:
                                    attempt.authorizing_entitlement_id,
                                userId,
                                now,
                            }))
                        ) {
                            return {
                                success: false,
                                reason: "sending_disabled",
                            } as const;
                        }
                        const selection = { project, conversations };
                        const acceptanceParticipantEstimate =
                            await countEligibleAudience({
                                db: tx,
                                selection,
                                cutoffAt: now,
                                excludedUserIds:
                                    ownerCopySet.requiredOwnerUserIds,
                            });
                        if (acceptanceParticipantEstimate === 0) {
                            return {
                                success: false,
                                reason: "no_eligible_participants",
                            } as const;
                        }
                        const ownerSnapshots = ownerCopySet.ownerSnapshots;
                        if (
                            ownerSnapshots === undefined ||
                            ownerSnapshots.length === 0
                        ) {
                            return {
                                success: false,
                                reason: "required_owner_copy_unavailable",
                            } as const;
                        }
                        const deliveryRows = await tx
                            .insert(conversationEmailUpdateDeliveryTable)
                            .values({
                                updateId: attempt.update_id,
                                projectId: attempt.project_id,
                                acceptedTestAttemptId: attempt.attempt_id,
                                acceptedByUserId: userId,
                                status: "preparing",
                                participantPreferenceScope,
                                audienceCutoffAt: now,
                                displayedParticipantEstimate:
                                    request.displayedParticipantEstimate,
                                acceptanceParticipantEstimate:
                                    acceptanceParticipantEstimate,
                                requiredOwnerCopyCount: ownerSnapshots.length,
                                acceptedAt: now,
                            })
                            .returning({
                                id: conversationEmailUpdateDeliveryTable.id,
                                acceptedAt:
                                    conversationEmailUpdateDeliveryTable.acceptedAt,
                            });
                        const delivery = deliveryRows.at(0);
                        if (delivery === undefined) {
                            throw new Error(
                                "Accepted delivery insert returned no row",
                            );
                        }
                        const insertedOwners = await tx
                            .insert(conversationEmailUpdateRecipientTable)
                            .values(
                                ownerSnapshots.map(
                                    (
                                        owner,
                                    ): typeof conversationEmailUpdateRecipientTable.$inferInsert => ({
                                        deliveryId: delivery.id,
                                        userId: owner.userId,
                                        kind: "conversation_owner_copy",
                                        status: "pending",
                                        materializedEmailCredentialId:
                                            owner.emailCredentialId,
                                        materializedEmailSnapshot: owner.email,
                                        displayLanguage: owner.displayLanguage,
                                    }),
                                ),
                            )
                            .returning({
                                id: conversationEmailUpdateRecipientTable.id,
                            });
                        if (insertedOwners.length !== ownerSnapshots.length) {
                            throw new Error(
                                "Required owner snapshot insert was incomplete",
                            );
                        }
                        await tx
                            .insert(
                                conversationEmailUpdateRecipientConversationTable,
                            )
                            .values(
                                insertedOwners.flatMap((owner) =>
                                    conversations.map((conversation) => ({
                                        recipientId: owner.id,
                                        deliveryId: delivery.id,
                                        updateId: attempt.update_id,
                                        conversationId:
                                            conversation.conversation_id,
                                    })),
                                ),
                            );
                        const record: ConversationEmailUpdateHistoryRecord = {
                            updateId: attempt.update_public_id,
                            subject: attempt.subject,
                            acceptedAt: delivery.acceptedAt,
                            audienceEstimate:
                                request.displayedParticipantEstimate,
                            ownerCopyCount: ownerSnapshots.length,
                            scope:
                                attempt.scope_kind === "listed_project"
                                    ? {
                                          kind: "project",
                                          title: attempt.project_title,
                                          projectSlug: project.project_slug,
                                      }
                                    : {
                                          kind: "no_project",
                                          title: NO_PROJECT_TITLE,
                                      },
                            conversations: selectedRows.map((row) => ({
                                conversationSlugId: row.conversation_slug_id,
                                title: row.conversation_title,
                            })),
                            bodyHtml: attempt.body_html,
                            status: "preparing",
                        };
                        return { success: true, record } as const;
                    },
                );
                return result;
            } catch (error: unknown) {
                if (isUniqueViolation(error)) {
                    return {
                        success: false,
                        reason: "delivery_already_active",
                    };
                }
                throw error;
            }
        },

        getPreferences: async ({ userId, request }) => {
            if ((await getPrimaryEmail({ db, userId })) === undefined) {
                return {
                    success: false,
                    reason: "verified_email_required",
                };
            }
            const rows = await loadPreferenceRows({
                db,
                userId,
                now: new Date(),
            });
            let groups = buildConversationEmailPreferenceGroups(rows);
            if (request.search !== undefined) {
                const search = request.search.toLocaleLowerCase();
                groups = groups.filter((group) =>
                    group.kind === "project"
                        ? group.projectTitle
                              .toLocaleLowerCase()
                              .includes(search) ||
                          group.conversations.some((conversation) =>
                              conversation.conversationTitle
                                  .toLocaleLowerCase()
                                  .includes(search),
                          )
                        : group.conversations.some((conversation) =>
                              conversation.conversationTitle
                                  .toLocaleLowerCase()
                                  .includes(search),
                          ),
                );
            }
            const cursorFor = (
                group: ConversationEmailUpdatePreferenceGroup,
            ): string =>
                group.kind === "project"
                    ? `project:${group.projectSlug}`
                    : "no-project";
            const startIndex =
                request.cursor === undefined
                    ? 0
                    : groups.findIndex(
                          (group) => cursorFor(group) === request.cursor,
                      ) + 1;
            if (request.cursor !== undefined && startIndex === 0) {
                return {
                    success: false,
                    reason: "preferences_unavailable",
                };
            }
            const page = groups.slice(startIndex, startIndex + request.limit);
            const lastGroup = page.at(-1);
            return {
                success: true,
                globalPaused: rows.globalPaused,
                groups: page,
                nextCursor:
                    startIndex + page.length < groups.length &&
                    lastGroup !== undefined
                        ? cursorFor(lastGroup)
                        : undefined,
            };
        },

        updatePreference: async ({ userId, request }) => {
            return await getPrimaryDatabase(db).transaction(async (tx) => {
                const now = new Date();
                if (request.operation === "set_global_pause") {
                    await lockUser({ db: tx, userId });
                    if (
                        (await getPrimaryEmail({ db: tx, userId })) === undefined
                    ) {
                        return {
                            success: false,
                            reason: "verified_email_required",
                        };
                    }
                    await tx
                        .insert(conversationEmailUpdateUserGlobalSettingTable)
                        .values({
                            userId,
                            pausedAt: request.paused ? now : null,
                            updatedAt: now,
                        })
                        .onConflictDoUpdate({
                            target: conversationEmailUpdateUserGlobalSettingTable.userId,
                            set: {
                                pausedAt: request.paused ? now : null,
                                updatedAt: now,
                            },
                        });
                    return {
                        success: true,
                        result: {
                            operation: request.operation,
                            globalPaused: request.paused,
                        },
                    };
                }
                if (request.operation === "set_project_preference") {
                    const projectRows = await tx
                        .select({ id: projectTable.id })
                        .from(projectTable)
                        .where(
                            and(
                                eq(projectTable.slug, request.projectSlug),
                                isNull(projectTable.deletedAt),
                                eq(projectTable.directoryVisibility, "listed"),
                                isNull(
                                    projectTable.autoProvisionedForOrganizationId,
                                ),
                            ),
                        )
                        .for("update")
                        .limit(1);
                    const project = projectRows.at(0);
                    if (project === undefined) {
                        return {
                            success: false,
                            reason: "project_not_found",
                        };
                    }
                    await lockUser({ db: tx, userId });
                    const existingOnboardingPreference =
                        request.source.kind === "onboarding"
                            ? await tx
                                  .select({
                                      enabled:
                                          conversationEmailUpdateUserProjectPreferenceTable.enabled,
                                  })
                                  .from(
                                      conversationEmailUpdateUserProjectPreferenceTable,
                                  )
                                  .where(
                                      and(
                                          eq(
                                              conversationEmailUpdateUserProjectPreferenceTable.userId,
                                              userId,
                                          ),
                                          eq(
                                              conversationEmailUpdateUserProjectPreferenceTable.projectId,
                                              project.id,
                                          ),
                                      ),
                                  )
                                  .limit(1)
                            : [];
                    if (
                        existingOnboardingPreference.at(0)?.enabled ===
                        request.enabled
                    ) {
                        const globalResumed = request.enabled
                            ? await resumeGloballyPausedEmailUpdates({
                                  db: tx,
                                  userId,
                                  now,
                              })
                            : false;
                        return {
                            success: true,
                            result: {
                                operation: request.operation,
                                projectSlug: request.projectSlug,
                                state: request.enabled
                                    ? "enabled"
                                    : "disabled",
                                globalResumed,
                            },
                        };
                    }
                    if (
                        (await getPrimaryEmail({ db: tx, userId })) === undefined
                    ) {
                        return {
                            success: false,
                            reason: "verified_email_required",
                        };
                    }
                    if (request.source.kind === "onboarding") {
                        const sourceConfig =
                            await getConversationConfigurationRow({
                                db: tx,
                                conversationSlugId:
                                    request.source.conversationSlugId,
                                now,
                            });
                        const sourcePreferenceScope =
                            sourceConfig === undefined
                                ? undefined
                                : resolveConversationEmailParticipantPreferenceScope(
                                      {
                                          scopeKind: sourceConfig.scope_kind,
                                          projectDefaultEnabled:
                                              sourceConfig.default_enabled,
                                          conversationOverrideEnabled:
                                              sourceConfig.override_enabled,
                                      },
                                  );
                        const sourceAvailability =
                            sourceConfig === undefined
                                ? undefined
                                : resolveConversationEmailSendingAvailability({
                                      operationallyEnabled: sendingEnabled,
                                      featureAvailable:
                                          sourceConfig.feature_available,
                                      safetyBlocked: sourceConfig.safety_blocked,
                                      configuredEnabled:
                                          sourceConfig.override_enabled ??
                                          sourceConfig.default_enabled,
                                      hasParticipantContactEmail:
                                          normalizeContactEmail(
                                              sourceConfig.contact_email,
                                          ) !== undefined,
                                  });
                        if (
                            sourceConfig?.project_id !== project.id ||
                            sourcePreferenceScope !== "project" ||
                            sourceAvailability?.available !== true ||
                            existingOnboardingPreference.length > 0
                        ) {
                            return {
                                success: false,
                                reason: "feature_not_available",
                            };
                        }
                    } else {
                        const config = await getProjectConfigurationRow({
                            db: tx,
                            projectSlug: request.projectSlug,
                            now,
                        });
                        if (config === undefined) {
                            return {
                                success: false,
                                reason: "project_not_found",
                            };
                        }
                        if (!config.feature_available || config.safety_blocked) {
                            return {
                                success: false,
                                reason: "feature_not_available",
                            };
                        }
                    }
                    const globalResumed = request.enabled
                        ? await resumeGloballyPausedEmailUpdates({
                              db: tx,
                              userId,
                              now,
                          })
                        : false;
                    await tx
                        .insert(
                            conversationEmailUpdateUserProjectPreferenceTable,
                        )
                        .values({
                            userId,
                            projectId: project.id,
                            enabled: request.enabled,
                            choiceAt: now,
                            choiceSource: request.source.kind,
                        })
                        .onConflictDoUpdate({
                            target: [
                                conversationEmailUpdateUserProjectPreferenceTable.userId,
                                conversationEmailUpdateUserProjectPreferenceTable.projectId,
                            ],
                            set: {
                                enabled: request.enabled,
                                choiceAt: now,
                                choiceSource: request.source.kind,
                            },
                        });
                    return {
                        success: true,
                        result: {
                            operation: request.operation,
                            projectSlug: request.projectSlug,
                            state: request.enabled ? "enabled" : "disabled",
                            globalResumed,
                        },
                    };
                }
                const initialConfig = await getConversationConfigurationRow({
                    db: tx,
                    conversationSlugId: request.conversationSlugId,
                    now,
                });
                if (
                    initialConfig === undefined ||
                    !(await lockProject({
                        db: tx,
                        projectId: initialConfig.project_id,
                    }))
                ) {
                    return {
                        success: false,
                        reason: "conversation_not_found",
                    };
                }
                await lockUser({ db: tx, userId });
                const config = await getConversationConfigurationRow({
                    db: tx,
                    conversationSlugId: request.conversationSlugId,
                    now,
                });
                if (config?.project_id !== initialConfig.project_id) {
                    return {
                        success: false,
                        reason: "conversation_not_found",
                    };
                }
                const preferenceScope =
                    resolveConversationEmailParticipantPreferenceScope({
                        scopeKind: config.scope_kind,
                        projectDefaultEnabled: config.default_enabled,
                        conversationOverrideEnabled: config.override_enabled,
                    });
                const preferenceState = await loadConversationPreferenceState({
                    db: tx,
                    userId,
                    projectId: config.project_id,
                    conversationId: config.conversation_id,
                    preferenceScope,
                });
                if (
                    request.source === "onboarding" &&
                    preferenceState.conversationEnabled ===
                    request.enabled
                ) {
                    const globalResumed = request.enabled
                        ? await resumeGloballyPausedEmailUpdates({
                              db: tx,
                              userId,
                              now,
                          })
                        : false;
                    const resolvedEnabled =
                        preferenceScope === "project"
                            ? resolveConversationEmailPreference({
                                  globalPaused:
                                      preferenceState.globalPaused &&
                                      !globalResumed,
                                  projectEnabled:
                                      preferenceState.projectEnabled,
                                  conversationEnabled: request.enabled,
                                  scopeKind: "project",
                              })
                            : resolveConversationEmailPreference({
                                  globalPaused:
                                      preferenceState.globalPaused &&
                                      !globalResumed,
                                  projectEnabled: undefined,
                                  conversationEnabled: request.enabled,
                                  scopeKind: "no_project",
                              });
                    return {
                        success: true,
                        result: {
                            operation: request.operation,
                            projectPreference: undefined,
                            globalResumed,
                            conversationPreferences: [
                                {
                                    conversationSlugId:
                                        request.conversationSlugId,
                                    state: request.enabled
                                        ? "enabled"
                                        : "disabled",
                                    resolvedEnabled,
                                },
                            ],
                        },
                    };
                }
                if ((await getPrimaryEmail({ db: tx, userId })) === undefined) {
                    return {
                        success: false,
                        reason: "verified_email_required",
                    };
                }
                if (!config.feature_available || config.safety_blocked) {
                    return {
                        success: false,
                        reason: "feature_not_available",
                    };
                }
                let projectPreference:
                    | { projectSlug: string; state: "enabled" }
                    | undefined;
                let conversationIds = [config.conversation_id];
                if (
                    preferenceScope === undefined ||
                    (request.source === "onboarding" &&
                        preferenceScope !== "conversation")
                ) {
                    return {
                        success: false,
                        reason: "feature_not_available",
                    };
                }
                if (request.source === "onboarding") {
                    const availability =
                        resolveConversationEmailSendingAvailability({
                            operationallyEnabled: sendingEnabled,
                            featureAvailable: config.feature_available,
                            safetyBlocked: config.safety_blocked,
                            configuredEnabled:
                                config.override_enabled ?? config.default_enabled,
                            hasParticipantContactEmail:
                                normalizeContactEmail(config.contact_email) !==
                                undefined,
                        });
                    if (
                        !availability.available ||
                        preferenceState.conversationEnabled !== undefined
                    ) {
                        return {
                            success: false,
                            reason: "feature_not_available",
                        };
                    }
                }
                const globalResumed = request.enabled
                    ? await resumeGloballyPausedEmailUpdates({
                          db: tx,
                          userId,
                          now,
                      })
                    : false;
                if (request.enabled && preferenceScope === "project") {
                    const preferences = await tx
                        .select({
                            enabled:
                                conversationEmailUpdateUserProjectPreferenceTable.enabled,
                        })
                        .from(conversationEmailUpdateUserProjectPreferenceTable)
                        .where(
                            and(
                                eq(
                                    conversationEmailUpdateUserProjectPreferenceTable.userId,
                                    userId,
                                ),
                                eq(
                                    conversationEmailUpdateUserProjectPreferenceTable.projectId,
                                    config.project_id,
                                ),
                            ),
                        )
                        .limit(1);
                    if (preferences.at(0)?.enabled !== true) {
                        await tx
                            .insert(
                                conversationEmailUpdateUserProjectPreferenceTable,
                            )
                            .values({
                                userId,
                                projectId: config.project_id,
                                enabled: true,
                                choiceAt: now,
                                choiceSource: request.source,
                            })
                            .onConflictDoUpdate({
                                target: [
                                    conversationEmailUpdateUserProjectPreferenceTable.userId,
                                    conversationEmailUpdateUserProjectPreferenceTable.projectId,
                                ],
                                set: {
                                    enabled: true,
                                    choiceAt: now,
                                    choiceSource: request.source,
                                },
                            });
                        projectPreference = {
                            projectSlug: config.project_slug,
                            state: "enabled",
                        };
                        const siblings = await tx
                            .select({ id: conversationTable.id })
                            .from(conversationTable)
                            .where(
                                and(
                                    eq(
                                        conversationTable.projectId,
                                        config.project_id,
                                    ),
                                    isNotNull(
                                        conversationTable.currentContentId,
                                    ),
                                ),
                            );
                        conversationIds = siblings.map((row) => row.id);
                    }
                }
                for (const conversationId of conversationIds) {
                    const enabled =
                        conversationId === config.conversation_id
                            ? request.enabled
                            : false;
                    await tx
                        .insert(
                            conversationEmailUpdateUserConversationPreferenceTable,
                        )
                        .values({
                            userId,
                            conversationId,
                            enabled,
                            choiceAt: now,
                            choiceSource: request.source,
                        })
                        .onConflictDoUpdate({
                            target: [
                                conversationEmailUpdateUserConversationPreferenceTable.userId,
                                conversationEmailUpdateUserConversationPreferenceTable.conversationId,
                            ],
                            set: {
                                enabled,
                                choiceAt: now,
                                choiceSource: request.source,
                            },
                        });
                }
                const changedRows = await tx
                    .select({
                        id: conversationTable.id,
                        slugId: conversationTable.slugId,
                    })
                    .from(conversationTable)
                    .where(inArray(conversationTable.id, conversationIds));
                return {
                    success: true,
                    result: {
                        operation: request.operation,
                        projectPreference,
                        globalResumed,
                        conversationPreferences: changedRows.map((row) => {
                            const enabled =
                                row.id === config.conversation_id &&
                                request.enabled;
                            const state: "enabled" | "disabled" = enabled
                                ? "enabled"
                                : "disabled";
                            return {
                                conversationSlugId: row.slugId,
                                state,
                                resolvedEnabled:
                                    enabled &&
                                    (!preferenceState.globalPaused ||
                                        globalResumed),
                            };
                        }),
                    },
                };
            });
        },

        getConfiguration,

        updateConfiguration: async ({ userId, request }) => {
            return await getPrimaryDatabase(db).transaction(async (tx) => {
                const now = new Date();
                if (request.target === "project") {
                    const initialRow = await getProjectConfigurationRow({
                        db: tx,
                        projectSlug: request.projectSlug,
                        now,
                    });
                    if (
                        initialRow === undefined ||
                        !(await lockProject({
                            db: tx,
                            projectId: initialRow.project_id,
                        }))
                    ) {
                        return {
                            success: false,
                            reason: "target_not_found",
                        };
                    }
                    const row = await getProjectConfigurationRow({
                        db: tx,
                        projectSlug: request.projectSlug,
                        now,
                    });
                    if (row?.project_id !== initialRow.project_id) {
                        return {
                            success: false,
                            reason: "target_not_found",
                        };
                    }
                    const allowed = await hasConversationEmailUpdateCapability({
                        db: tx,
                        userId,
                        projectId: row.project_id,
                        now,
                    });
                    if (!row.feature_available || !allowed) {
                        return {
                            success: false,
                            reason: "feature_not_available",
                        };
                    }
                    if (
                        request.defaultEnabled &&
                        normalizeContactEmail(row.contact_email) === undefined
                    ) {
                        return {
                            success: false,
                            reason: "missing_participant_contact_email",
                        };
                    }
                    if (
                        await hasActiveDelivery({
                            db: tx,
                            projectId: row.project_id,
                        })
                    ) {
                        return {
                            success: false,
                            reason: "active_delivery_conflict",
                        };
                    }
                    await tx
                        .update(projectTable)
                        .set({
                            conversationEmailUpdateDefaultEnabled:
                                request.defaultEnabled,
                            conversationEmailUpdateDefaultUpdatedAt: now,
                            conversationEmailUpdateDefaultUpdatedByUserId:
                                userId,
                        })
                        .where(eq(projectTable.id, row.project_id));
                } else {
                    const initialRow = await getConversationConfigurationRow({
                        db: tx,
                        conversationSlugId: request.conversationSlugId,
                        now,
                    });
                    if (
                        initialRow === undefined ||
                        !(await lockProject({
                            db: tx,
                            projectId: initialRow.project_id,
                        }))
                    ) {
                        return {
                            success: false,
                            reason: "target_not_found",
                        };
                    }
                    const row = await getConversationConfigurationRow({
                        db: tx,
                        conversationSlugId: request.conversationSlugId,
                        now,
                    });
                    if (row?.project_id !== initialRow.project_id) {
                        return {
                            success: false,
                            reason: "target_not_found",
                        };
                    }
                    const allowed = await hasConversationEmailUpdateCapability({
                        db: tx,
                        userId,
                        projectId: row.project_id,
                        now,
                    });
                    if (!row.feature_available || !allowed) {
                        return {
                            success: false,
                            reason: "feature_not_available",
                        };
                    }
                    const effectiveEnabled =
                        request.setting === "enabled" ||
                        (request.setting === "inherit" && row.default_enabled);
                    if (
                        effectiveEnabled &&
                        normalizeContactEmail(row.contact_email) === undefined
                    ) {
                        return {
                            success: false,
                            reason: "missing_participant_contact_email",
                        };
                    }
                    if (
                        await hasActiveDelivery({
                            db: tx,
                            projectId: row.project_id,
                        })
                    ) {
                        return {
                            success: false,
                            reason: "active_delivery_conflict",
                        };
                    }
                    await tx
                        .update(conversationTable)
                        .set({
                            conversationEmailUpdateEnabledOverride:
                                request.setting === "inherit"
                                    ? null
                                    : request.setting === "enabled",
                            conversationEmailUpdateOverrideUpdatedAt: now,
                            conversationEmailUpdateOverrideUpdatedByUserId:
                                userId,
                        })
                        .where(eq(conversationTable.id, row.conversation_id));
                }
                const configuration = await getConfigurationWithDatabase({
                    database: tx,
                    userId,
                    request,
                });
                return configuration.success
                    ? configuration
                    : { success: false, reason: "configuration_conflict" };
            });
        },

        getConversationSummary: async ({ userId, request }) => {
            const now = new Date();
            const row = await getConversationConfigurationRow({
                db,
                conversationSlugId: request.conversationSlugId,
                now,
            });
            if (row === undefined) {
                return {
                    success: false,
                    reason: "conversation_not_found",
                };
            }
            if (!row.feature_available) {
                return {
                    success: false,
                    reason: "feature_not_available",
                };
            }
            const preferenceScope =
                resolveConversationEmailParticipantPreferenceScope({
                    scopeKind: row.scope_kind,
                    projectDefaultEnabled: row.default_enabled,
                    conversationOverrideEnabled: row.override_enabled,
                });
            const [canAccessWorkspace, primaryEmail, preferenceState] =
                await Promise.all([
                    hasConversationEmailUpdateCapability({
                        db,
                        userId,
                        projectId: row.project_id,
                        now,
                    }),
                    getPrimaryEmail({ db, userId }),
                    loadConversationPreferenceState({
                        db,
                        userId,
                        projectId: row.project_id,
                        conversationId: row.conversation_id,
                        preferenceScope,
                    }),
                ]);
            const applicablePreference =
                preferenceScope === "project"
                    ? preferenceState.projectEnabled
                    : preferenceState.conversationEnabled;
            const state =
                applicablePreference === undefined
                    ? "undisclosed"
                    : applicablePreference
                      ? "enabled"
                      : "disabled";
            const availability = resolveConversationEmailSendingAvailability({
                operationallyEnabled: sendingEnabled,
                featureAvailable: row.feature_available,
                safetyBlocked: row.safety_blocked,
                configuredEnabled: row.override_enabled ?? row.default_enabled,
                hasParticipantContactEmail:
                    normalizeContactEmail(row.contact_email) !== undefined,
            });
            return {
                success: true,
                authoringAction: resolveConversationEmailUpdateAuthoringAction({
                    canAccessWorkspace,
                    hasHistory: row.has_history,
                }),
                participantPreference:
                    primaryEmail === undefined
                        ? undefined
                        : {
                              state,
                              resolvedEnabled:
                                  preferenceScope === "project"
                                      ? resolveConversationEmailPreference({
                                            globalPaused:
                                                preferenceState.globalPaused,
                                            projectEnabled:
                                                preferenceState.projectEnabled,
                                            conversationEnabled:
                                                preferenceState.conversationEnabled,
                                            scopeKind: "project",
                                        })
                                      : resolveConversationEmailPreference({
                                            globalPaused:
                                                preferenceState.globalPaused,
                                            projectEnabled: undefined,
                                            conversationEnabled:
                                                preferenceState.conversationEnabled,
                                            scopeKind: "no_project",
                                        }),
                              onboardingAction:
                                  resolveConversationEmailOnboardingAction({
                                      hasVerifiedEmail: true,
                                      preferenceState: state,
                                      availability,
                                      scope:
                                          preferenceScope === "project"
                                              ? {
                                                    kind: "project",
                                                    projectSlug:
                                                        row.project_slug,
                                                    conversationSlugId:
                                                        row.conversation_slug_id,
                                                }
                                              : {
                                                    kind: "conversation",
                                                    conversationSlugId:
                                                        row.conversation_slug_id,
                                                },
                                  }),
                          },
            };
        },

        getProjectSummary: async ({ userId, request }) => {
            const now = new Date();
            const configuration = await getProjectConfigurationRow({
                db,
                projectSlug: request.projectSlug,
                now,
            });
            if (
                configuration?.directory_visibility !== "listed" ||
                configuration.auto_provisioned_for_organization_id !== null
            ) {
                return { success: false, reason: "project_not_found" };
            }

            const [
                accessRows,
                hasHistory,
                primaryEmail,
                globalPreferenceRows,
                projectPreferenceRows,
            ] = await Promise.all([
                listAuthorizedConversations({
                    db,
                    userId,
                    now,
                    projectId: configuration.project_id,
                }),
                hasVisibleHistory({
                    db,
                    userId,
                    context: {
                        kind: "project",
                        projectSlug: request.projectSlug,
                    },
                }),
                getPrimaryEmail({ db, userId }),
                db
                    .select({
                        pausedAt:
                            conversationEmailUpdateUserGlobalSettingTable.pausedAt,
                    })
                    .from(conversationEmailUpdateUserGlobalSettingTable)
                    .where(
                        eq(
                            conversationEmailUpdateUserGlobalSettingTable.userId,
                            userId,
                        ),
                    )
                    .limit(1),
                db
                    .select({
                        enabled:
                            conversationEmailUpdateUserProjectPreferenceTable.enabled,
                    })
                    .from(conversationEmailUpdateUserProjectPreferenceTable)
                    .where(
                        and(
                            eq(
                                conversationEmailUpdateUserProjectPreferenceTable.userId,
                                userId,
                            ),
                            eq(
                                conversationEmailUpdateUserProjectPreferenceTable.projectId,
                                configuration.project_id,
                            ),
                        ),
                    )
                    .limit(1),
            ]);
            const canAccessWorkspace = accessRows.length > 0;
            if (!configuration.feature_available && !hasHistory) {
                return {
                    success: false,
                    reason: "feature_not_available",
                };
            }

            const projectPreference = projectPreferenceRows.at(0)?.enabled;
            const globalPaused =
                globalPreferenceRows.length > 0 &&
                globalPreferenceRows.at(0)?.pausedAt !== null;
            const state =
                projectPreference === undefined
                    ? "undisclosed"
                    : projectPreference
                      ? "enabled"
                      : "disabled";
            return {
                success: true,
                authoringAction: resolveConversationEmailUpdateAuthoringAction({
                    canAccessWorkspace,
                    hasHistory,
                }),
                participantPreference:
                    primaryEmail === undefined ||
                    !configuration.feature_available ||
                    configuration.safety_blocked
                        ? undefined
                        : {
                              state,
                              resolvedEnabled:
                                  resolveConversationEmailPreference({
                                      globalPaused,
                                      projectEnabled: projectPreference,
                                      conversationEnabled: undefined,
                                      scopeKind: "project",
                                  }),
                          },
            };
        },
    };
}
