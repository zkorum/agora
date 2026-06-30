import { httpErrors } from "@fastify/sensible";
import {
    and,
    count,
    desc,
    eq,
    inArray,
    isNotNull,
    isNull,
    lt,
    or,
    sql,
    type SQL,
} from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    conversationContentTable,
    conversationContentTranslationTable,
    conversationTable,
    conversationViewSnapshotTable,
    organizationLocalizationTable,
    organizationTable,
    projectContactTable,
    projectContentBannerLocalizationTable,
    projectContentTable,
    projectContentTranslationTable,
    projectExternalOrganizationLocalizationTable,
    projectExternalOrganizationTable,
    projectOrganizationAttributionTable,
    projectParticipantDisplayLanguageTable,
    projectTable,
    projectTranslationTargetLanguageTable,
    userDisplayLanguageTable,
} from "@/shared-backend/schema.js";
import {
    getDisplayLanguageFallbackChain,
    SupportedSpokenLanguageMetadataList,
    type SupportedDisplayLanguageCodes,
    type SupportedSpokenLanguageCodes,
} from "@/shared/languages.js";
import type {
    FetchProjectPageActivitiesRequest,
    FetchProjectPageActivitiesResponse,
    FetchProjectPageRequest,
    FetchProjectPageResponse,
    ProjectPageActivity,
    ProjectPageActivityCursor,
    ProjectPageAttribution,
    ProjectPageContact,
    ProjectPageLanguageOption,
    ProjectPageProject,
    UpdateProjectPageDisplayLanguageResponse,
} from "@/shared/types/dto.js";
import { imagePathToUrl } from "@/utils/organizationLogic.js";
import {
    getImplicitDefaultDisplayLanguage,
    resolveEffectiveProjectDisplayLanguage,
    resolveOrganizationLocalizationRow,
    type OrganizationLocalizationRow,
} from "./projectLanguage.js";
import { sourceLanguageToDisplayLanguage } from "./translationLanguageSetting.js";

interface ProjectPageServiceParams {
    db: PostgresJsDatabase;
    baseImageServiceUrl: string;
}

interface AuthenticatedProjectPageParams extends ProjectPageServiceParams {
    userId: string | undefined;
}

interface ProjectBaseRow {
    projectId: number;
    projectContentId: number;
    projectSlug: string;
    projectTitle: string;
    subtitle: string | null;
    bodyPlainText: string | null;
    bannerPath: string | null;
    bannerIsFullPath: boolean;
    sourceLanguageCode: SupportedSpokenLanguageCodes | null;
}

interface ConversationDisplayCounts {
    conversationId: number;
    opinionCount: number;
    participantCount: number;
    voteCount: number;
}

type ProjectActivityStatus = ProjectPageActivityCursor["status"];

interface ProjectActivityRow {
    conversationId: number;
    slug: string;
    isClosed: boolean;
    createdAt: Date;
    conversationType: "polis" | "maxdiff";
    title: string;
    bodyPlainText: string | null;
    status: ProjectActivityStatus;
}

function optionalText(value: string | null): string | undefined {
    const trimmed = value?.trim();
    return trimmed === undefined || trimmed === "" ? undefined : trimmed;
}

function optionalUrl(value: string | null): string | undefined {
    return value ?? undefined;
}

function getInitials(displayName: string): string {
    const initials = displayName
        .split(/\s+/u)
        .filter((part) => part !== "")
        .map((part) => part[0])
        .join("")
        .slice(0, 3)
        .toUpperCase();
    return initials === "" ? displayName.slice(0, 1).toUpperCase() : initials;
}

function getAttributionAccentColor({
    role,
}: {
    role: ProjectPageAttribution["role"];
}): string {
    switch (role) {
        case "project_owner":
            return "#5b5ce2";
        case "sponsor":
            return "#177a41";
        case "partner":
            return "#d8639a";
    }
}

function toImageUrl({
    imagePath,
    isFullImagePath,
    baseImageServiceUrl,
}: {
    imagePath: string | null;
    isFullImagePath: boolean;
    baseImageServiceUrl: string;
}): string | undefined {
    return imagePathToUrl({ imagePath, isFullImagePath, baseImageServiceUrl });
}

function languageOptionFor({
    languageCode,
}: {
    languageCode: SupportedDisplayLanguageCodes;
}): ProjectPageLanguageOption {
    const metadata = SupportedSpokenLanguageMetadataList.find(
        (language) => language.code === languageCode,
    );
    return {
        label: metadata?.name ?? languageCode,
        value: languageCode,
        searchText: [metadata?.name, metadata?.englishName, languageCode]
            .filter((value): value is string => value !== undefined)
            .join(" "),
        shortLabel: languageCode.toUpperCase(),
    };
}

function getProjectDefaultDisplayLanguage({
    sourceLanguageCode,
}: {
    sourceLanguageCode: SupportedSpokenLanguageCodes | null;
}): SupportedDisplayLanguageCodes {
    return (
        sourceLanguageToDisplayLanguage({ sourceLanguageCode }) ??
        getImplicitDefaultDisplayLanguage()
    );
}

function getLanguageCandidateSet({
    effectiveLanguageCode,
    defaultLanguageCode,
}: {
    effectiveLanguageCode: SupportedDisplayLanguageCodes;
    defaultLanguageCode: SupportedDisplayLanguageCodes;
}): Set<SupportedDisplayLanguageCodes> {
    return new Set([
        ...getDisplayLanguageFallbackChain({ languageCode: effectiveLanguageCode }),
        defaultLanguageCode,
    ]);
}

async function fetchProjectBaseBySlug({
    db,
    projectSlug,
}: {
    db: PostgresJsDatabase;
    projectSlug: string;
}): Promise<ProjectBaseRow> {
    const rows = await db
        .select({
            projectId: projectTable.id,
            projectContentId: projectContentTable.id,
            projectSlug: projectTable.slug,
            projectTitle: projectTable.title,
            subtitle: projectContentTable.subtitle,
            bodyPlainText: projectContentTable.bodyPlainText,
            bannerPath: projectContentTable.bannerPath,
            bannerIsFullPath: projectContentTable.bannerIsFullPath,
            sourceLanguageCode: projectContentTable.sourceLanguageCode,
        })
        .from(projectTable)
        .innerJoin(
            projectContentTable,
            eq(projectContentTable.id, projectTable.currentContentId),
        )
        .where(
            and(
                eq(projectTable.slug, projectSlug),
                eq(projectTable.directoryVisibility, "listed"),
                isNull(projectTable.deletedAt),
                isNull(projectContentTable.deletedAt),
            ),
        )
        .limit(1);

    const project = rows.at(0);
    if (project === undefined) {
        throw httpErrors.notFound("Project not found");
    }
    return project;
}

async function fetchProjectTargetLanguages({
    db,
    projectId,
}: {
    db: PostgresJsDatabase;
    projectId: number;
}): Promise<SupportedDisplayLanguageCodes[]> {
    const rows = await db
        .select({ languageCode: projectTranslationTargetLanguageTable.languageCode })
        .from(projectTranslationTargetLanguageTable)
        .where(
            and(
                eq(projectTranslationTargetLanguageTable.projectId, projectId),
                isNull(projectTranslationTargetLanguageTable.deletedAt),
            ),
        );
    return rows.map((row) => row.languageCode);
}

async function fetchStoredProjectDisplayLanguage({
    db,
    projectId,
    userId,
}: {
    db: PostgresJsDatabase;
    projectId: number;
    userId: string | undefined;
}): Promise<SupportedDisplayLanguageCodes | undefined> {
    if (userId === undefined) {
        return undefined;
    }
    const rows = await db
        .select({ languageCode: projectParticipantDisplayLanguageTable.languageCode })
        .from(projectParticipantDisplayLanguageTable)
        .where(
            and(
                eq(projectParticipantDisplayLanguageTable.projectId, projectId),
                eq(projectParticipantDisplayLanguageTable.userId, userId),
            ),
        )
        .limit(1);
    return rows.at(0)?.languageCode;
}

async function fetchStoredUserDisplayLanguage({
    db,
    userId,
}: {
    db: PostgresJsDatabase;
    userId: string | undefined;
}): Promise<SupportedDisplayLanguageCodes | undefined> {
    if (userId === undefined) {
        return undefined;
    }
    const rows = await db
        .select({ languageCode: userDisplayLanguageTable.languageCode })
        .from(userDisplayLanguageTable)
        .where(eq(userDisplayLanguageTable.userId, userId))
        .limit(1);
    return rows.at(0)?.languageCode;
}

async function fetchResolvedProjectContent({
    db,
    project,
    languageCandidateSet,
    effectiveLanguageCode,
}: {
    db: PostgresJsDatabase;
    project: ProjectBaseRow;
    languageCandidateSet: Set<SupportedDisplayLanguageCodes>;
    effectiveLanguageCode: SupportedDisplayLanguageCodes;
}): Promise<{
    title: string;
    subtitle: string | undefined;
    bodyPlainText: string | undefined;
}> {
    const languageCandidates = Array.from(languageCandidateSet);
    const translationRows = await db
        .select({
            languageCode: projectContentTranslationTable.displayLanguageCode,
            title: projectContentTranslationTable.translatedTitle,
            subtitle: projectContentTranslationTable.translatedSubtitle,
            body: projectContentTranslationTable.translatedBody,
        })
        .from(projectContentTranslationTable)
        .where(
            and(
                eq(
                    projectContentTranslationTable.projectContentId,
                    project.projectContentId,
                ),
                inArray(
                    projectContentTranslationTable.displayLanguageCode,
                    languageCandidates,
                ),
                isNull(projectContentTranslationTable.deletedAt),
            ),
        );

    const rowsByLanguage = new Map(
        translationRows.map((row) => [row.languageCode, row]),
    );
    for (const languageCode of getDisplayLanguageFallbackChain({
        languageCode: effectiveLanguageCode,
    })) {
        const row = rowsByLanguage.get(languageCode);
        if (row !== undefined) {
            return {
                title: row.title,
                subtitle: optionalText(row.subtitle),
                bodyPlainText: optionalText(row.body),
            };
        }
    }

    return {
        title: project.projectTitle,
        subtitle: optionalText(project.subtitle),
        bodyPlainText: optionalText(project.bodyPlainText),
    };
}

async function fetchResolvedBannerImageUrl({
    db,
    project,
    languageCandidateSet,
    effectiveLanguageCode,
    baseImageServiceUrl,
}: {
    db: PostgresJsDatabase;
    project: ProjectBaseRow;
    languageCandidateSet: Set<SupportedDisplayLanguageCodes>;
    effectiveLanguageCode: SupportedDisplayLanguageCodes;
    baseImageServiceUrl: string;
}): Promise<string | undefined> {
    const bannerRows = await db
        .select({
            languageCode: projectContentBannerLocalizationTable.languageCode,
            bannerPath: projectContentBannerLocalizationTable.bannerPath,
            bannerIsFullPath:
                projectContentBannerLocalizationTable.bannerIsFullPath,
        })
        .from(projectContentBannerLocalizationTable)
        .where(
            and(
                eq(
                    projectContentBannerLocalizationTable.projectContentId,
                    project.projectContentId,
                ),
                inArray(
                    projectContentBannerLocalizationTable.languageCode,
                    Array.from(languageCandidateSet),
                ),
                isNull(projectContentBannerLocalizationTable.deletedAt),
            ),
        );
    const rowsByLanguage = new Map(
        bannerRows.map((row) => [row.languageCode, row]),
    );
    for (const languageCode of getDisplayLanguageFallbackChain({
        languageCode: effectiveLanguageCode,
    })) {
        const row = rowsByLanguage.get(languageCode);
        if (row !== undefined) {
            return toImageUrl({
                imagePath: row.bannerPath,
                isFullImagePath: row.bannerIsFullPath,
                baseImageServiceUrl,
            });
        }
    }

    return toImageUrl({
        imagePath: project.bannerPath,
        isFullImagePath: project.bannerIsFullPath,
        baseImageServiceUrl,
    });
}

async function fetchLatestConversationCounts({
    db,
    conversationIds,
}: {
    db: PostgresJsDatabase;
    conversationIds: number[];
}): Promise<Map<number, ConversationDisplayCounts>> {
    if (conversationIds.length === 0) {
        return new Map();
    }
    const rows = await db
        .selectDistinctOn([conversationViewSnapshotTable.conversationId], {
            conversationId: conversationViewSnapshotTable.conversationId,
            opinionCount: conversationViewSnapshotTable.opinionCount,
            participantCount: conversationViewSnapshotTable.participantCount,
            voteCount: conversationViewSnapshotTable.voteCount,
        })
        .from(conversationViewSnapshotTable)
        .where(
            and(
                inArray(conversationViewSnapshotTable.conversationId, conversationIds),
                isNotNull(conversationViewSnapshotTable.activatedAt),
            ),
        )
        .orderBy(
            conversationViewSnapshotTable.conversationId,
            desc(conversationViewSnapshotTable.createdAt),
            desc(conversationViewSnapshotTable.id),
        );
    return new Map(rows.map((row) => [row.conversationId, row]));
}

function statusToIsClosed({
    status,
}: {
    status: ProjectActivityStatus;
}): boolean {
    return status === "closed";
}

function rowToActivityCursor({
    row,
}: {
    row: ProjectActivityRow;
}): ProjectPageActivityCursor {
    return {
        status: row.status,
        createdAt: row.createdAt,
        conversationId: row.conversationId,
    };
}

function getActivityCursorWhereClause({
    activityCursor,
    status,
}: {
    activityCursor: ProjectPageActivityCursor | undefined;
    status: ProjectActivityStatus;
}): SQL | undefined {
    if (activityCursor?.status !== status) {
        return undefined;
    }
    return or(
        lt(conversationTable.createdAt, activityCursor.createdAt),
        and(
            eq(conversationTable.createdAt, activityCursor.createdAt),
            lt(conversationTable.id, activityCursor.conversationId),
        ),
    );
}

function getVisibleProjectConversationWhereClause({
    projectId,
    activityCursor,
    status,
}: {
    projectId: number;
    activityCursor?: ProjectPageActivityCursor;
    status?: ProjectActivityStatus;
}): SQL | undefined {
    return and(
        eq(conversationTable.projectId, projectId),
        eq(conversationTable.isIndexed, true),
        eq(conversationTable.isImporting, false),
        isNotNull(conversationTable.currentContentId),
        status === undefined
            ? undefined
            : eq(conversationTable.isClosed, statusToIsClosed({ status })),
        status === undefined
            ? undefined
            : getActivityCursorWhereClause({ activityCursor, status }),
    );
}

async function fetchProjectActivityRowsByStatus({
    db,
    projectId,
    displayLanguageCode,
    status,
    limit,
    activityCursor,
}: {
    db: PostgresJsDatabase;
    projectId: number;
    displayLanguageCode: SupportedDisplayLanguageCodes;
    status: ProjectActivityStatus;
    limit: number;
    activityCursor: ProjectPageActivityCursor | undefined;
}): Promise<ProjectActivityRow[]> {
    if (limit <= 0) {
        return [];
    }
    const rows = await db
        .select({
            conversationId: conversationTable.id,
            slug: conversationTable.slugId,
            isClosed: conversationTable.isClosed,
            createdAt: conversationTable.createdAt,
            conversationType: conversationTable.conversationType,
            title: conversationContentTable.title,
            bodyPlainText: conversationContentTable.bodyPlainText,
            translatedTitle: conversationContentTranslationTable.translatedTitle,
            translatedBody: conversationContentTranslationTable.translatedBody,
        })
        .from(conversationTable)
        .innerJoin(
            conversationContentTable,
            eq(conversationContentTable.id, conversationTable.currentContentId),
        )
        .leftJoin(
            conversationContentTranslationTable,
            and(
                eq(
                    conversationContentTranslationTable.conversationContentId,
                    conversationContentTable.id,
                ),
                eq(
                    conversationContentTranslationTable.displayLanguageCode,
                    displayLanguageCode,
                ),
            ),
        )
        .where(
            getVisibleProjectConversationWhereClause({
                projectId,
                activityCursor,
                status,
            }),
        )
        .orderBy(desc(conversationTable.createdAt), desc(conversationTable.id))
        .limit(limit);

    return rows.map((row) => ({
        conversationId: row.conversationId,
        slug: row.slug,
        isClosed: row.isClosed,
        createdAt: row.createdAt,
        conversationType: row.conversationType,
        title: row.translatedTitle ?? row.title,
        bodyPlainText: row.translatedBody ?? row.bodyPlainText,
        status,
    }));
}

async function fetchProjectActivities({
    db,
    projectId,
    displayLanguageCode,
    activityLimit,
    activityCursor,
}: {
    db: PostgresJsDatabase;
    projectId: number;
    displayLanguageCode: SupportedDisplayLanguageCodes;
    activityLimit: number;
    activityCursor: ProjectPageActivityCursor | undefined;
}): Promise<FetchProjectPageActivitiesResponse> {
    const openRows =
        activityCursor?.status === "closed"
            ? []
            : await fetchProjectActivityRowsByStatus({
                  db,
                  projectId,
                  displayLanguageCode,
                  status: "open",
                  limit: activityLimit + 1,
                  activityCursor,
              });
    const pageRows = openRows.slice(0, activityLimit);
    const openHasMore = openRows.length > activityLimit;

    let hasMore = openHasMore;
    if (!openHasMore) {
        const remainingCount = activityLimit - pageRows.length;
        const closedLimit = remainingCount > 0 ? remainingCount + 1 : 1;
        const closedRows = await fetchProjectActivityRowsByStatus({
            db,
            projectId,
            displayLanguageCode,
            status: "closed",
            limit: closedLimit,
            activityCursor:
                activityCursor?.status === "closed" ? activityCursor : undefined,
        });
        if (remainingCount > 0) {
            pageRows.push(...closedRows.slice(0, remainingCount));
            hasMore = closedRows.length > remainingCount;
        } else {
            hasMore = closedRows.length > 0;
        }
    }

    const countsByConversationId = await fetchLatestConversationCounts({
        db,
        conversationIds: pageRows.map((row) => row.conversationId),
    });
    const activities: ProjectPageActivity[] = pageRows.map((row) => {
        const counts = countsByConversationId.get(row.conversationId);
        return {
            slug: row.slug,
            kind: row.conversationType === "maxdiff" ? "vote" : "conversation",
            isClosed: row.isClosed,
            title: row.title,
            bodyPlainText: row.bodyPlainText ?? "",
            stats: {
                opinionCount: counts?.opinionCount ?? 0,
                participantCount: counts?.participantCount ?? 0,
                voteCount: counts?.voteCount ?? 0,
            },
        };
    });
    const lastRow = pageRows.at(-1);
    return {
        activities,
        nextActivityCursor:
            hasMore && lastRow !== undefined
                ? rowToActivityCursor({ row: lastRow })
                : undefined,
    };
}

async function fetchProjectAggregateCounts({
    db,
    projectId,
}: {
    db: PostgresJsDatabase;
    projectId: number;
}): Promise<{ activityCount: number; participantCount: number; voteCount: number }> {
    const latestSnapshot = db
        .selectDistinctOn([conversationViewSnapshotTable.conversationId], {
            conversationId: conversationViewSnapshotTable.conversationId,
            participantCount: conversationViewSnapshotTable.participantCount,
            voteCount: conversationViewSnapshotTable.voteCount,
        })
        .from(conversationViewSnapshotTable)
        .where(isNotNull(conversationViewSnapshotTable.activatedAt))
        .orderBy(
            conversationViewSnapshotTable.conversationId,
            desc(conversationViewSnapshotTable.createdAt),
            desc(conversationViewSnapshotTable.id),
        )
        .as("latest_project_conversation_snapshot");
    const rows = await db
        .select({
            activityCount: count(conversationTable.id),
            participantCount: sql<number>`COALESCE(SUM(${latestSnapshot.participantCount}), 0)::int`,
            voteCount: sql<number>`COALESCE(SUM(${latestSnapshot.voteCount}), 0)::int`,
        })
        .from(conversationTable)
        .leftJoin(
            latestSnapshot,
            eq(latestSnapshot.conversationId, conversationTable.id),
        )
        .where(getVisibleProjectConversationWhereClause({ projectId }));
    return rows.at(0) ?? { activityCount: 0, participantCount: 0, voteCount: 0 };
}

function resolveLocalizationRow({
    defaultRow,
    additionalRows,
    effectiveLanguageCode,
}: {
    defaultRow: OrganizationLocalizationRow;
    additionalRows: readonly OrganizationLocalizationRow[];
    effectiveLanguageCode: SupportedDisplayLanguageCodes;
}): OrganizationLocalizationRow {
    return resolveOrganizationLocalizationRow({
        defaultRow,
        additionalRows,
        effectiveLanguageCode,
    });
}

async function fetchProjectAttributions({
    db,
    projectId,
    effectiveLanguageCode,
    defaultLanguageCode,
    baseImageServiceUrl,
}: {
    db: PostgresJsDatabase;
    projectId: number;
    effectiveLanguageCode: SupportedDisplayLanguageCodes;
    defaultLanguageCode: SupportedDisplayLanguageCodes;
    baseImageServiceUrl: string;
}): Promise<ProjectPageAttribution[]> {
    const languageCandidates = Array.from(
        getLanguageCandidateSet({ effectiveLanguageCode, defaultLanguageCode }),
    );
    const rows = await db
        .select({
            role: projectOrganizationAttributionTable.role,
            sortOrder: projectOrganizationAttributionTable.sortOrder,
            organizationId: organizationTable.id,
            organizationDefaultLanguageCode: organizationTable.defaultLanguageCode,
            organizationDisplayName: organizationTable.displayName,
            organizationDescription: organizationTable.description,
            organizationWebsiteUrl: organizationTable.websiteUrl,
            organizationImagePath: organizationTable.imagePath,
            organizationIsFullImagePath: organizationTable.isFullImagePath,
            organizationLocalizationLanguageCode:
                organizationLocalizationTable.languageCode,
            organizationLocalizationDisplayName:
                organizationLocalizationTable.displayName,
            organizationLocalizationDescription:
                organizationLocalizationTable.description,
            organizationLocalizationWebsiteUrl:
                organizationLocalizationTable.websiteUrl,
            organizationLocalizationImagePath: organizationLocalizationTable.imagePath,
            organizationLocalizationIsFullImagePath:
                organizationLocalizationTable.isFullImagePath,
            externalOrganizationId: projectExternalOrganizationTable.id,
            externalDefaultLanguageCode:
                projectExternalOrganizationTable.defaultLanguageCode,
            externalDisplayName: projectExternalOrganizationTable.displayName,
            externalDescription: projectExternalOrganizationTable.description,
            externalWebsiteUrl: projectExternalOrganizationTable.websiteUrl,
            externalImagePath: projectExternalOrganizationTable.imagePath,
            externalIsFullImagePath:
                projectExternalOrganizationTable.isFullImagePath,
            externalLocalizationLanguageCode:
                projectExternalOrganizationLocalizationTable.languageCode,
            externalLocalizationDisplayName:
                projectExternalOrganizationLocalizationTable.displayName,
            externalLocalizationDescription:
                projectExternalOrganizationLocalizationTable.description,
            externalLocalizationWebsiteUrl:
                projectExternalOrganizationLocalizationTable.websiteUrl,
            externalLocalizationImagePath:
                projectExternalOrganizationLocalizationTable.imagePath,
            externalLocalizationIsFullImagePath:
                projectExternalOrganizationLocalizationTable.isFullImagePath,
        })
        .from(projectOrganizationAttributionTable)
        .leftJoin(
            organizationTable,
            eq(organizationTable.id, projectOrganizationAttributionTable.organizationId),
        )
        .leftJoin(
            organizationLocalizationTable,
            and(
                eq(organizationLocalizationTable.organizationId, organizationTable.id),
                inArray(organizationLocalizationTable.languageCode, languageCandidates),
            ),
        )
        .leftJoin(
            projectExternalOrganizationTable,
            eq(
                projectExternalOrganizationTable.id,
                projectOrganizationAttributionTable.externalOrganizationId,
            ),
        )
        .leftJoin(
            projectExternalOrganizationLocalizationTable,
            and(
                eq(
                    projectExternalOrganizationLocalizationTable.externalOrganizationId,
                    projectExternalOrganizationTable.id,
                ),
                inArray(
                    projectExternalOrganizationLocalizationTable.languageCode,
                    languageCandidates,
                ),
                isNull(projectExternalOrganizationLocalizationTable.deletedAt),
            ),
        )
        .where(
            and(
                eq(projectOrganizationAttributionTable.projectId, projectId),
                isNull(projectOrganizationAttributionTable.deletedAt),
            ),
        )
        .orderBy(projectOrganizationAttributionTable.role, projectOrganizationAttributionTable.sortOrder);

    const grouped = new Map<string, (typeof rows)[number][] >();
    for (const row of rows) {
        const id = row.organizationId ?? row.externalOrganizationId;
        if (id === null) {
            continue;
        }
        const key = `${row.role}:${row.organizationId === null ? "external" : "organization"}:${String(id)}`;
        grouped.set(key, [...(grouped.get(key) ?? []), row]);
    }

    const attributions: ProjectPageAttribution[] = [];
    for (const groupRows of grouped.values()) {
        const row = groupRows[0];
        const defaultRow: OrganizationLocalizationRow =
            row.organizationId !== null
                ? {
                      languageCode:
                          row.organizationDefaultLanguageCode ?? defaultLanguageCode,
                      displayName: row.organizationDisplayName ?? "",
                      description: row.organizationDescription ?? "",
                      websiteUrl: row.organizationWebsiteUrl,
                      imagePath: row.organizationImagePath,
                      isFullImagePath: row.organizationIsFullImagePath ?? false,
                  }
                : {
                      languageCode: row.externalDefaultLanguageCode ?? defaultLanguageCode,
                      displayName: row.externalDisplayName ?? "",
                      description: row.externalDescription ?? "",
                      websiteUrl: row.externalWebsiteUrl,
                      imagePath: row.externalImagePath,
                      isFullImagePath: row.externalIsFullImagePath ?? false,
                  };
        const additionalRows: OrganizationLocalizationRow[] = groupRows.flatMap(
            (candidate) => {
                if (row.organizationId !== null) {
                    return candidate.organizationLocalizationLanguageCode === null
                        ? []
                        : [
                              {
                                  languageCode:
                                      candidate.organizationLocalizationLanguageCode,
                                  displayName:
                                      candidate.organizationLocalizationDisplayName ?? "",
                                  description:
                                      candidate.organizationLocalizationDescription ?? "",
                                  websiteUrl:
                                      candidate.organizationLocalizationWebsiteUrl,
                                  imagePath: candidate.organizationLocalizationImagePath,
                                  isFullImagePath:
                                      candidate.organizationLocalizationIsFullImagePath ??
                                      false,
                              },
                          ];
                }
                return candidate.externalLocalizationLanguageCode === null
                    ? []
                    : [
                          {
                              languageCode: candidate.externalLocalizationLanguageCode,
                              displayName:
                                  candidate.externalLocalizationDisplayName ?? "",
                              description:
                                  candidate.externalLocalizationDescription ?? "",
                              websiteUrl: candidate.externalLocalizationWebsiteUrl,
                              imagePath: candidate.externalLocalizationImagePath,
                              isFullImagePath:
                                  candidate.externalLocalizationIsFullImagePath ?? false,
                          },
                      ];
            },
        );
        const resolved = resolveLocalizationRow({
            defaultRow,
            additionalRows,
            effectiveLanguageCode,
        });
        attributions.push({
            role: row.role,
            displayName: resolved.displayName,
            description: optionalText(resolved.description),
            websiteUrl: optionalUrl(resolved.websiteUrl),
            initials: getInitials(resolved.displayName),
            accentColor: getAttributionAccentColor({ role: row.role }),
            imageUrl: toImageUrl({
                imagePath: resolved.imagePath,
                isFullImagePath: resolved.isFullImagePath,
                baseImageServiceUrl,
            }),
        });
    }
    return attributions;
}

async function fetchProjectContact({
    db,
    projectId,
    baseImageServiceUrl,
}: {
    db: PostgresJsDatabase;
    projectId: number;
    baseImageServiceUrl: string;
}): Promise<ProjectPageContact | undefined> {
    const rows = await db
        .select({
            name: projectContactTable.name,
            roleLabel: projectContactTable.roleLabel,
            email: projectContactTable.email,
            organizationName: organizationTable.displayName,
            organizationWebsiteUrl: organizationTable.websiteUrl,
            organizationImagePath: organizationTable.imagePath,
            organizationIsFullImagePath: organizationTable.isFullImagePath,
            externalName: projectExternalOrganizationTable.displayName,
            externalWebsiteUrl: projectExternalOrganizationTable.websiteUrl,
            externalImagePath: projectExternalOrganizationTable.imagePath,
            externalIsFullImagePath: projectExternalOrganizationTable.isFullImagePath,
        })
        .from(projectContactTable)
        .leftJoin(
            organizationTable,
            eq(organizationTable.id, projectContactTable.organizationId),
        )
        .leftJoin(
            projectExternalOrganizationTable,
            eq(
                projectExternalOrganizationTable.id,
                projectContactTable.externalOrganizationId,
            ),
        )
        .where(
            and(
                eq(projectContactTable.projectId, projectId),
                isNull(projectContactTable.deletedAt),
            ),
        )
        .limit(1);
    const row = rows.at(0);
    if (row === undefined) {
        return undefined;
    }
    const affiliationName = row.organizationName ?? row.externalName ?? undefined;
    return {
        name: row.name,
        roleLabel: optionalText(row.roleLabel),
        affiliationName,
        email: row.email,
        websiteUrl: optionalUrl(row.organizationWebsiteUrl ?? row.externalWebsiteUrl),
        imageUrl: toImageUrl({
            imagePath: row.organizationImagePath ?? row.externalImagePath,
            isFullImagePath:
                row.organizationIsFullImagePath ?? row.externalIsFullImagePath ?? false,
            baseImageServiceUrl,
        }),
    };
}

async function buildProjectPagePayload({
    db,
    baseImageServiceUrl,
    userId,
    request,
    currentDisplayLanguage,
}: AuthenticatedProjectPageParams & {
    request: FetchProjectPageRequest;
    currentDisplayLanguage: SupportedDisplayLanguageCodes;
}): Promise<FetchProjectPageResponse> {
    const project = await fetchProjectBaseBySlug({
        db,
        projectSlug: request.projectSlug,
    });
    const defaultLanguageCode = getProjectDefaultDisplayLanguage({
        sourceLanguageCode: project.sourceLanguageCode,
    });
    const additionalLanguageCodes = await fetchProjectTargetLanguages({
        db,
        projectId: project.projectId,
    });
    const storedProjectDisplayLanguage = await fetchStoredProjectDisplayLanguage({
        db,
        projectId: project.projectId,
        userId,
    });
    const storedUserDisplayLanguage = await fetchStoredUserDisplayLanguage({
        db,
        userId,
    });
    const resolution = resolveEffectiveProjectDisplayLanguage({
        projectSupportedDisplayLanguages: {
            defaultLanguageCode,
            additionalLanguageCodes,
        },
        storedProjectDisplayLanguage:
            request.selectedLanguageCode ?? storedProjectDisplayLanguage,
        storedUserDisplayLanguage,
        currentDisplayLanguage,
    });
    const effectiveLanguageCode = resolution.effectiveProjectDisplayLanguage;
    const languageCandidateSet = getLanguageCandidateSet({
        effectiveLanguageCode,
        defaultLanguageCode,
    });
    const [content, bannerImageUrl, aggregateCounts, attributions, contact, activityPage] =
        await Promise.all([
            fetchResolvedProjectContent({
                db,
                project,
                languageCandidateSet,
                effectiveLanguageCode,
            }),
            fetchResolvedBannerImageUrl({
                db,
                project,
                languageCandidateSet,
                effectiveLanguageCode,
                baseImageServiceUrl,
            }),
            fetchProjectAggregateCounts({ db, projectId: project.projectId }),
            fetchProjectAttributions({
                db,
                projectId: project.projectId,
                effectiveLanguageCode,
                defaultLanguageCode,
                baseImageServiceUrl,
            }),
            fetchProjectContact({
                db,
                projectId: project.projectId,
                baseImageServiceUrl,
            }),
            fetchProjectActivities({
                db,
                projectId: project.projectId,
                displayLanguageCode: effectiveLanguageCode,
                activityLimit: request.activityLimit,
                activityCursor: request.activityCursor,
            }),
        ]);
    const projectPayload: ProjectPageProject = {
        slug: project.projectSlug,
        title: content.title,
        subtitle: content.subtitle,
        bodyPlainText: content.bodyPlainText,
        bannerVariant: "blue",
        bannerImageUrl,
        participantCount: aggregateCounts.participantCount,
        voteCount: aggregateCounts.voteCount,
        activityCount: aggregateCounts.activityCount,
        attributions,
        contact,
    };
    const supportedLanguageCodes = [defaultLanguageCode, ...additionalLanguageCodes];
    return {
        project: projectPayload,
        activities: activityPage.activities,
        languageOptions: supportedLanguageCodes.map((languageCode) =>
            languageOptionFor({ languageCode }),
        ),
        selectedProjectDisplayLanguage:
            request.selectedLanguageCode ?? resolution.selectedProjectDisplayLanguage,
        effectiveProjectDisplayLanguage: effectiveLanguageCode,
        nextActivityCursor: activityPage.nextActivityCursor,
    };
}

export async function fetchProjectPage({
    db,
    baseImageServiceUrl,
    userId,
    request,
    currentDisplayLanguage,
}: AuthenticatedProjectPageParams & {
    request: FetchProjectPageRequest;
    currentDisplayLanguage: SupportedDisplayLanguageCodes;
}): Promise<FetchProjectPageResponse> {
    return await buildProjectPagePayload({
        db,
        baseImageServiceUrl,
        userId,
        request,
        currentDisplayLanguage,
    });
}

export async function fetchProjectPageActivities({
    db,
    request,
}: ProjectPageServiceParams & {
    request: FetchProjectPageActivitiesRequest;
}): Promise<FetchProjectPageActivitiesResponse> {
    const project = await fetchProjectBaseBySlug({
        db,
        projectSlug: request.projectSlug,
    });
    return await fetchProjectActivities({
        db,
        projectId: project.projectId,
        displayLanguageCode: request.displayLanguageCode,
        activityLimit: request.activityLimit,
        activityCursor: request.activityCursor,
    });
}

export async function updateProjectPageDisplayLanguage({
    db,
    userId,
    projectSlug,
    languageCode,
    currentDisplayLanguage,
}: {
    db: PostgresJsDatabase;
    userId: string;
    projectSlug: string;
    languageCode: SupportedDisplayLanguageCodes;
    currentDisplayLanguage: SupportedDisplayLanguageCodes;
}): Promise<UpdateProjectPageDisplayLanguageResponse> {
    const project = await fetchProjectBaseBySlug({ db, projectSlug });
    const defaultLanguageCode = getProjectDefaultDisplayLanguage({
        sourceLanguageCode: project.sourceLanguageCode,
    });
    const additionalLanguageCodes = await fetchProjectTargetLanguages({
        db,
        projectId: project.projectId,
    });
    const supportedLanguageCodes = new Set([
        defaultLanguageCode,
        ...additionalLanguageCodes,
    ]);
    if (!supportedLanguageCodes.has(languageCode)) {
        throw httpErrors.badRequest("Unsupported project display language");
    }
    const now = new Date();
    await db
        .insert(projectParticipantDisplayLanguageTable)
        .values({
            projectId: project.projectId,
            userId,
            languageCode,
            createdAt: now,
            updatedAt: now,
        })
        .onConflictDoUpdate({
            target: [
                projectParticipantDisplayLanguageTable.projectId,
                projectParticipantDisplayLanguageTable.userId,
            ],
            set: {
                languageCode,
                updatedAt: now,
            },
        });
    const storedUserDisplayLanguage = await fetchStoredUserDisplayLanguage({
        db,
        userId,
    });
    const resolution = resolveEffectiveProjectDisplayLanguage({
        projectSupportedDisplayLanguages: {
            defaultLanguageCode,
            additionalLanguageCodes,
        },
        storedProjectDisplayLanguage: languageCode,
        storedUserDisplayLanguage,
        currentDisplayLanguage,
    });
    return {
        selectedProjectDisplayLanguage: languageCode,
        effectiveProjectDisplayLanguage:
            resolution.effectiveProjectDisplayLanguage,
    };
}
