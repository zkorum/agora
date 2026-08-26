import { createHash } from "node:crypto";
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
    notExists,
    notInArray,
    or,
    sql,
} from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { buildConversationEmailParticipationQuery } from "@/shared-backend/conversationEmailUpdateParticipation.js";
import {
    buildConversationEmailGlobalPreferenceCondition,
    buildConversationEmailPreferenceCondition,
    type ConversationEmailUpdatePreferenceScope,
    resolveConversationEmailPreference,
    resolveConversationEmailPreferenceChoice,
} from "@/shared-backend/conversationEmailUpdatePreference.js";
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
    projectExternalOrganizationTable,
    projectOrganizationAttributionTable,
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
    ConversationEmailUpdatePreferenceAvatar,
    ConversationEmailUpdatePreferenceConversationsRequest,
    ConversationEmailUpdatePreferenceConversationsResponse,
    ConversationEmailUpdatePreferenceFocus,
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
import { Dto } from "@/shared/types/dto.js";
import { imagePathToUrl } from "@/utils/organizationLogic.js";
import {
    decideConversationEmailFinalSend,
    decideConversationEmailTestRateLimit,
    isConversationEmailUpdateConfigured,
    resolveConversationEmailOnboardingAction,
    resolveConversationEmailParticipantPreferenceScope,
    resolveConversationEmailSendingAvailability,
} from "./conversationEmailUpdatePolicy.js";
import { lockConversationEmailUpdateProject } from "./conversationEmailUpdateProjectLock.js";
import { normalizeUserRichTextInput } from "./richText.js";

const NO_PROJECT_TITLE = "No Project";

type ConversationEmailUpdateAuthoringAction = Extract<
    ConversationEmailUpdateConversationSummaryResponse,
    { success: true }
>["authoringAction"];

export function resolveConversationEmailUpdateAuthoringAction({
    canAccessWorkspace,
    hasConfiguredConversation,
    hasHistory,
}: {
    canAccessWorkspace: boolean;
    hasConfiguredConversation: boolean;
    hasHistory: boolean;
}): ConversationEmailUpdateAuthoringAction {
    if (canAccessWorkspace && hasConfiguredConversation) {
        return "compose";
    }
    return hasHistory ? "history" : "none";
}

export function shouldExposeConversationEmailUpdateParticipantPreference({
    featureAvailable,
    hasPrimaryEmail,
    preferenceScope,
    safetyBlocked,
}: {
    featureAvailable: boolean;
    hasPrimaryEmail: boolean;
    preferenceScope: ConversationEmailUpdatePreferenceScope | undefined;
    safetyBlocked: boolean;
}): boolean {
    return (
        featureAvailable &&
        hasPrimaryEmail &&
        preferenceScope !== undefined &&
        !safetyBlocked
    );
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
    getPreferenceConversations: (
        params: AuthenticatedRequest<ConversationEmailUpdatePreferenceConversationsRequest>,
    ) => Promise<ConversationEmailUpdatePreferenceConversationsResponse>;
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
interface WorkspaceContextRow {
    scope_kind: "project" | "no_project";
    project_slug: string;
    conversation_slug_id: string;
}
type NoProjectScope = Extract<
    ConversationEmailUpdateScope,
    { kind: "no_project" }
>;
type ProjectScope = Extract<ConversationEmailUpdateScope, { kind: "project" }>;
type NonEmptyArray<Value> = [Value, ...Value[]];
type PreferenceProjectDao = Awaited<
    ReturnType<typeof queryPreferenceProjects>
>[number];
type PreferenceConversationDao = Extract<
    Awaited<ReturnType<typeof queryPreferenceConversationPage>>,
    { success: true }
>["rows"][number];
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

const WORKSPACE_AUDIENCE_QUERY_BATCH_SIZE = 1_000;

export function splitWorkspaceAudienceEstimateBatches<Value>({
    items,
}: {
    items: readonly Value[];
}): NonEmptyArray<Value>[] {
    const batches: NonEmptyArray<Value>[] = [];
    for (
        let offset = 0;
        offset < items.length;
        offset += WORKSPACE_AUDIENCE_QUERY_BATCH_SIZE
    ) {
        const batch = items.slice(
            offset,
            offset + WORKSPACE_AUDIENCE_QUERY_BATCH_SIZE,
        );
        const firstItem = batch.at(0);
        if (firstItem !== undefined) {
            batches.push([firstItem, ...batch.slice(1)]);
        }
    }
    return batches;
}

export function resolveConversationEmailUpdateWorkspaceContext({
    rows,
    context,
}: {
    rows: readonly WorkspaceContextRow[];
    context: ConversationEmailUpdateWorkspaceRequest["context"];
}):
    | { initialSelection: ConversationEmailUpdateSelection | undefined }
    | undefined {
    if (context.kind === "global") {
        return rows.length === 0 ? undefined : { initialSelection: undefined };
    }
    if (context.kind === "project") {
        const contextAvailable = rows.some(
            (row) =>
                row.scope_kind === "project" &&
                row.project_slug === context.projectSlug,
        );
        return contextAvailable ? { initialSelection: undefined } : undefined;
    }

    const selected = rows.find(
        (row) => row.conversation_slug_id === context.conversationSlugId,
    );
    if (selected === undefined) return undefined;
    const initialSelection = Dto.conversationEmailUpdateSelection.parse(
        selected.scope_kind === "project"
            ? {
                  kind: "project",
                  projectSlug: selected.project_slug,
                  conversationSlugIds: [selected.conversation_slug_id],
              }
            : {
                  kind: "no_project",
                  conversationSlugId: selected.conversation_slug_id,
              },
    );
    return { initialSelection };
}

export function isConversationEmailUpdateWorkspaceContextRepresented({
    scopes,
    context,
}: {
    scopes: readonly ConversationEmailUpdateScope[];
    context: ConversationEmailUpdateWorkspaceRequest["context"];
}): boolean {
    if (context.kind === "global") return scopes.length > 0;
    if (context.kind === "project") {
        return scopes.some(
            (scope) =>
                scope.kind === "project" &&
                scope.projectSlug === context.projectSlug,
        );
    }
    return scopes.some((scope) =>
        scope.conversations.some(
            (conversation) =>
                conversation.conversationSlugId === context.conversationSlugId,
        ),
    );
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
    ownerByProjectId: ReadonlyMap<
        number,
        ConversationEmailUpdatePreferenceAvatar
    >;
    conversationNextCursorByGroup: ReadonlyMap<string, string>;
}

export function buildConversationEmailPreferenceGroups({
    globalPaused,
    projectRows,
    conversationRows,
    ownerByProjectId,
    conversationNextCursorByGroup,
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
        const owner = ownerByProjectId.get(projectId);
        const conversationNextCursor = conversationNextCursorByGroup.get(
            `project:${project?.project_slug ?? firstChild?.project_slug ?? ""}`,
        );
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
            ...(owner === undefined ? {} : { owner }),
            ...(conversationNextCursor === undefined
                ? {}
                : { conversationNextCursor }),
            availability:
                (project?.available ??
                children.some((conversation) => conversation.available))
                    ? "available"
                    : "temporarily_unavailable",
            conversations: children.map((row) => ({
                conversationSlugId: row.conversation_slug_id,
                conversationTitle: row.conversation_title,
                ...(row.conversation_enabled === undefined
                    ? row.scope_kind === "project" &&
                      row.project_enabled !== undefined
                        ? {
                              preferenceKind: "project_inherited",
                              state: "undisclosed",
                          }
                        : {
                              preferenceKind: "undisclosed",
                              state: "undisclosed",
                          }
                    : {
                          preferenceKind: "explicit",
                          state: row.conversation_enabled
                              ? "enabled"
                              : "disabled",
                      }),
                resolvedEnabled: resolveConversationEmailPreference({
                    globalPaused,
                    projectEnabled: row.project_enabled,
                    conversationEnabled: row.conversation_enabled,
                    scopeKind: "project",
                }),
                availability: row.available
                    ? "available"
                    : "temporarily_unavailable",
            })),
        });
    }
    if (noProjectRows.length > 0) {
        const conversationNextCursor =
            conversationNextCursorByGroup.get("no-project");
        groups.push({
            kind: "no_project",
            ...(conversationNextCursor === undefined
                ? {}
                : { conversationNextCursor }),
            availability: noProjectRows.some((row) => row.available)
                ? "available"
                : "temporarily_unavailable",
            conversations: noProjectRows.map((row) => {
                const owner = ownerByProjectId.get(row.project_id);
                return {
                    conversationSlugId: row.conversation_slug_id,
                    conversationTitle: row.conversation_title,
                    ...(owner === undefined ? {} : { owner }),
                    ...(row.conversation_enabled === undefined
                        ? {
                              preferenceKind: "undisclosed",
                              state: "undisclosed",
                          }
                        : {
                              preferenceKind: "explicit",
                              state: row.conversation_enabled
                                  ? "enabled"
                                  : "disabled",
                          }),
                    resolvedEnabled: resolveConversationEmailPreference({
                        globalPaused,
                        projectEnabled: undefined,
                        conversationEnabled: row.conversation_enabled,
                        scopeKind: "no_project",
                    }),
                    availability: row.available
                        ? "available"
                        : "temporarily_unavailable",
                };
            }),
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
    const preferenceScope = resolveConversationEmailParticipantPreferenceScope({
        scopeKind: selectedConversation.scope_kind,
        projectDefaultEnabled: selectedConversation.project_default_enabled,
        conversationOverrideEnabled: selectedConversation.conversation_override,
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
    const preferenceCondition = buildConversationEmailPreferenceCondition({
        preferenceScope,
        choiceAtOrBefore: cutoffAt,
    });
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
                buildConversationEmailGlobalPreferenceCondition({
                    choiceAtOrBefore: cutoffAt,
                }),
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

function buildRequiredOwnerRowsQuery({
    db,
    projectIds,
}: {
    db: PostgresJsDatabase;
    projectIds: NonEmptyArray<number>;
}) {
    return db
        .selectDistinct({
            projectId: projectOrganizationOwnershipTable.projectId,
            userId: organizationMembershipTable.userId,
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
        .where(
            and(
                inArray(projectOrganizationOwnershipTable.projectId, [
                    ...projectIds,
                ]),
                isNull(organizationMembershipTable.deletedAt),
            ),
        );
}

export function buildWorkspaceAudienceEstimateQuery({
    db,
    cutoffAt,
    conversationIds,
    projectIds,
    projectPreferenceConversationIds,
    conversationPreferenceConversationIds,
}: {
    db: PostgresJsDatabase;
    cutoffAt: Date;
    conversationIds: NonEmptyArray<number>;
    projectIds: NonEmptyArray<number>;
    projectPreferenceConversationIds: number[];
    conversationPreferenceConversationIds: number[];
}) {
    const participation = buildConversationEmailParticipationQuery({
        db,
        cutoffAt,
        scope: { kind: "conversation_ids", conversationIds },
    }).as("workspace_participation");
    const requiredOwners = buildRequiredOwnerRowsQuery({
        db,
        projectIds,
    }).as("workspace_required_owner");
    const projectPreferenceCondition =
        projectPreferenceConversationIds.length === 0
            ? undefined
            : and(
                  inArray(
                      participation.conversationId,
                      projectPreferenceConversationIds,
                  ),
                  buildConversationEmailPreferenceCondition({
                      preferenceScope: "project",
                      choiceAtOrBefore: cutoffAt,
                  }),
              );
    const conversationPreferenceCondition =
        conversationPreferenceConversationIds.length === 0
            ? undefined
            : and(
                  inArray(
                      participation.conversationId,
                      conversationPreferenceConversationIds,
                  ),
                  buildConversationEmailPreferenceCondition({
                      preferenceScope: "conversation",
                      choiceAtOrBefore: cutoffAt,
                  }),
              );
    return db
        .select({
            conversationId: participation.conversationId,
            eligibleCount: countDistinct(participation.userId),
        })
        .from(participation)
        .innerJoin(
            conversationTable,
            eq(conversationTable.id, participation.conversationId),
        )
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
                    conversationTable.projectId,
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
        .leftJoin(
            requiredOwners,
            and(
                eq(requiredOwners.projectId, conversationTable.projectId),
                eq(requiredOwners.userId, participation.userId),
            ),
        )
        .where(
            and(
                buildConversationEmailGlobalPreferenceCondition({
                    choiceAtOrBefore: cutoffAt,
                }),
                isNull(requiredOwners.userId),
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
                or(projectPreferenceCondition, conversationPreferenceCondition),
            ),
        )
        .groupBy(participation.conversationId);
}

async function listRequiredOwnerUserIds({
    db,
    projectId,
}: {
    db: PostgresJsDatabase;
    projectId: number;
}): Promise<string[]> {
    const rows = await buildRequiredOwnerRowsQuery({
        db,
        projectIds: [projectId],
    });
    return rows.map((row) => row.userId);
}

async function listWorkspaceAudienceEstimates({
    db,
    rows,
    cutoffAt,
}: {
    db: PostgresJsDatabase;
    rows: readonly AuthorizedConversationDao[];
    cutoffAt: Date;
}): Promise<ReadonlyMap<number, number>> {
    const rowsWithPreferenceScope = rows.flatMap((row) => {
        const preferenceScope =
            resolveConversationEmailParticipantPreferenceScope({
                scopeKind: row.scope_kind,
                projectDefaultEnabled: row.project_default_enabled,
                conversationOverrideEnabled: row.conversation_override,
            });
        return preferenceScope === undefined ? [] : [{ row, preferenceScope }];
    });
    const estimates = new Map<number, number>();
    for (const batchRows of splitWorkspaceAudienceEstimateBatches({
        items: rowsWithPreferenceScope,
    })) {
        const [firstBatchRow, ...remainingBatchRows] = batchRows;
        const conversationIds: NonEmptyArray<number> = [
            firstBatchRow.row.conversation_id,
            ...remainingBatchRows.map(({ row }) => row.conversation_id),
        ];
        const [firstProjectId, ...remainingProjectIds] = new Set(
            batchRows.map(({ row }) => row.project_id),
        );
        const estimateRows = await buildWorkspaceAudienceEstimateQuery({
            db,
            cutoffAt,
            conversationIds,
            projectIds: [firstProjectId, ...remainingProjectIds],
            projectPreferenceConversationIds: batchRows.flatMap(
                ({ row, preferenceScope }) =>
                    preferenceScope === "project" ? [row.conversation_id] : [],
            ),
            conversationPreferenceConversationIds: batchRows.flatMap(
                ({ row, preferenceScope }) =>
                    preferenceScope === "conversation"
                        ? [row.conversation_id]
                        : [],
            ),
        });
        for (const row of estimateRows) {
            estimates.set(row.conversationId, row.eligibleCount);
        }
    }
    return estimates;
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

function mapProjectScopeConversation({
    row,
    estimates,
    operationalSendingEnabled,
}: {
    row: AuthorizedConversationDao;
    estimates: ReadonlyMap<number, number>;
    operationalSendingEnabled: boolean;
}): ProjectScope["conversations"][number] {
    return {
        conversationSlugId: row.conversation_slug_id,
        title: row.conversation_title,
        participationMode: row.participation_mode,
        estimatedEligibleRecipientCount:
            estimates.get(row.conversation_id) ?? 0,
        sendingEnabled: isSendingEnabled({
            row,
            operationallyEnabled: operationalSendingEnabled,
        }),
    };
}

function createNoProjectScope({
    conversations,
}: {
    conversations: readonly NoProjectScope["conversations"][number][];
}): NoProjectScope | undefined {
    const firstConversation = conversations.at(0);
    return firstConversation === undefined
        ? undefined
        : {
              kind: "no_project",
              title: NO_PROJECT_TITLE,
              conversations: [firstConversation, ...conversations.slice(1)],
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
    const projectRows = new Map<
        number,
        NonEmptyArray<AuthorizedConversationDao>
    >();
    const noProjectRows: AuthorizedConversationDao[] = [];
    for (const row of rows) {
        if (row.scope_kind === "no_project") {
            noProjectRows.push(row);
            continue;
        }
        const current = projectRows.get(row.project_id);
        if (current === undefined) {
            projectRows.set(row.project_id, [row]);
        } else {
            current.push(row);
        }
    }
    const scopes: ConversationEmailUpdateScope[] = [];
    for (const rowsInProject of projectRows.values()) {
        const [project, ...remainingRows] = rowsInProject;
        const participantContactEmail = normalizeContactEmail(
            project.contact_email,
        );
        if (participantContactEmail === undefined) {
            continue;
        }
        scopes.push({
            kind: "project",
            projectSlug: project.project_slug,
            title: project.project_title,
            participantContactEmail,
            conversations: [
                mapProjectScopeConversation({
                    row: project,
                    estimates,
                    operationalSendingEnabled,
                }),
                ...remainingRows.map((row) =>
                    mapProjectScopeConversation({
                        row,
                        estimates,
                        operationalSendingEnabled,
                    }),
                ),
            ],
        });
    }
    const noProjectScope = createNoProjectScope({
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
                              operationallyEnabled: operationalSendingEnabled,
                          }),
                          participantContactEmail,
                      },
                  ];
        }),
    });
    if (noProjectScope !== undefined) {
        scopes.push(noProjectScope);
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

export type PreferenceGroupKey =
    | { kind: "project"; projectId: number; projectSlug: string }
    | { kind: "no_project" };

function preferenceGroupKey(group: PreferenceGroupKey): string {
    return group.kind === "project"
        ? `project:${group.projectSlug}`
        : "no-project";
}

function preferenceSearchFingerprint(search: string | undefined): string {
    return createHash("sha256")
        .update(search?.toLocaleLowerCase() ?? "")
        .digest("base64url");
}

function encodePreferenceGroupCursor({
    projectId,
    search,
}: {
    projectId: number;
    search: string | undefined;
}): string {
    return `preference-groups:v1:${preferenceSearchFingerprint(search)}:${projectId.toString()}`;
}

function parsePreferenceGroupCursor({
    cursor,
    search,
}: {
    cursor: string;
    search: string | undefined;
}): number | undefined {
    const match = /^preference-groups:v1:([A-Za-z0-9_-]{43}):(\d+)$/.exec(
        cursor,
    );
    if (match?.[1] !== preferenceSearchFingerprint(search)) {
        return undefined;
    }
    const projectId = Number(match[2]);
    return Number.isSafeInteger(projectId) ? projectId : undefined;
}

async function resolvePreferenceProjectGroupKey({
    db,
    projectSlug,
}: {
    db: PostgresJsDatabase;
    projectSlug: string;
}): Promise<PreferenceGroupKey | undefined> {
    const rows = await db
        .select({ projectId: projectTable.id, projectSlug: projectTable.slug })
        .from(projectTable)
        .where(and(eq(projectTable.slug, projectSlug), isNull(projectTable.deletedAt)))
        .limit(1);
    const project = rows.at(0);
    return project === undefined
        ? undefined
        : {
              kind: "project",
              projectId: project.projectId,
              projectSlug: project.projectSlug,
          };
}

const PREFERENCE_CONVERSATION_PAGE_SIZE = 10;

function buildPreferenceScopeAvailabilityCondition({
    db,
    now,
    scopeKind,
    userId,
}: {
    db: PostgresJsDatabase;
    now: Date;
    scopeKind: "project" | "no_project";
    userId: string;
}) {
    const hasContactEmail = exists(
        db
            .select({ id: projectContactTable.id })
            .from(projectContactTable)
            .where(
                and(
                    eq(projectContactTable.projectId, projectTable.id),
                    isNull(projectContactTable.deletedAt),
                    isNotNull(projectContactTable.email),
                ),
            ),
    );
    const hasFeatureEntitlement = exists(
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
                        isNull(premiumFeatureEntitlementTable.expiresAt),
                        gt(premiumFeatureEntitlementTable.expiresAt, now),
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
                            .from(conversationEmailUpdateScopeSafetyBlockTable)
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
    );
    const projectNotBlocked = notExists(
        db
            .select({ id: conversationEmailUpdateScopeSafetyBlockTable.id })
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
    );
    const availableToUser =
        scopeKind === "project"
            ? undefined
            : exists(
                  db
                      .select({ id: organizationTable.id })
                      .from(organizationTable)
                      .where(
                          and(
                              eq(
                                  organizationTable.id,
                                  projectTable.autoProvisionedForOrganizationId,
                              ),
                              isNull(organizationTable.deletedAt),
                              or(
                                  eq(
                                      organizationTable.autoProvisionedForUserId,
                                      userId,
                                  ),
                                  exists(
                                      db
                                          .select({
                                              id: organizationMembershipTable.id,
                                          })
                                          .from(organizationMembershipTable)
                                          .where(
                                              and(
                                                  eq(
                                                      organizationMembershipTable.organizationId,
                                                      organizationTable.id,
                                                  ),
                                                  eq(
                                                      organizationMembershipTable.userId,
                                                      userId,
                                                  ),
                                                  isNull(
                                                      organizationMembershipTable.deletedAt,
                                                  ),
                                              ),
                                          ),
                                  ),
                              ),
                          ),
                      ),
              );
    return and(
        isNull(projectTable.deletedAt),
        scopeKind === "project"
            ? and(
                  eq(projectTable.directoryVisibility, "listed"),
                  isNull(projectTable.autoProvisionedForOrganizationId),
              )
            : isNotNull(projectTable.autoProvisionedForOrganizationId),
        hasContactEmail,
        hasFeatureEntitlement,
        projectNotBlocked,
        availableToUser,
    );
}

function buildPreferenceConversationAvailabilityCondition({
    db,
    now,
    scopeKind,
    userId,
}: {
    db: PostgresJsDatabase;
    now: Date;
    scopeKind: "project" | "no_project";
    userId: string;
}) {
    return and(
        buildPreferenceScopeAvailabilityCondition({
            db,
            now,
            scopeKind,
            userId,
        }),
        isNotNull(conversationTable.currentContentId),
        eq(conversationTable.isImporting, false),
        notExists(
            db
                .select({ id: conversationEmailUpdateScopeSafetyBlockTable.id })
                .from(conversationEmailUpdateScopeSafetyBlockTable)
                .where(
                    and(
                        eq(
                            conversationEmailUpdateScopeSafetyBlockTable.targetKind,
                            "conversation",
                        ),
                        eq(
                            conversationEmailUpdateScopeSafetyBlockTable.conversationId,
                            conversationTable.id,
                        ),
                        isNull(
                            conversationEmailUpdateScopeSafetyBlockTable.liftedAt,
                        ),
                    ),
                ),
        ),
    );
}

export async function queryPreferenceGroupPage({
    db,
    userId,
    request,
    now = new Date(),
}: {
    db: PostgresJsDatabase;
    userId: string;
    request: ConversationEmailUpdatePreferencesRequest;
    now?: Date;
}): Promise<
    | {
          success: true;
          groupKeys: PreferenceGroupKey[];
          nextCursor: string | undefined;
      }
    | { success: false }
> {
    const focus = request.mode === "focus" ? request.focus : undefined;
    const groupLimit = request.mode === "browse" ? request.limit : 1;
    const search =
        request.mode === "browse"
            ? request.search?.toLocaleLowerCase()
            : undefined;
    const cursor = request.mode === "browse" ? request.cursor : undefined;
    const explicitConversationPreference = exists(
        db
            .select({
                id: conversationEmailUpdateUserConversationPreferenceTable.conversationId,
            })
            .from(conversationEmailUpdateUserConversationPreferenceTable)
            .innerJoin(
                conversationTable,
                eq(
                    conversationTable.id,
                    conversationEmailUpdateUserConversationPreferenceTable.conversationId,
                ),
            )
            .where(
                and(
                    eq(
                        conversationEmailUpdateUserConversationPreferenceTable.userId,
                        userId,
                    ),
                    eq(conversationTable.projectId, projectTable.id),
                ),
            ),
    );
    const projectPreference = exists(
        db
            .select({
                id: conversationEmailUpdateUserProjectPreferenceTable.projectId,
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
                        projectTable.id,
                    ),
                ),
            ),
    );
    const projectAvailable = buildPreferenceScopeAvailabilityCondition({
        db,
        now,
        scopeKind: "project",
        userId,
    });
    const projectConversationAvailable =
        buildPreferenceConversationAvailabilityCondition({
            db,
            now,
            scopeKind: "project",
            userId,
        });
    const conversationMatchesRequest =
        focus?.kind === "conversation"
            ? eq(conversationTable.slugId, focus.conversationSlugId)
            : search === undefined
              ? undefined
              : or(
                    gt(
                        sql<number>`strpos(lower(coalesce(${conversationContentTable.title}, ${conversationTable.slugId})), ${search})`,
                        0,
                    ),
                    gt(
                        sql<number>`strpos(lower(${conversationTable.slugId}), ${search})`,
                        0,
                    ),
                );
    const matchingConversation = exists(
        db
            .select({ id: conversationTable.id })
            .from(conversationTable)
            .leftJoin(
                conversationEmailUpdateUserConversationPreferenceTable,
                and(
                    eq(
                        conversationEmailUpdateUserConversationPreferenceTable.conversationId,
                        conversationTable.id,
                    ),
                    eq(
                        conversationEmailUpdateUserConversationPreferenceTable.userId,
                        userId,
                    ),
                ),
            )
            .leftJoin(
                conversationEmailUpdateUserProjectPreferenceTable,
                and(
                    eq(
                        conversationEmailUpdateUserProjectPreferenceTable.projectId,
                        conversationTable.projectId,
                    ),
                    eq(
                        conversationEmailUpdateUserProjectPreferenceTable.userId,
                        userId,
                    ),
                ),
            )
            .leftJoin(
                conversationContentTable,
                eq(
                    conversationContentTable.id,
                    conversationTable.currentContentId,
                ),
            )
            .where(
                and(
                    eq(conversationTable.projectId, projectTable.id),
                    or(
                        isNotNull(
                            conversationEmailUpdateUserConversationPreferenceTable.enabled,
                        ),
                        and(
                            projectConversationAvailable,
                            eq(conversationTable.isIndexed, true),
                        ),
                    ),
                    conversationMatchesRequest,
                ),
            ),
    );
    const persistedProjectIntent = or(
        projectPreference,
        and(
            isNull(projectTable.autoProvisionedForOrganizationId),
            explicitConversationPreference,
        ),
    );
    const projectMatchesSearch =
        search === undefined
            ? undefined
            : or(
                  gt(
                      sql<number>`strpos(lower(${projectTable.title}), ${search})`,
                      0,
                  ),
                  gt(
                      sql<number>`strpos(lower(${projectTable.slug}), ${search})`,
                      0,
                  ),
              );
    const projectConditions =
        focus?.kind === "project"
            ? and(
                  eq(projectTable.slug, focus.projectSlug),
                  or(persistedProjectIntent, projectAvailable),
              )
            : focus?.kind === "conversation"
              ? and(
                    isNull(projectTable.autoProvisionedForOrganizationId),
                    matchingConversation,
                )
              : search === undefined
                ? persistedProjectIntent
                : or(
                      and(
                          projectMatchesSearch,
                          or(persistedProjectIntent, projectAvailable),
                      ),
                      and(
                          isNull(projectTable.autoProvisionedForOrganizationId),
                          matchingConversation,
                      ),
                  );
    const noProjectConversationAvailable =
        buildPreferenceConversationAvailabilityCondition({
            db,
            now,
            scopeKind: "no_project",
            userId,
        });
    const noProjectConditions = and(
        isNotNull(projectTable.autoProvisionedForOrganizationId),
        or(
            isNotNull(
                conversationEmailUpdateUserConversationPreferenceTable.enabled,
            ),
            and(
                noProjectConversationAvailable,
                eq(conversationTable.isIndexed, true),
            ),
        ),
        focus?.kind === "project"
            ? sql<boolean>`false`
            : focus?.kind === "conversation"
              ? eq(conversationTable.slugId, focus.conversationSlugId)
              : search === undefined
                ? isNotNull(
                      conversationEmailUpdateUserConversationPreferenceTable.enabled,
                  )
                : or(
                      gt(
                          sql<number>`strpos(lower(coalesce(${conversationContentTable.title}, ${conversationTable.slugId})), ${search})`,
                          0,
                      ),
                      gt(
                          sql<number>`strpos(lower(${conversationTable.slugId}), ${search})`,
                          0,
                      ),
                  ),
    );
    let cursorProjectId: number | undefined;
    if (cursor !== undefined) {
        const parsedCursorProjectId = parsePreferenceGroupCursor({
            cursor,
            search,
        });
        if (parsedCursorProjectId === undefined) {
            return { success: false };
        }
        const cursorRows = await db
            .select({ projectId: projectTable.id })
            .from(projectTable)
            .where(
                and(
                    eq(projectTable.id, parsedCursorProjectId),
                    projectConditions,
                ),
            )
            .orderBy(projectTable.id)
            .limit(1);
        const cursorProject = cursorRows.at(0);
        if (cursorProject === undefined) {
            return { success: false };
        }
        cursorProjectId = cursorProject.projectId;
    }

    const noProjectRows =
        focus?.kind === "project"
            ? []
            : await db
                  .select({ id: conversationTable.id })
                  .from(conversationTable)
                  .innerJoin(
                      projectTable,
                      eq(projectTable.id, conversationTable.projectId),
                  )
                  .leftJoin(
                      conversationEmailUpdateUserConversationPreferenceTable,
                      and(
                          eq(
                              conversationEmailUpdateUserConversationPreferenceTable.conversationId,
                              conversationTable.id,
                          ),
                          eq(
                              conversationEmailUpdateUserConversationPreferenceTable.userId,
                              userId,
                          ),
                      ),
                  )
                  .leftJoin(
                      conversationContentTable,
                      eq(
                          conversationContentTable.id,
                          conversationTable.currentContentId,
                      ),
                  )
                  .where(noProjectConditions)
                  .limit(1);
    const hasNoProject = noProjectRows.length === 1;

    const projectRows = await db
        .select({
            projectId: projectTable.id,
            projectSlug: projectTable.slug,
        })
        .from(projectTable)
        .where(
            and(
                projectConditions,
                cursorProjectId === undefined
                    ? undefined
                    : gt(projectTable.id, cursorProjectId),
            ),
        )
        .orderBy(projectTable.id)
        .limit(focus === undefined ? groupLimit + 1 : 1);
    const projectKeys = projectRows.map(
        (row): PreferenceGroupKey => ({
            kind: "project",
            projectId: row.projectId,
            projectSlug: row.projectSlug,
        }),
    );
    const hasMoreProjects =
        focus === undefined && projectKeys.length > groupLimit;
    const groupKeys = projectKeys.slice(0, groupLimit);
    if (!hasMoreProjects && hasNoProject && groupKeys.length < groupLimit) {
        groupKeys.push({ kind: "no_project" });
    }
    const lastGroup = groupKeys.at(-1);
    const hasMore =
        hasMoreProjects ||
        (hasNoProject &&
            !groupKeys.some((group) => group.kind === "no_project"));
    return {
        success: true,
        groupKeys,
        nextCursor:
            hasMore && lastGroup?.kind === "project"
                ? encodePreferenceGroupCursor({
                      projectId: lastGroup.projectId,
                      search,
                  })
                : undefined,
    };
}

async function queryPreferenceProjects({
    db,
    userId,
    now,
    projectIds,
}: {
    db: PostgresJsDatabase;
    userId: string;
    now: Date;
    projectIds: readonly number[];
}) {
    if (projectIds.length === 0) return [];
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
        .from(projectTable)
        .leftJoin(
            conversationEmailUpdateUserProjectPreferenceTable,
            and(
                eq(
                    projectTable.id,
                    conversationEmailUpdateUserProjectPreferenceTable.projectId,
                ),
                eq(
                    conversationEmailUpdateUserProjectPreferenceTable.userId,
                    userId,
                ),
            ),
        )
        .leftJoin(
            projectContactTable,
            and(
                eq(projectContactTable.projectId, projectTable.id),
                isNull(projectContactTable.deletedAt),
            ),
        )
        .where(inArray(projectTable.id, projectIds))
        .orderBy(projectTable.id);
    return rows.map((row) => ({
        project_id: row.project_id,
        project_slug: row.project_slug,
        project_title: row.project_title,
        enabled: row.enabled ?? undefined,
        available:
            row.deleted_at === null &&
            row.directory_visibility === "listed" &&
            row.auto_provisioned_for_organization_id === null &&
            row.contact_email !== null &&
            row.feature_available === true &&
            row.safety_blocked !== true,
    }));
}

interface PreferenceConversationCursor {
    tier: "explicit" | "undisclosed";
    conversationId: number;
}

const PREFERENCE_CONVERSATION_CURSOR_PATTERN =
    /^preference-conversations:v1:(p\d+|n):([A-Za-z0-9_-]{43}):(explicit|undisclosed):(\d+)$/;

function encodePreferenceConversationCursor({
    tier,
    conversationId,
    group,
    search,
}: PreferenceConversationCursor & {
    group: PreferenceGroupKey;
    search: string | undefined;
}): string {
    const scope =
        group.kind === "project" ? `p${group.projectId.toString()}` : "n";
    return `preference-conversations:v1:${scope}:${preferenceSearchFingerprint(search)}:${tier}:${conversationId.toString()}`;
}

function parsePreferenceConversationCursor({
    cursor,
    group,
    search,
}: {
    cursor: string;
    group: PreferenceGroupKey;
    search: string | undefined;
}): PreferenceConversationCursor | undefined {
    const match = PREFERENCE_CONVERSATION_CURSOR_PATTERN.exec(cursor);
    const expectedScope =
        group.kind === "project" ? `p${group.projectId.toString()}` : "n";
    if (
        match?.[1] !== expectedScope ||
        match[2] !== preferenceSearchFingerprint(search)
    ) {
        return undefined;
    }
    const tier = match[3];
    const conversationId = Number(match[4]);
    if (
        (tier !== "explicit" && tier !== "undisclosed") ||
        !Number.isSafeInteger(conversationId)
    ) {
        return undefined;
    }
    return { tier, conversationId };
}

function buildPreferenceConversationScopeConditions({
    db,
    userId,
    now,
    scopeKind,
    search,
    focusConversationSlugId,
}: {
    db: PostgresJsDatabase;
    userId: string;
    now: Date;
    scopeKind: "project" | "no_project";
    search: string | undefined;
    focusConversationSlugId: string | undefined;
}) {
    const availableCondition =
        buildPreferenceConversationAvailabilityCondition({
            db,
            now,
            scopeKind,
            userId,
        });
    const explicitPreference = isNotNull(
        conversationEmailUpdateUserConversationPreferenceTable.enabled,
    );
    const undisclosedPreference = isNull(
        conversationEmailUpdateUserConversationPreferenceTable.enabled,
    );
    const normalizedSearch = search?.toLocaleLowerCase();
    const conversationMatchesSearch =
        normalizedSearch === undefined
            ? undefined
            : or(
                  gt(
                      sql<number>`strpos(lower(coalesce(${conversationContentTable.title}, ${conversationTable.slugId})), ${normalizedSearch})`,
                      0,
                  ),
                  gt(
                      sql<number>`strpos(lower(${conversationTable.slugId}), ${normalizedSearch})`,
                      0,
                  ),
              );
    const matchesSearch =
        normalizedSearch === undefined
            ? undefined
            : scopeKind === "project"
              ? or(
                    conversationMatchesSearch,
                    gt(
                        sql<number>`strpos(lower(${projectTable.title}), ${normalizedSearch})`,
                        0,
                    ),
                    gt(
                        sql<number>`strpos(lower(${projectTable.slug}), ${normalizedSearch})`,
                        0,
                    ),
                )
              : conversationMatchesSearch;
    return {
        availableCondition,
        baseCondition: and(
            scopeKind === "project"
                ? isNull(projectTable.autoProvisionedForOrganizationId)
                : isNotNull(projectTable.autoProvisionedForOrganizationId),
            or(
                explicitPreference,
                and(
                    availableCondition,
                    eq(conversationTable.isIndexed, true),
                ),
            ),
            focusConversationSlugId === undefined
                ? undefined
                : eq(conversationTable.slugId, focusConversationSlugId),
            matchesSearch,
        ),
        explicitPreference,
        undisclosedPreference,
    };
}

export async function queryPreferenceConversationPage({
    db,
    userId,
    now,
    group,
    search,
    focusConversationSlugId,
    cursor,
}: {
    db: PostgresJsDatabase;
    userId: string;
    now: Date;
    group: PreferenceGroupKey;
    search: string | undefined;
    focusConversationSlugId: string | undefined;
    cursor: string | undefined;
}): Promise<
    | {
          success: true;
          rows: {
              project_id: number;
              project_slug: string;
              project_title: string;
              scope_kind: "project" | "no_project";
              conversation_id: number;
              conversation_slug_id: string;
              conversation_title: string;
              conversation_enabled: boolean | undefined;
              project_enabled: boolean | undefined;
              available: boolean;
          }[];
          nextCursor: string | undefined;
      }
    | { success: false }
> {
    const parsedCursor =
        cursor === undefined
            ? undefined
            : parsePreferenceConversationCursor({ cursor, group, search });
    if (cursor !== undefined && parsedCursor === undefined) {
        return { success: false };
    }
    const scopeKind = group.kind === "project" ? "project" : "no_project";
    const {
        availableCondition,
        baseCondition: scopeCondition,
        explicitPreference,
        undisclosedPreference,
    } = buildPreferenceConversationScopeConditions({
        db,
        userId,
        now,
        scopeKind,
        search,
        focusConversationSlugId,
    });
    const cursorCondition =
        parsedCursor === undefined
            ? undefined
            : parsedCursor.tier === "explicit"
              ? or(
                    and(
                        explicitPreference,
                        gt(conversationTable.id, parsedCursor.conversationId),
                    ),
                    undisclosedPreference,
                )
              : and(
                    undisclosedPreference,
                    gt(conversationTable.id, parsedCursor.conversationId),
                );
    const baseCondition = and(
        scopeCondition,
        group.kind === "project"
            ? eq(projectTable.id, group.projectId)
            : undefined,
    );
    if (parsedCursor !== undefined) {
        const anchorRows = await db
            .select({ id: conversationTable.id })
            .from(conversationTable)
            .innerJoin(
                projectTable,
                eq(projectTable.id, conversationTable.projectId),
            )
            .leftJoin(
                conversationEmailUpdateUserConversationPreferenceTable,
                and(
                    eq(
                        conversationEmailUpdateUserConversationPreferenceTable.conversationId,
                        conversationTable.id,
                    ),
                    eq(
                        conversationEmailUpdateUserConversationPreferenceTable.userId,
                        userId,
                    ),
                ),
            )
            .leftJoin(
                conversationEmailUpdateUserProjectPreferenceTable,
                and(
                    eq(
                        conversationEmailUpdateUserProjectPreferenceTable.projectId,
                        projectTable.id,
                    ),
                    eq(
                        conversationEmailUpdateUserProjectPreferenceTable.userId,
                        userId,
                    ),
                ),
            )
            .leftJoin(
                conversationContentTable,
                eq(conversationContentTable.id, conversationTable.currentContentId),
            )
            .where(
                and(
                    baseCondition,
                    eq(conversationTable.id, parsedCursor.conversationId),
                    parsedCursor.tier === "explicit"
                        ? explicitPreference
                        : undisclosedPreference,
                ),
            )
            .limit(1);
        if (anchorRows.length === 0) {
            return { success: false };
        }
    }
    const rows = await db
        .select({
            project_id: projectTable.id,
            project_slug: projectTable.slug,
            project_title: projectTable.title,
            conversation_id: conversationTable.id,
            conversation_slug_id: conversationTable.slugId,
            conversation_title: conversationContentTable.title,
            conversation_enabled:
                conversationEmailUpdateUserConversationPreferenceTable.enabled,
            project_enabled:
                conversationEmailUpdateUserProjectPreferenceTable.enabled,
            available: sql<boolean>`${availableCondition}`,
            tier: sql<
                "explicit" | "undisclosed"
            >`CASE WHEN ${conversationEmailUpdateUserConversationPreferenceTable.enabled} IS NULL THEN 'undisclosed' ELSE 'explicit' END`,
        })
        .from(conversationTable)
        .innerJoin(
            projectTable,
            eq(projectTable.id, conversationTable.projectId),
        )
        .leftJoin(
            conversationEmailUpdateUserConversationPreferenceTable,
            and(
                eq(
                    conversationEmailUpdateUserConversationPreferenceTable.conversationId,
                    conversationTable.id,
                ),
                eq(
                    conversationEmailUpdateUserConversationPreferenceTable.userId,
                    userId,
                ),
            ),
        )
        .leftJoin(
            conversationEmailUpdateUserProjectPreferenceTable,
            and(
                eq(
                    conversationEmailUpdateUserProjectPreferenceTable.projectId,
                    projectTable.id,
                ),
                eq(
                    conversationEmailUpdateUserProjectPreferenceTable.userId,
                    userId,
                ),
            ),
        )
        .leftJoin(
            conversationContentTable,
            eq(conversationContentTable.id, conversationTable.currentContentId),
        )
        .where(and(baseCondition, cursorCondition))
        .orderBy(
            sql`CASE WHEN ${conversationEmailUpdateUserConversationPreferenceTable.enabled} IS NULL THEN 1 ELSE 0 END`,
            conversationTable.id,
        )
        .limit(PREFERENCE_CONVERSATION_PAGE_SIZE + 1);
    const pageRows = rows.slice(0, PREFERENCE_CONVERSATION_PAGE_SIZE);
    const lastRow = pageRows.at(-1);
    return {
        success: true,
        rows: pageRows.map((row) => ({
            project_id: row.project_id,
            project_slug: row.project_slug,
            project_title: row.project_title,
            scope_kind: scopeKind,
            conversation_id: row.conversation_id,
            conversation_slug_id: row.conversation_slug_id,
            conversation_title:
                row.conversation_title ?? row.conversation_slug_id,
            conversation_enabled: row.conversation_enabled ?? undefined,
            project_enabled: row.project_enabled ?? undefined,
            available: row.available,
        })),
        nextCursor:
            rows.length > PREFERENCE_CONVERSATION_PAGE_SIZE &&
            lastRow !== undefined
                ? encodePreferenceConversationCursor({
                      tier: lastRow.tier,
                      conversationId: lastRow.conversation_id,
                      group,
                      search,
                  })
                : undefined,
    };
}

export async function queryInitialPreferenceConversationPages({
    db,
    userId,
    now,
    groupKeys,
    search,
    focusConversationSlugId,
}: {
    db: PostgresJsDatabase;
    userId: string;
    now: Date;
    groupKeys: readonly PreferenceGroupKey[];
    search: string | undefined;
    focusConversationSlugId: string | undefined;
}): Promise<{
    rows: PreferenceConversationDao[];
    nextCursorByGroup: ReadonlyMap<string, string>;
}> {
    if (groupKeys.length === 0) {
        return { rows: [], nextCursorByGroup: new Map() };
    }
    const projectIds = groupKeys.flatMap((group) =>
        group.kind === "project" ? [group.projectId] : [],
    );
    const includeNoProject = groupKeys.some(
        (group) => group.kind === "no_project",
    );
    const projectScope = buildPreferenceConversationScopeConditions({
        db,
        userId,
        now,
        scopeKind: "project",
        search,
        focusConversationSlugId,
    });
    const noProjectScope = buildPreferenceConversationScopeConditions({
        db,
        userId,
        now,
        scopeKind: "no_project",
        search,
        focusConversationSlugId,
    });
    const candidateCondition = or(
        projectIds.length === 0
            ? undefined
            : and(
                  projectScope.baseCondition,
                  inArray(projectTable.id, projectIds),
              ),
        includeNoProject ? noProjectScope.baseCondition : undefined,
    );
    if (candidateCondition === undefined) {
        return { rows: [], nextCursorByGroup: new Map() };
    }
    const groupPartition = sql<number>`CASE
        WHEN ${projectTable.autoProvisionedForOrganizationId} IS NULL
            THEN ${projectTable.id}
        ELSE 0
    END`;
    const explicitFirst = sql<number>`CASE
        WHEN ${conversationEmailUpdateUserConversationPreferenceTable.enabled} IS NULL
            THEN 1
        ELSE 0
    END`;
    const rankedConversations = db
        .select({
            project_id: sql<number>`${projectTable.id}`.as("project_id"),
            project_slug: sql<string>`${projectTable.slug}`.as("project_slug"),
            project_title: sql<string>`${projectTable.title}`.as(
                "project_title",
            ),
            auto_provisioned_for_organization_id:
                sql<number | null>`${projectTable.autoProvisionedForOrganizationId}`.as(
                    "auto_provisioned_for_organization_id",
                ),
            conversation_id: sql<number>`${conversationTable.id}`.as(
                "conversation_id",
            ),
            conversation_slug_id: sql<string>`${conversationTable.slugId}`.as(
                "conversation_slug_id",
            ),
            conversation_title:
                sql<string | null>`${conversationContentTable.title}`.as(
                    "conversation_title",
                ),
            conversation_enabled:
                sql<boolean | null>`${conversationEmailUpdateUserConversationPreferenceTable.enabled}`.as(
                    "conversation_enabled",
                ),
            project_enabled:
                sql<boolean | null>`${conversationEmailUpdateUserProjectPreferenceTable.enabled}`.as(
                    "project_enabled",
                ),
            available: sql<boolean>`CASE
                WHEN ${projectTable.autoProvisionedForOrganizationId} IS NULL
                    THEN ${projectScope.availableCondition}
                ELSE ${noProjectScope.availableCondition}
            END`.as("available"),
            group_partition: groupPartition.as("group_partition"),
            preference_row_number: sql<number>`CAST(
                row_number() OVER (
                    PARTITION BY ${groupPartition}
                    ORDER BY ${explicitFirst}, ${conversationTable.id}
                ) AS integer
            )`.as("preference_row_number"),
        })
        .from(conversationTable)
        .innerJoin(
            projectTable,
            eq(projectTable.id, conversationTable.projectId),
        )
        .leftJoin(
            conversationEmailUpdateUserConversationPreferenceTable,
            and(
                eq(
                    conversationEmailUpdateUserConversationPreferenceTable.conversationId,
                    conversationTable.id,
                ),
                eq(
                    conversationEmailUpdateUserConversationPreferenceTable.userId,
                    userId,
                ),
            ),
        )
        .leftJoin(
            conversationEmailUpdateUserProjectPreferenceTable,
            and(
                eq(
                    conversationEmailUpdateUserProjectPreferenceTable.projectId,
                    projectTable.id,
                ),
                eq(
                    conversationEmailUpdateUserProjectPreferenceTable.userId,
                    userId,
                ),
            ),
        )
        .leftJoin(
            conversationContentTable,
            eq(conversationContentTable.id, conversationTable.currentContentId),
        )
        .where(candidateCondition)
        .as("ranked_preference_conversations");
    const candidateRows = await db
        .select()
        .from(rankedConversations)
        .where(
            lte(
                rankedConversations.preference_row_number,
                PREFERENCE_CONVERSATION_PAGE_SIZE + 1,
            ),
        )
        .orderBy(
            rankedConversations.group_partition,
            rankedConversations.preference_row_number,
        );
    const candidatesByPartition = new Map<
        number,
        typeof candidateRows
    >();
    for (const row of candidateRows) {
        const candidates = candidatesByPartition.get(row.group_partition) ?? [];
        candidates.push(row);
        candidatesByPartition.set(row.group_partition, candidates);
    }
    const rows: PreferenceConversationDao[] = [];
    const nextCursorByGroup = new Map<string, string>();
    for (const group of groupKeys) {
        const partition = group.kind === "project" ? group.projectId : 0;
        const candidates = candidatesByPartition.get(partition) ?? [];
        const pageRows = candidates.slice(0, PREFERENCE_CONVERSATION_PAGE_SIZE);
        rows.push(
            ...pageRows.map((row) => ({
                project_id: row.project_id,
                project_slug: row.project_slug,
                project_title: row.project_title,
                scope_kind: group.kind,
                conversation_id: row.conversation_id,
                conversation_slug_id: row.conversation_slug_id,
                conversation_title:
                    row.conversation_title ?? row.conversation_slug_id,
                conversation_enabled: row.conversation_enabled ?? undefined,
                project_enabled: row.project_enabled ?? undefined,
                available: row.available,
            })),
        );
        const lastRow = pageRows.at(-1);
        if (
            candidates.length > PREFERENCE_CONVERSATION_PAGE_SIZE &&
            lastRow !== undefined
        ) {
            nextCursorByGroup.set(
                preferenceGroupKey(group),
                encodePreferenceConversationCursor({
                    tier:
                        lastRow.conversation_enabled === null
                            ? "undisclosed"
                            : "explicit",
                    conversationId: lastRow.conversation_id,
                    group,
                    search,
                }),
            );
        }
    }
    return { rows, nextCursorByGroup };
}

interface PreferenceAvatarSource {
    organizationId: number | null;
    organizationDisplayName: string | null;
    organizationImagePath: string | null;
    organizationIsFullImagePath: boolean | null;
    organizationDeletedAt: Date | null;
    username: string | null;
    externalOrganizationId: number | null;
    externalDisplayName: string | null;
    externalImagePath: string | null;
    externalIsFullImagePath: boolean | null;
    externalDeletedAt: Date | null;
}

export function resolvePreferenceAvatar({
    source,
    baseImageServiceUrl,
}: {
    source: PreferenceAvatarSource;
    baseImageServiceUrl: string;
}): ConversationEmailUpdatePreferenceAvatar | undefined {
    if (
        source.organizationId !== null &&
        source.organizationDisplayName !== null &&
        source.organizationDeletedAt === null
    ) {
        const imageUrl = imagePathToUrl({
            imagePath: source.organizationImagePath,
            isFullImagePath: source.organizationIsFullImagePath ?? false,
            baseImageServiceUrl,
        });
        return {
            kind: source.username === null ? "organization" : "user",
            displayName: source.username ?? source.organizationDisplayName,
            ...(imageUrl === undefined ? {} : { imageUrl }),
        };
    }
    if (
        source.externalOrganizationId !== null &&
        source.externalDisplayName !== null &&
        source.externalDeletedAt === null
    ) {
        const imageUrl = imagePathToUrl({
            imagePath: source.externalImagePath,
            isFullImagePath: source.externalIsFullImagePath ?? false,
            baseImageServiceUrl,
        });
        return {
            kind: "organization",
            displayName: source.externalDisplayName,
            ...(imageUrl === undefined ? {} : { imageUrl }),
        };
    }
    return undefined;
}

async function loadPreferenceOwnerByProjectId({
    db,
    projectIds,
    noProjectProjectIds,
    baseImageServiceUrl,
}: {
    db: PostgresJsDatabase;
    projectIds: readonly number[];
    noProjectProjectIds: ReadonlySet<number>;
    baseImageServiceUrl: string;
}): Promise<ReadonlyMap<number, ConversationEmailUpdatePreferenceAvatar>> {
    const uniqueProjectIds = [...new Set(projectIds)];
    if (uniqueProjectIds.length === 0) {
        return new Map();
    }
    const [attributionRows, ownershipRows] = await Promise.all([
        db
            .select({
                projectId: projectOrganizationAttributionTable.projectId,
                organizationId: organizationTable.id,
                organizationDisplayName: organizationTable.displayName,
                organizationImagePath: organizationTable.imagePath,
                organizationIsFullImagePath: organizationTable.isFullImagePath,
                organizationDeletedAt: organizationTable.deletedAt,
                username: userTable.username,
                externalOrganizationId: projectExternalOrganizationTable.id,
                externalDisplayName:
                    projectExternalOrganizationTable.displayName,
                externalImagePath: projectExternalOrganizationTable.imagePath,
                externalIsFullImagePath:
                    projectExternalOrganizationTable.isFullImagePath,
                externalDeletedAt: projectExternalOrganizationTable.deletedAt,
            })
            .from(projectOrganizationAttributionTable)
            .leftJoin(
                organizationTable,
                eq(
                    organizationTable.id,
                    projectOrganizationAttributionTable.organizationId,
                ),
            )
            .leftJoin(
                userTable,
                eq(userTable.id, organizationTable.autoProvisionedForUserId),
            )
            .leftJoin(
                projectExternalOrganizationTable,
                eq(
                    projectExternalOrganizationTable.id,
                    projectOrganizationAttributionTable.externalOrganizationId,
                ),
            )
            .where(
                and(
                    inArray(
                        projectOrganizationAttributionTable.projectId,
                        uniqueProjectIds,
                    ),
                    eq(
                        projectOrganizationAttributionTable.role,
                        "project_owner",
                    ),
                    isNull(projectOrganizationAttributionTable.deletedAt),
                ),
            )
            .orderBy(
                projectOrganizationAttributionTable.projectId,
                projectOrganizationAttributionTable.sortOrder,
                projectOrganizationAttributionTable.id,
            ),
        db
            .select({
                projectId: projectOrganizationOwnershipTable.projectId,
                organizationId: organizationTable.id,
                organizationDisplayName: organizationTable.displayName,
                organizationImagePath: organizationTable.imagePath,
                organizationIsFullImagePath: organizationTable.isFullImagePath,
                organizationDeletedAt: organizationTable.deletedAt,
                username: userTable.username,
                externalOrganizationId: sql<null>`NULL`,
                externalDisplayName: sql<null>`NULL`,
                externalImagePath: sql<null>`NULL`,
                externalIsFullImagePath: sql<null>`NULL`,
                externalDeletedAt: sql<null>`NULL`,
            })
            .from(projectOrganizationOwnershipTable)
            .innerJoin(
                organizationTable,
                eq(
                    organizationTable.id,
                    projectOrganizationOwnershipTable.organizationId,
                ),
            )
            .leftJoin(
                userTable,
                eq(userTable.id, organizationTable.autoProvisionedForUserId),
            )
            .where(
                and(
                    inArray(
                        projectOrganizationOwnershipTable.projectId,
                        uniqueProjectIds,
                    ),
                    isNull(projectOrganizationOwnershipTable.deletedAt),
                ),
            )
            .orderBy(
                projectOrganizationOwnershipTable.projectId,
                projectOrganizationOwnershipTable.organizationId,
            ),
    ]);
    const ownerByProjectId = new Map<
        number,
        ConversationEmailUpdatePreferenceAvatar
    >();
    for (const row of attributionRows) {
        if (
            noProjectProjectIds.has(row.projectId) ||
            ownerByProjectId.has(row.projectId)
        ) {
            continue;
        }
        const owner = resolvePreferenceAvatar({
            source: row,
            baseImageServiceUrl,
        });
        if (owner !== undefined) {
            ownerByProjectId.set(row.projectId, owner);
        }
    }
    for (const row of ownershipRows) {
        if (ownerByProjectId.has(row.projectId)) continue;
        const owner = resolvePreferenceAvatar({
            source: row,
            baseImageServiceUrl,
        });
        if (owner !== undefined) {
            ownerByProjectId.set(row.projectId, owner);
        }
    }
    return ownerByProjectId;
}

async function loadPreferenceRows({
    db,
    userId,
    now,
    baseImageServiceUrl,
    groupKeys,
    search,
    focus,
}: {
    db: PostgresJsDatabase;
    userId: string;
    now: Date;
    baseImageServiceUrl: string;
    groupKeys: readonly PreferenceGroupKey[];
    search: string | undefined;
    focus: ConversationEmailUpdatePreferenceFocus | undefined;
}): Promise<{
    globalPaused: boolean;
    projectRows: PreferenceProjectDao[];
    conversationRows: PreferenceConversationDao[];
    ownerByProjectId: ReadonlyMap<
        number,
        ConversationEmailUpdatePreferenceAvatar
    >;
    conversationNextCursorByGroup: ReadonlyMap<string, string>;
}> {
    const projectIds = groupKeys.flatMap((group) =>
        group.kind === "project" ? [group.projectId] : [],
    );
    const [globalRows, projectRows, conversationPages] =
        await Promise.all([
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
            queryPreferenceProjects({ db, userId, now, projectIds }),
            queryInitialPreferenceConversationPages({
                db,
                userId,
                now,
                groupKeys,
                search,
                focusConversationSlugId:
                    focus?.kind === "conversation"
                        ? focus.conversationSlugId
                        : undefined,
            }),
        ]);
    const conversationRows = conversationPages.rows;
    const ownerByProjectId = await loadPreferenceOwnerByProjectId({
        db,
        projectIds: [
            ...projectRows.map((row) => row.project_id),
            ...conversationRows.map((row) => row.project_id),
        ],
        noProjectProjectIds: new Set(
            conversationRows.flatMap((row) =>
                row.scope_kind === "no_project" ? [row.project_id] : [],
            ),
        ),
        baseImageServiceUrl,
    });
    return {
        globalPaused:
            globalRows.at(0)?.pausedAt !== null && globalRows.length > 0,
        projectRows,
        conversationRows,
        ownerByProjectId,
        conversationNextCursorByGroup: conversationPages.nextCursorByGroup,
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
    lockAuthorization = false,
}: {
    db: PostgresJsDatabase;
    userId: string;
    projectId: number;
    now: Date;
    lockAuthorization?: boolean;
}): Promise<boolean> {
    const query = db
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
    const rows = lockAuthorization
        ? await query.for("update", {
              of: [
                  projectOrganizationOwnershipTable,
                  organizationTable,
                  organizationMembershipTable,
                  userTable,
                  organizationMembershipAllProjectCapabilityTable,
                  premiumFeatureEntitlementTable,
              ],
          })
        : await query;
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
        .returning({
            userId: conversationEmailUpdateUserGlobalSettingTable.userId,
        });
    return resumedRows.length > 0;
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

export type ConversationEmailUpdateOverrideUpdateResult =
    | { success: true }
    | {
          success: false;
          reason:
              | "target_not_found"
              | "feature_not_available"
              | "missing_participant_contact_email"
              | "active_delivery_conflict";
      };

export async function updateConversationEmailUpdateOverrideInTransaction({
    db,
    userId,
    conversationSlugId,
    enabledOverride,
    now,
}: {
    db: PostgresJsDatabase;
    userId: string;
    conversationSlugId: string;
    enabledOverride: boolean | null;
    now: Date;
}): Promise<ConversationEmailUpdateOverrideUpdateResult> {
    const initialRow = await getConversationConfigurationRow({
        db,
        conversationSlugId,
        now,
    });
    if (
        initialRow === undefined ||
        !(await lockConversationEmailUpdateProject({
            db,
            projectId: initialRow.project_id,
        }))
    ) {
        return { success: false, reason: "target_not_found" };
    }
    const row = await getConversationConfigurationRow({
        db,
        conversationSlugId,
        now,
    });
    if (row?.project_id !== initialRow.project_id) {
        return { success: false, reason: "target_not_found" };
    }
    const allowed = await hasConversationEmailUpdateCapability({
        db,
        userId,
        projectId: row.project_id,
        now,
        lockAuthorization: true,
    });
    if (!row.feature_available || !allowed) {
        return { success: false, reason: "feature_not_available" };
    }
    if (
        isConversationEmailUpdateConfigured({
            projectDefaultEnabled: row.default_enabled,
            conversationOverrideEnabled: enabledOverride,
        }) &&
        normalizeContactEmail(row.contact_email) === undefined
    ) {
        return {
            success: false,
            reason: "missing_participant_contact_email",
        };
    }
    if (await hasActiveDelivery({ db, projectId: row.project_id })) {
        return { success: false, reason: "active_delivery_conflict" };
    }
    await db
        .update(conversationTable)
        .set({
            conversationEmailUpdateEnabledOverride: enabledOverride,
            conversationEmailUpdateOverrideUpdatedAt: now,
            conversationEmailUpdateOverrideUpdatedByUserId: userId,
        })
        .where(eq(conversationTable.id, row.conversation_id));
    return { success: true };
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
    baseImageServiceUrl,
}: {
    db: PostgresJsDatabase;
    sendingEnabled: boolean;
    baseImageServiceUrl: string;
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
            const workspaceContext =
                resolveConversationEmailUpdateWorkspaceContext({
                    rows: allRows,
                    context: request.context,
                });
            if (workspaceContext === undefined) {
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
            const rows = allRows;
            const { initialSelection } = workspaceContext;
            const estimates = await listWorkspaceAudienceEstimates({
                db,
                rows,
                cutoffAt: now,
            });
            const scopes = groupScopes({
                rows,
                estimates,
                operationalSendingEnabled: sendingEnabled,
            });
            if (
                !isConversationEmailUpdateWorkspaceContextRepresented({
                    scopes,
                    context: request.context,
                })
            ) {
                return { success: false, reason: "feature_not_available" };
            }
            return Dto.conversationEmailUpdateWorkspaceResponse.parse({
                success: true,
                resolvedContext: request.context,
                initialSelection,
                testDestinationEmail: testDestination?.email,
                scopes,
            });
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
                            !(await lockConversationEmailUpdateProject({
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
            const preferenceDb = getPrimaryDatabase(db);
            if (
                (await getPrimaryEmail({ db: preferenceDb, userId })) ===
                undefined
            ) {
                return {
                    success: false,
                    reason: "verified_email_required",
                };
            }
            const now = new Date();
            const page = await queryPreferenceGroupPage({
                db: preferenceDb,
                userId,
                request,
                now,
            });
            if (!page.success) {
                return {
                    success: false,
                    reason: "preferences_unavailable",
                };
            }
            const rows = await loadPreferenceRows({
                db: preferenceDb,
                userId,
                now,
                baseImageServiceUrl,
                groupKeys: page.groupKeys,
                search: request.mode === "browse" ? request.search : undefined,
                focus: request.mode === "focus" ? request.focus : undefined,
            });
            return Dto.conversationEmailUpdatePreferencesResponse.parse({
                success: true,
                globalPaused: rows.globalPaused,
                groups: buildConversationEmailPreferenceGroups(rows),
                nextCursor: page.nextCursor,
            });
        },

        getPreferenceConversations: async ({ userId, request }) => {
            const preferenceDb = getPrimaryDatabase(db);
            if (
                (await getPrimaryEmail({ db: preferenceDb, userId })) ===
                undefined
            ) {
                return {
                    success: false,
                    reason: "verified_email_required",
                };
            }
            if (!PREFERENCE_CONVERSATION_CURSOR_PATTERN.test(request.cursor)) {
                return {
                    success: false,
                    reason: "preferences_unavailable",
                };
            }
            const group: PreferenceGroupKey | undefined =
                request.scope.kind === "no_project"
                    ? { kind: "no_project" }
                    : await resolvePreferenceProjectGroupKey({
                          db: preferenceDb,
                          projectSlug: request.scope.projectSlug,
                      });
            if (group === undefined) {
                return {
                    success: false,
                    reason: "preferences_unavailable",
                };
            }
            const now = new Date();
            const page = await queryPreferenceConversationPage({
                db: preferenceDb,
                userId,
                now,
                group,
                search: request.search,
                focusConversationSlugId: undefined,
                cursor: request.cursor,
            });
            if (!page.success) {
                return {
                    success: false,
                    reason: "preferences_unavailable",
                };
            }
            const projectIds = [
                ...new Set(page.rows.map((row) => row.project_id)),
            ];
            const [globalRows, projectRows, ownerByProjectId] = await Promise.all(
                [
                    preferenceDb
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
                    queryPreferenceProjects({
                        db: preferenceDb,
                        userId,
                        now,
                        projectIds: group.kind === "project" ? projectIds : [],
                    }),
                    group.kind === "no_project"
                        ? loadPreferenceOwnerByProjectId({
                              db: preferenceDb,
                              projectIds,
                              noProjectProjectIds: new Set(projectIds),
                              baseImageServiceUrl,
                          })
                        : Promise.resolve(new Map()),
                ],
            );
            const groups = buildConversationEmailPreferenceGroups({
                globalPaused:
                    globalRows.at(0)?.pausedAt !== null &&
                    globalRows.length > 0,
                projectRows,
                conversationRows: page.rows,
                ownerByProjectId,
                conversationNextCursorByGroup: new Map(),
            });
            return Dto.conversationEmailUpdatePreferenceConversationsResponse.parse(
                {
                    success: true,
                    conversations: groups.flatMap(
                        (preferenceGroup) => preferenceGroup.conversations,
                    ),
                    nextCursor: page.nextCursor,
                },
            );
        },

        updatePreference: async ({ userId, request }) => {
            return await getPrimaryDatabase(db).transaction(async (tx) => {
                const now = new Date();
                if (request.operation === "set_global_pause") {
                    await lockUser({ db: tx, userId });
                    if (
                        (await getPrimaryEmail({ db: tx, userId })) ===
                        undefined
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
                                state: request.enabled ? "enabled" : "disabled",
                                globalResumed,
                            },
                        };
                    }
                    if (
                        (await getPrimaryEmail({ db: tx, userId })) ===
                        undefined
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
                                      safetyBlocked:
                                          sourceConfig.safety_blocked,
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
                        if (
                            !config.feature_available ||
                            config.safety_blocked
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
                    !(await lockConversationEmailUpdateProject({
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
                    preferenceState.conversationEnabled === request.enabled
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
                                config.override_enabled ??
                                config.default_enabled,
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
                await tx
                    .insert(
                        conversationEmailUpdateUserConversationPreferenceTable,
                    )
                    .values({
                        userId,
                        conversationId: config.conversation_id,
                        enabled: request.enabled,
                        choiceAt: now,
                        choiceSource: request.source,
                    })
                    .onConflictDoUpdate({
                        target: [
                            conversationEmailUpdateUserConversationPreferenceTable.userId,
                            conversationEmailUpdateUserConversationPreferenceTable.conversationId,
                        ],
                        set: {
                            enabled: request.enabled,
                            choiceAt: now,
                            choiceSource: request.source,
                        },
                    });
                const state = request.enabled ? "enabled" : "disabled";
                return {
                    success: true,
                    result: {
                        operation: request.operation,
                        projectPreference: undefined,
                        globalResumed,
                        conversationPreferences: [
                            {
                                conversationSlugId: request.conversationSlugId,
                                state,
                                resolvedEnabled:
                                    resolveConversationEmailPreference({
                                        globalPaused:
                                            preferenceState.globalPaused &&
                                            !globalResumed,
                                        projectEnabled:
                                            preferenceState.projectEnabled,
                                        conversationEnabled: request.enabled,
                                        scopeKind:
                                            preferenceScope === "project"
                                                ? "project"
                                                : "no_project",
                                    }),
                            },
                        ],
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
                        !(await lockConversationEmailUpdateProject({
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
                        lockAuthorization: true,
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
                    const result =
                        await updateConversationEmailUpdateOverrideInTransaction(
                            {
                                db: tx,
                                userId,
                                conversationSlugId:
                                    request.conversationSlugId,
                                enabledOverride:
                                    request.setting === "inherit"
                                        ? null
                                        : request.setting === "enabled",
                                now,
                            },
                        );
                    if (!result.success) {
                        return result;
                    }
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
            const hasHistory = await hasVisibleHistory({
                db,
                userId,
                context: {
                    kind: "conversation",
                    conversationSlugId: request.conversationSlugId,
                },
            });
            if (!row.feature_available && !hasHistory) {
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
                resolveConversationEmailPreferenceChoice({
                    projectEnabled: preferenceState.projectEnabled,
                    conversationEnabled: preferenceState.conversationEnabled,
                    scopeKind:
                        preferenceScope === "project"
                            ? "project"
                            : "no_project",
                });
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
                    hasConfiguredConversation:
                        isConversationEmailUpdateConfigured({
                            projectDefaultEnabled: row.default_enabled,
                            conversationOverrideEnabled: row.override_enabled,
                        }),
                    hasHistory,
                }),
                participantPreference:
                    !shouldExposeConversationEmailUpdateParticipantPreference({
                        featureAvailable: row.feature_available,
                        hasPrimaryEmail: primaryEmail !== undefined,
                        preferenceScope,
                        safetyBlocked: row.safety_blocked,
                    })
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
            const hasConfiguredConversation = accessRows.some((row) =>
                isConversationEmailUpdateConfigured({
                    projectDefaultEnabled: row.project_default_enabled,
                    conversationOverrideEnabled: row.conversation_override,
                }),
            );
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
                    hasConfiguredConversation,
                    hasHistory,
                }),
                participantPreference:
                    !shouldExposeConversationEmailUpdateParticipantPreference({
                        featureAvailable: configuration.feature_available,
                        hasPrimaryEmail: primaryEmail !== undefined,
                        preferenceScope: hasConfiguredConversation
                            ? "project"
                            : undefined,
                        safetyBlocked: configuration.safety_blocked,
                    })
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
