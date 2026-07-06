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
    conversationTranslationTargetLanguageTable,
    conversationViewSnapshotTable,
    contentTranslationWorkTable,
    organizationLocalizationTable,
    organizationTable,
    projectContactTable,
    projectContentBannerLocalizationTable,
    projectContentTable,
    projectContentTranslationTable,
    projectExternalOrganizationLocalizationTable,
    projectExternalOrganizationTable,
    projectOrganizationAttributionTable,
    projectTable,
    projectTranslationTargetLanguageTable,
} from "@/shared-backend/schema.js";
import {
    getDisplayLanguageFallbackChain,
    SupportedSpokenLanguageMetadataList,
    ZodSupportedDisplayLanguageCodes,
    type SupportedDisplayLanguageCodes,
    type SupportedSpokenLanguageCodes,
} from "@/shared/languages.js";
import type {
    FetchProjectPageActivitiesRequest,
    FetchProjectPageActivitiesResponse,
    FetchProjectConversationPageRequest,
    FetchProjectConversationPageResponse,
    FetchProjectPageRequest,
    FetchProjectPageResponse,
    ProjectPageActivity,
    ProjectPageActivityCursor,
    ProjectPageAttribution,
    ProjectPageContact,
    ProjectPageLanguageOption,
    ProjectPageProject,
} from "@/shared/types/dto.js";
import { imagePathToUrl } from "@/utils/organizationLogic.js";
import { translationSourceMatchesCurrentSource } from "@/shared-backend/translate.js";
import { getSourceLanguageLabel } from "./contentTranslationContent.js";
import {
    getImplicitDefaultDisplayLanguage,
    resolveOrganizationLocalizationRow,
    type OrganizationLocalizationRow,
} from "./projectLanguage.js";
import {
    resolvePreferredContentLanguage,
    resolvePreferredContentLanguageFromSettings,
} from "./contentLanguagePreference.js";
import {
    getProjectTranslationTargetLanguagePolicy,
    isConfiguredTranslationTargetLanguage,
    shouldTranslateContent,
    sourceLanguageToDisplayLanguage,
} from "./translationLanguageSetting.js";

interface ProjectPageServiceParams {
    db: PostgresJsDatabase;
    baseImageServiceUrl: string;
}

interface ProjectShellPayload {
    project: ProjectPageProject;
    languageOptions: ProjectPageLanguageOption[];
}

interface ProjectBaseRow {
    projectId: number;
    projectContentId: number;
    projectSlug: string;
    projectTitle: string;
    dynamicTranslationEnabled: boolean;
    subtitle: string | null;
    bodyHtml: string | null;
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

type ProjectPageTranslationStatus = NonNullable<
    ProjectPageProject["machineTranslation"]
>["status"];

interface ProjectActivityRow {
    conversationId: number;
    conversationContentId: number;
    slugId: string;
    isIndexed: boolean;
    isClosed: boolean;
    createdAt: Date;
    isEdited: boolean;
    conversationType: "polis" | "maxdiff";
    title: string;
    bodyPlainText: string | null;
    sourceLanguageCode: SupportedSpokenLanguageCodes | null;
    dynamicTranslationEnabled: boolean;
}

interface ProjectActivityContentTranslationRow {
    conversationContentId: number;
    displayLanguageCode: SupportedDisplayLanguageCodes;
    translatedTitle: string;
    translatedBody: string | null;
    translatedBodyPlainText: string | null;
    sourceLanguageCode: SupportedSpokenLanguageCodes | null;
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
    isProjectSupported,
}: {
    languageCode: SupportedDisplayLanguageCodes;
    isProjectSupported: boolean;
}): ProjectPageLanguageOption {
    const metadata = SupportedSpokenLanguageMetadataList.find(
        (language) => language.code === languageCode,
    );
    return {
        label: metadata?.name ?? languageCode,
        value: languageCode,
        projectSupported: isProjectSupported ? true : undefined,
        searchText: [metadata?.name, metadata?.englishName, languageCode]
            .filter((value): value is string => value !== undefined)
            .join(" "),
        shortLabel: metadata?.name ?? languageCode,
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
            dynamicTranslationEnabled: projectTable.dynamicTranslationEnabled,
            subtitle: projectContentTable.subtitle,
            bodyHtml: projectContentTable.body,
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

function buildProjectPageLanguageOptions({
    projectSupportedLanguageCodes,
}: {
    projectSupportedLanguageCodes: readonly SupportedDisplayLanguageCodes[];
}): ProjectPageLanguageOption[] {
    const dedupedProjectSupportedLanguageCodes = Array.from(
        new Set(projectSupportedLanguageCodes),
    );
    const projectSupportedLanguageSet = new Set(
        dedupedProjectSupportedLanguageCodes,
    );
    const remainingLanguageCodes =
        ZodSupportedDisplayLanguageCodes.options.filter(
            (languageCode) => !projectSupportedLanguageSet.has(languageCode),
        );

    return [
        ...dedupedProjectSupportedLanguageCodes,
        ...remainingLanguageCodes,
    ].map((languageCode) =>
        languageOptionFor({
            languageCode,
            isProjectSupported: projectSupportedLanguageSet.has(languageCode),
        }),
    );
}

async function fetchResolvedProjectContent({
    db,
    project,
    languageCandidateSet,
    effectiveLanguageCode,
    additionalLanguageCodes,
}: {
    db: PostgresJsDatabase;
    project: ProjectBaseRow;
    languageCandidateSet: Set<SupportedDisplayLanguageCodes>;
    effectiveLanguageCode: SupportedDisplayLanguageCodes;
    additionalLanguageCodes: SupportedDisplayLanguageCodes[];
}): Promise<{
    title: string;
    subtitle: string | undefined;
    bodyHtml: string | undefined;
    originalContent: ProjectPageProject["originalContent"];
    machineTranslation: ProjectPageProject["machineTranslation"];
}> {
    const languageCandidates = Array.from(languageCandidateSet);
    const translationRows = await db
        .select({
            languageCode: projectContentTranslationTable.displayLanguageCode,
            title: projectContentTranslationTable.translatedTitle,
            subtitle: projectContentTranslationTable.translatedSubtitle,
            body: projectContentTranslationTable.translatedBody,
            sourceKind: projectContentTranslationTable.sourceKind,
            sourceLanguageCode: projectContentTranslationTable.sourceLanguageCode,
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

    const originalContent = {
        title: project.projectTitle,
        subtitle: optionalText(project.subtitle),
        bodyHtml: optionalText(project.bodyHtml),
    };
    const rowsByLanguage = new Map(
        translationRows.map((row) => [row.languageCode, row]),
    );
    for (const languageCode of getDisplayLanguageFallbackChain({
        languageCode: effectiveLanguageCode,
    })) {
        const row = rowsByLanguage.get(languageCode);
        if (row?.sourceKind === "manual") {
            return {
                title: row.title,
                subtitle: optionalText(row.subtitle),
                bodyHtml: optionalText(row.body),
                originalContent,
                machineTranslation: undefined,
            };
        }
    }

    const targetLanguagePolicy = getProjectTranslationTargetLanguagePolicy({
        languageSettings: {
            dynamicTranslationEnabled: project.dynamicTranslationEnabled,
            defaultLanguageCode: getProjectDefaultDisplayLanguage({
                sourceLanguageCode: project.sourceLanguageCode,
            }),
            targetLanguageCodes: additionalLanguageCodes,
        },
    });
    const canUseMachineTranslation =
        targetLanguagePolicy.dynamicTranslationEnabled &&
        isConfiguredTranslationTargetLanguage({
            policy: targetLanguagePolicy,
            targetLanguageCode: effectiveLanguageCode,
        }) &&
        shouldTranslateContent({
            sourceLanguageCode: project.sourceLanguageCode,
            sourceRawLanguageCode: null,
            targetLanguageCode: effectiveLanguageCode,
        });
    if (canUseMachineTranslation) {
        const machineRow = rowsByLanguage.get(effectiveLanguageCode);
        if (
            machineRow?.sourceKind === "machine" &&
            translationSourceMatchesCurrentSource({
                translationSourceLanguageCode: machineRow.sourceLanguageCode,
                currentSourceLanguageCode: project.sourceLanguageCode,
            })
        ) {
            const machineTranslation = {
                targetLanguageCode: effectiveLanguageCode,
                sourceLanguageCode: machineRow.sourceLanguageCode,
                sourceLanguageLabel: getSourceLanguageLabel(
                    machineRow.sourceLanguageCode,
                ),
                status: "completed" as const,
                translatedContent: {
                    title: machineRow.title,
                    subtitle: optionalText(machineRow.subtitle),
                    bodyHtml: optionalText(machineRow.body),
                },
            };
            return {
                title: machineRow.title,
                subtitle: optionalText(machineRow.subtitle),
                bodyHtml: optionalText(machineRow.body),
                originalContent,
                machineTranslation,
            };
        }

        const status = await fetchProjectTranslationWorkStatus({
            db,
            projectContentId: project.projectContentId,
            targetLanguageCode: effectiveLanguageCode,
        });
        return {
            ...originalContent,
            originalContent,
            machineTranslation: {
                targetLanguageCode: effectiveLanguageCode,
                sourceLanguageCode: project.sourceLanguageCode,
                sourceLanguageLabel: getSourceLanguageLabel(project.sourceLanguageCode),
                status,
            },
        };
    }

    return {
        ...originalContent,
        originalContent,
        machineTranslation: undefined,
    };
}

async function fetchProjectTranslationWorkStatus({
    db,
    projectContentId,
    targetLanguageCode,
}: {
    db: PostgresJsDatabase;
    projectContentId: number;
    targetLanguageCode: SupportedDisplayLanguageCodes;
}): Promise<ProjectPageTranslationStatus> {
    const rows = await db
        .select({ status: contentTranslationWorkTable.status })
        .from(contentTranslationWorkTable)
        .where(
            and(
                eq(contentTranslationWorkTable.sourceKind, "project"),
                eq(contentTranslationWorkTable.projectContentId, projectContentId),
                eq(contentTranslationWorkTable.displayLanguageCode, targetLanguageCode),
            ),
        )
        .limit(1);
    const status = rows.at(0)?.status;
    return status === "pending" || status === "running" || status === "failed"
        ? status
        : "not_requested";
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

function rowToActivityCursor({
    row,
}: {
    row: ProjectActivityRow;
}): ProjectPageActivityCursor {
    return {
        isIndexed: row.isIndexed,
        createdAt: row.createdAt,
        conversationId: row.conversationId,
    };
}

function getCreatedBeforeActivityCursorWhereClause({
    activityCursor,
}: {
    activityCursor: ProjectPageActivityCursor | undefined;
}): SQL | undefined {
    if (activityCursor === undefined) {
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

function getActivityCursorWhereClause({
    activityCursor,
}: {
    activityCursor: ProjectPageActivityCursor | undefined;
}): SQL | undefined {
    const createdBeforeCursor = getCreatedBeforeActivityCursorWhereClause({
        activityCursor,
    });
    if (activityCursor === undefined || createdBeforeCursor === undefined) {
        return undefined;
    }

    if (activityCursor.isIndexed) {
        return or(
            and(eq(conversationTable.isIndexed, true), createdBeforeCursor),
            eq(conversationTable.isIndexed, false),
        );
    }

    return and(eq(conversationTable.isIndexed, false), createdBeforeCursor);
}

function getProjectPageConversationWhereClause({
    projectId,
    activityCursor,
}: {
    projectId: number;
    activityCursor?: ProjectPageActivityCursor;
}): SQL | undefined {
    return and(
        eq(conversationTable.projectId, projectId),
        eq(conversationTable.isImporting, false),
        isNotNull(conversationTable.currentContentId),
        getActivityCursorWhereClause({ activityCursor }),
    );
}

async function fetchProjectActivityRows({
    db,
    projectId,
    limit,
    activityCursor,
}: {
    db: PostgresJsDatabase;
    projectId: number;
    limit: number;
    activityCursor: ProjectPageActivityCursor | undefined;
}): Promise<ProjectActivityRow[]> {
    if (limit <= 0) {
        return [];
    }
    const rows = await db
        .select({
            conversationId: conversationTable.id,
            conversationContentId: conversationContentTable.id,
            slugId: conversationTable.slugId,
            isIndexed: conversationTable.isIndexed,
            isClosed: conversationTable.isClosed,
            createdAt: conversationTable.createdAt,
            isEdited: conversationTable.isEdited,
            conversationType: conversationTable.conversationType,
            title: conversationContentTable.title,
            bodyPlainText: conversationContentTable.bodyPlainText,
            sourceLanguageCode: conversationContentTable.sourceLanguageCode,
            dynamicTranslationEnabled: conversationTable.dynamicTranslationEnabled,
        })
        .from(conversationTable)
        .innerJoin(
            conversationContentTable,
            eq(conversationContentTable.id, conversationTable.currentContentId),
        )
        .where(
            getProjectPageConversationWhereClause({
                projectId,
                activityCursor,
            }),
        )
        .orderBy(
            desc(conversationTable.isIndexed),
            desc(conversationTable.createdAt),
            desc(conversationTable.id),
        )
        .limit(limit);

    return rows.map((row) => ({
        conversationId: row.conversationId,
        conversationContentId: row.conversationContentId,
        slugId: row.slugId,
        isIndexed: row.isIndexed,
        isClosed: row.isClosed,
        createdAt: row.createdAt,
        isEdited: row.isEdited,
        conversationType: row.conversationType,
        title: row.title,
        bodyPlainText: row.bodyPlainText,
        sourceLanguageCode: row.sourceLanguageCode,
        dynamicTranslationEnabled: row.dynamicTranslationEnabled,
    }));
}

async function fetchConversationTargetLanguagesByConversationId({
    db,
    conversationIds,
}: {
    db: PostgresJsDatabase;
    conversationIds: readonly number[];
}): Promise<Map<number, SupportedDisplayLanguageCodes[]>> {
    if (conversationIds.length === 0) {
        return new Map();
    }

    const rows = await db
        .select({
            conversationId: conversationTranslationTargetLanguageTable.conversationId,
            languageCode: conversationTranslationTargetLanguageTable.languageCode,
        })
        .from(conversationTranslationTargetLanguageTable)
        .where(
            and(
                inArray(
                    conversationTranslationTargetLanguageTable.conversationId,
                    [...conversationIds],
                ),
                isNull(conversationTranslationTargetLanguageTable.deletedAt),
            ),
        );

    const languagesByConversationId = new Map<
        number,
        SupportedDisplayLanguageCodes[]
    >();
    for (const row of rows) {
        languagesByConversationId.set(row.conversationId, [
            ...(languagesByConversationId.get(row.conversationId) ?? []),
            row.languageCode,
        ]);
    }
    return languagesByConversationId;
}

async function fetchProjectActivityTranslations({
    db,
    preferredLanguageByContentId,
}: {
    db: PostgresJsDatabase;
    preferredLanguageByContentId: ReadonlyMap<number, SupportedDisplayLanguageCodes>;
}): Promise<Map<number, ProjectActivityContentTranslationRow>> {
    const contentIds = [...preferredLanguageByContentId.keys()];
    if (contentIds.length === 0) {
        return new Map();
    }

    const rows = await db
        .select({
            conversationContentId:
                conversationContentTranslationTable.conversationContentId,
            displayLanguageCode:
                conversationContentTranslationTable.displayLanguageCode,
            translatedTitle: conversationContentTranslationTable.translatedTitle,
            translatedBody: conversationContentTranslationTable.translatedBody,
            translatedBodyPlainText:
                conversationContentTranslationTable.translatedBodyPlainText,
            sourceLanguageCode: conversationContentTranslationTable.sourceLanguageCode,
        })
        .from(conversationContentTranslationTable)
        .where(
            inArray(
                conversationContentTranslationTable.conversationContentId,
                contentIds,
            ),
        );

    const translationsByContentId = new Map<
        number,
        ProjectActivityContentTranslationRow
    >();
    for (const row of rows) {
        if (
            preferredLanguageByContentId.get(row.conversationContentId) !==
            row.displayLanguageCode
        ) {
            continue;
        }
        translationsByContentId.set(row.conversationContentId, row);
    }
    return translationsByContentId;
}

async function fetchProjectActivities({
    db,
    projectId,
    displayLanguage,
    activityLimit,
    activityCursor,
}: {
    db: PostgresJsDatabase;
    projectId: number;
    displayLanguage: SupportedDisplayLanguageCodes;
    activityLimit: number;
    activityCursor: ProjectPageActivityCursor | undefined;
}): Promise<FetchProjectPageActivitiesResponse> {
    const rows = await fetchProjectActivityRows({
        db,
        projectId,
        limit: activityLimit + 1,
        activityCursor,
    });
    const pageRows = rows.slice(0, activityLimit);
    const hasMore = rows.length > activityLimit;

    const conversationIds = pageRows.map((row) => row.conversationId);
    const targetLanguagesByConversationId =
        await fetchConversationTargetLanguagesByConversationId({
            db,
            conversationIds,
        });
    const preferredLanguageByContentId = new Map<
        number,
        SupportedDisplayLanguageCodes
    >();
    for (const row of pageRows) {
        const { preferredContentLanguage } =
            resolvePreferredContentLanguageFromSettings({
                displayLanguage,
                sourceLanguageCode: row.sourceLanguageCode,
                targetLanguageCodes:
                    targetLanguagesByConversationId.get(row.conversationId) ?? [],
                fallbackContentLanguage: displayLanguage,
            });
        preferredLanguageByContentId.set(
            row.conversationContentId,
            preferredContentLanguage,
        );
    }
    const [countsByConversationId, translationsByContentId] = await Promise.all([
        fetchLatestConversationCounts({ db, conversationIds }),
        fetchProjectActivityTranslations({ db, preferredLanguageByContentId }),
    ]);
    const activities: ProjectPageActivity[] = pageRows.map((row) => {
        const counts = countsByConversationId.get(row.conversationId);
        const translation = translationsByContentId.get(row.conversationContentId);
        const originalContent = {
            title: row.title,
            bodyPlainText: row.bodyPlainText ?? "",
        };
        const freshTranslation =
            translation !== undefined &&
            translationSourceMatchesCurrentSource({
                translationSourceLanguageCode: translation.sourceLanguageCode,
                currentSourceLanguageCode: row.sourceLanguageCode,
            })
                ? translation
                : undefined;
        const translatedContent =
            freshTranslation === undefined
                ? undefined
                : {
                      title: freshTranslation.translatedTitle,
                      bodyPlainText: freshTranslation.translatedBodyPlainText ?? "",
                  };
        const activityBase = {
            kind: row.conversationType === "maxdiff" ? "vote" : "conversation",
            isClosed: row.isClosed,
            createdAt: row.createdAt,
            isEdited: row.isEdited,
            title: translatedContent?.title ?? row.title,
            bodyPlainText: translatedContent?.bodyPlainText ?? row.bodyPlainText ?? "",
            originalContent,
            sourceLanguageCode: row.sourceLanguageCode,
            dynamicTranslationEnabled: row.dynamicTranslationEnabled,
            machineTranslation:
                freshTranslation === undefined || translatedContent === undefined
                    ? undefined
                    : {
                          targetLanguageCode: freshTranslation.displayLanguageCode,
                          sourceLanguageCode: freshTranslation.sourceLanguageCode,
                          sourceLanguageLabel: getSourceLanguageLabel(
                              freshTranslation.sourceLanguageCode,
                          ),
                          status: "completed",
                          translatedContent,
                      },
            stats: {
                opinionCount: counts?.opinionCount ?? 0,
                participantCount: counts?.participantCount ?? 0,
                voteCount: counts?.voteCount ?? 0,
            },
        } satisfies Omit<ProjectPageActivity, "isIndexed" | "slugId">;
        return row.isIndexed
            ? {
                  ...activityBase,
                  isIndexed: true,
                  slugId: row.slugId,
              }
            : {
                  ...activityBase,
                  isIndexed: false,
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

async function assertVisibleProjectConversation({
    db,
    projectId,
    conversationSlugId,
}: {
    db: PostgresJsDatabase;
    projectId: number;
    conversationSlugId: string;
}): Promise<void> {
    const rows = await db
        .select({ conversationId: conversationTable.id })
        .from(conversationTable)
        .where(
            and(
                getProjectPageConversationWhereClause({ projectId }),
                eq(conversationTable.slugId, conversationSlugId),
            ),
        )
        .limit(1);

    if (rows.at(0) === undefined) {
        throw httpErrors.notFound("Project conversation not found");
    }
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
        .where(getProjectPageConversationWhereClause({ projectId }));
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
    effectiveLanguageCode,
    defaultLanguageCode,
}: {
    db: PostgresJsDatabase;
    projectId: number;
    baseImageServiceUrl: string;
    effectiveLanguageCode: SupportedDisplayLanguageCodes;
    defaultLanguageCode: SupportedDisplayLanguageCodes;
}): Promise<ProjectPageContact | undefined> {
    const languageCandidates = Array.from(
        getLanguageCandidateSet({ effectiveLanguageCode, defaultLanguageCode }),
    );
    const rows = await db
        .select({
            firstName: projectContactTable.firstName,
            lastName: projectContactTable.lastName,
            roleLabel: projectContactTable.roleLabel,
            email: projectContactTable.email,
            websiteUrl: projectContactTable.websiteUrl,
            imagePath: projectContactTable.imagePath,
            isFullImagePath: projectContactTable.isFullImagePath,
            organizationDefaultLanguageCode: organizationTable.defaultLanguageCode,
            organizationName: organizationTable.displayName,
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
            externalDefaultLanguageCode:
                projectExternalOrganizationTable.defaultLanguageCode,
            externalName: projectExternalOrganizationTable.displayName,
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
        .from(projectContactTable)
        .leftJoin(
            organizationTable,
            eq(organizationTable.id, projectContactTable.organizationId),
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
                projectContactTable.externalOrganizationId,
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
                eq(projectContactTable.projectId, projectId),
                isNull(projectContactTable.deletedAt),
            ),
        );
    const row = rows.at(0);
    if (row === undefined) {
        return undefined;
    }
    const affiliationName = (() => {
        if (row.organizationName !== null) {
            const defaultRow: OrganizationLocalizationRow = {
                languageCode: row.organizationDefaultLanguageCode ?? defaultLanguageCode,
                displayName: row.organizationName,
                description: row.organizationDescription ?? "",
                websiteUrl: row.organizationWebsiteUrl,
                imagePath: row.organizationImagePath,
                isFullImagePath: row.organizationIsFullImagePath ?? false,
            };
            const additionalRows: OrganizationLocalizationRow[] = rows.flatMap(
                (candidate) =>
                    candidate.organizationLocalizationLanguageCode === null
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
                          ],
            );
            return resolveLocalizationRow({
                defaultRow,
                additionalRows,
                effectiveLanguageCode,
            }).displayName;
        }

        if (row.externalName !== null) {
            const defaultRow: OrganizationLocalizationRow = {
                languageCode: row.externalDefaultLanguageCode ?? defaultLanguageCode,
                displayName: row.externalName,
                description: row.externalDescription ?? "",
                websiteUrl: row.externalWebsiteUrl,
                imagePath: row.externalImagePath,
                isFullImagePath: row.externalIsFullImagePath ?? false,
            };
            const additionalRows: OrganizationLocalizationRow[] = rows.flatMap(
                (candidate) =>
                    candidate.externalLocalizationLanguageCode === null
                        ? []
                        : [
                              {
                                  languageCode:
                                      candidate.externalLocalizationLanguageCode,
                                  displayName:
                                      candidate.externalLocalizationDisplayName ?? "",
                                  description:
                                      candidate.externalLocalizationDescription ?? "",
                                  websiteUrl: candidate.externalLocalizationWebsiteUrl,
                                  imagePath: candidate.externalLocalizationImagePath,
                                  isFullImagePath:
                                      candidate.externalLocalizationIsFullImagePath ?? false,
                              },
                          ],
            );
            return resolveLocalizationRow({
                defaultRow,
                additionalRows,
                effectiveLanguageCode,
            }).displayName;
        }

        return undefined;
    })();
    return {
        firstName: row.firstName,
        lastName: optionalText(row.lastName),
        roleLabel: optionalText(row.roleLabel),
        affiliationName,
        email: optionalText(row.email),
        websiteUrl: optionalUrl(row.websiteUrl),
        imageUrl: toImageUrl({
            imagePath: row.imagePath,
            isFullImagePath: row.isFullImagePath,
            baseImageServiceUrl,
        }),
    };
}

async function buildProjectShellPayload({
    db,
    baseImageServiceUrl,
    project,
    currentDisplayLanguage,
}: ProjectPageServiceParams & {
    project: ProjectBaseRow;
    currentDisplayLanguage: SupportedDisplayLanguageCodes;
}): Promise<ProjectShellPayload> {
    const defaultLanguageCode = getProjectDefaultDisplayLanguage({
        sourceLanguageCode: project.sourceLanguageCode,
    });
    const additionalLanguageCodes = await fetchProjectTargetLanguages({
        db,
        projectId: project.projectId,
    });
    const displayLanguage = currentDisplayLanguage;
    const { preferredContentLanguage } = resolvePreferredContentLanguage({
        displayLanguage,
        defaultContentLanguage: defaultLanguageCode,
        configuredContentLanguages: additionalLanguageCodes,
    });
    const languageCandidateSet = getLanguageCandidateSet({
        effectiveLanguageCode: preferredContentLanguage,
        defaultLanguageCode,
    });
    const [content, bannerImageUrl, aggregateCounts, attributions, contact] =
        await Promise.all([
            fetchResolvedProjectContent({
                db,
                project,
                languageCandidateSet,
                effectiveLanguageCode: preferredContentLanguage,
                additionalLanguageCodes,
            }),
            fetchResolvedBannerImageUrl({
                db,
                project,
                languageCandidateSet,
                effectiveLanguageCode: preferredContentLanguage,
                baseImageServiceUrl,
            }),
            fetchProjectAggregateCounts({ db, projectId: project.projectId }),
            fetchProjectAttributions({
                db,
                projectId: project.projectId,
                effectiveLanguageCode: preferredContentLanguage,
                defaultLanguageCode,
                baseImageServiceUrl,
            }),
            fetchProjectContact({
                db,
                projectId: project.projectId,
                baseImageServiceUrl,
                effectiveLanguageCode: preferredContentLanguage,
                defaultLanguageCode,
            }),
        ]);
    const projectPayload: ProjectPageProject = {
        slug: project.projectSlug,
        title: content.title,
        subtitle: content.subtitle,
        bodyHtml: content.bodyHtml,
        originalContent: content.originalContent,
        machineTranslation: content.machineTranslation,
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
        languageOptions: buildProjectPageLanguageOptions({
            projectSupportedLanguageCodes: supportedLanguageCodes,
        }),
    };
}

async function buildProjectPagePayload({
    db,
    baseImageServiceUrl,
    request,
    currentDisplayLanguage,
}: ProjectPageServiceParams & {
    request: FetchProjectPageRequest;
    currentDisplayLanguage: SupportedDisplayLanguageCodes;
}): Promise<FetchProjectPageResponse> {
    const project = await fetchProjectBaseBySlug({
        db,
        projectSlug: request.projectSlug,
    });
    const [projectShellPayload, activityPage] = await Promise.all([
        buildProjectShellPayload({
            db,
            baseImageServiceUrl,
            project,
            currentDisplayLanguage,
        }),
        fetchProjectActivities({
            db,
            projectId: project.projectId,
            displayLanguage: currentDisplayLanguage,
            activityLimit: request.activityLimit,
            activityCursor: request.activityCursor,
        }),
    ]);

    return {
        ...projectShellPayload,
        activities: activityPage.activities,
        nextActivityCursor: activityPage.nextActivityCursor,
    };
}

export async function fetchProjectPage({
    db,
    baseImageServiceUrl,
    request,
    currentDisplayLanguage,
}: ProjectPageServiceParams & {
    request: FetchProjectPageRequest;
    currentDisplayLanguage: SupportedDisplayLanguageCodes;
}): Promise<FetchProjectPageResponse> {
    return await buildProjectPagePayload({
        db,
        baseImageServiceUrl,
        request,
        currentDisplayLanguage,
    });
}

export async function fetchProjectPageActivities({
    db,
    currentDisplayLanguage,
    request,
}: {
    db: PostgresJsDatabase;
    request: FetchProjectPageActivitiesRequest;
    currentDisplayLanguage: SupportedDisplayLanguageCodes;
}): Promise<FetchProjectPageActivitiesResponse> {
    const project = await fetchProjectBaseBySlug({
        db,
        projectSlug: request.projectSlug,
    });
    return await fetchProjectActivities({
        db,
        projectId: project.projectId,
        displayLanguage: currentDisplayLanguage,
        activityLimit: request.activityLimit,
        activityCursor: request.activityCursor,
    });
}

export async function fetchProjectConversationPage({
    db,
    baseImageServiceUrl,
    request,
    currentDisplayLanguage,
}: ProjectPageServiceParams & {
    request: FetchProjectConversationPageRequest;
    currentDisplayLanguage: SupportedDisplayLanguageCodes;
}): Promise<FetchProjectConversationPageResponse> {
    const project = await fetchProjectBaseBySlug({
        db,
        projectSlug: request.projectSlug,
    });

    await assertVisibleProjectConversation({
        db,
        projectId: project.projectId,
        conversationSlugId: request.conversationSlugId,
    });

    return await buildProjectShellPayload({
        db,
        baseImageServiceUrl,
        project,
        currentDisplayLanguage,
    });
}
