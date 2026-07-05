import { httpErrors } from "@fastify/sensible";
import {
    and,
    eq,
    inArray,
    isNotNull,
    isNull,
    type TablesRelationalConfig,
} from "drizzle-orm";
import type { PgQueryResultHKT, PgTransaction } from "drizzle-orm/pg-core";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    conversationTable,
    conversationTranslationTargetLanguageTable,
    contentTranslationWorkTable,
    organizationTable,
    projectContentBannerLocalizationTable,
    projectContentTranslationTable,
    projectContactTable,
    projectContentTable,
    projectExternalOrganizationTable,
    projectExternalOrganizationLocalizationTable,
    projectOrganizationAttributionTable,
    projectOrganizationOwnershipTable,
    projectTable,
    projectTranslationTargetLanguageTable,
} from "@/shared-backend/schema.js";
import type {
    AdminProjectOption,
    CreateProjectAttributionRequest,
    CreateProjectFailureReason,
    CreateProjectRequest,
    CreateProjectResponse,
    GetAllProjectsResponse,
    GetProjectDetailsResponse,
    GetProjectOptionsResponse,
    UpdateProjectRequest,
    UpdateProjectResponse,
    UpdateProjectExternalOrganizationLocalizationRequest,
    UpdateProjectExternalOrganizationLocalizationResponse,
    UpdateProjectLanguageSettingsRequest,
    UpdateProjectLanguageSettingsResponse,
    UpdateProjectSlugResponse,
} from "@/shared/types/dto.js";
import type { SupportedDisplayLanguageCodes } from "@/shared/languages.js";
import type { GoogleCloudCredentials } from "@/shared-backend/googleCloudAuth.js";
import { normalizeEmail } from "@/shared/types/zod-email.js";
import { htmlToCountedText } from "@/shared/shared.js";
import {
    contentLanguageMetadataUpdateValues,
    type ContentLanguageMetadata,
    UNKNOWN_CONTENT_LANGUAGE_METADATA,
    resolveContentLanguageMetadata,
} from "../contentLanguageMetadata.js";
import {
    buildConversationLanguageDetectionCorpus,
    buildGoogleConversationLanguageDetectionCorpus,
} from "../conversationLanguage.js";
import { hasActiveDynamicTranslationEntitlementForOrganizations } from "../premiumEntitlement.js";
import { getImplicitDefaultDisplayLanguage } from "../projectLanguage.js";
import {
    getProjectTranslationTargetLanguagePolicy,
    normalizeProjectLanguageSettings,
    sourceLanguageToDisplayLanguage,
} from "../translationLanguageSetting.js";
import { normalizeUserRichTextInput } from "../richText.js";

type ProjectOrganizationAttributionRole =
    CreateProjectAttributionRequest["role"];

type UpdateProjectLanguageSettingsServiceResponse =
    | (Extract<UpdateProjectLanguageSettingsResponse, { success: true }> & {
          projectId: number;
      })
    | Extract<UpdateProjectLanguageSettingsResponse, { success: false }>;

interface OrganizationRecord {
    id: number;
    slug: string;
    directoryVisibility: "listed" | "unlisted";
}

interface RealAttribution {
    source: "organization";
    role: ProjectOrganizationAttributionRole;
    organizationId: number;
}

interface ExternalAttribution {
    source: "external";
    role: ProjectOrganizationAttributionRole;
    defaultLanguageCode: SupportedDisplayLanguageCodes;
    displayName: string;
    description: string | null;
    imagePath: string | null;
    isFullImagePath: boolean;
    websiteUrl: string | null;
    additionalLocalizations: ExternalAttributionLocalization[];
}

interface ExternalAttributionLocalization {
    languageCode: SupportedDisplayLanguageCodes;
    displayName: string;
    description: string;
    imagePath: string | null;
    isFullImagePath: boolean;
    websiteUrl: string | null;
}

interface SanitizedProjectBody {
    body: string | undefined;
    bodyPlainText: string;
}

type ProjectContentLocalization =
    CreateProjectRequest["contentLocalizations"][number];
interface SanitizedProjectContentLocalization {
    languageCode: SupportedDisplayLanguageCodes;
    projectTitle: string | null;
    subtitle: string | null;
    body: string | null;
    bodyPlainText: string | undefined;
    bannerPath: string | null;
    bannerIsFullPath: boolean;
}
interface SanitizedProjectContentTextLocalization
    extends SanitizedProjectContentLocalization {
    projectTitle: string;
}
type ProjectDatabase =
    | PostgresJsDatabase
    | PgTransaction<
          PgQueryResultHKT,
          Record<string, unknown>,
          TablesRelationalConfig
      >;

type AttributionToInsert = RealAttribution | ExternalAttribution;

function getStringErrorProperty({
    error,
    property,
}: {
    error: unknown;
    property: string;
}): string | undefined {
    if (typeof error !== "object" || error === null) {
        return undefined;
    }

    const descriptor = Object.getOwnPropertyDescriptor(error, property);
    if (
        descriptor !== undefined &&
        "value" in descriptor &&
        typeof descriptor.value === "string"
    ) {
        return descriptor.value;
    }

    return undefined;
}

function isUniqueViolation(error: unknown): boolean {
    return (
        getStringErrorProperty({
            error,
            property: "code",
        }) === "23505"
    );
}

function getUniqueViolationReason(error: unknown): CreateProjectFailureReason {
    const constraint = getStringErrorProperty({
        error,
        property: "constraint",
    });
    if (constraint?.includes("slug") === true) {
        return "project_slug_already_exists";
    }

    return "project_conflict";
}

function uniqueStrings(values: string[]): string[] {
    return Array.from(new Set(values));
}

function normalizeOptionalString(value: string | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed === undefined || trimmed === "" ? null : trimmed;
}

function sanitizeProjectBody({
    body,
    bodyPlainText,
}: {
    body: string | undefined;
    bodyPlainText: string | undefined;
}): SanitizedProjectBody {
    if (body === undefined) {
        return { body: undefined, bodyPlainText: "" };
    }

    if (bodyPlainText === undefined) {
        throw httpErrors.badRequest(
            "Project body plain text is required when project body HTML is provided",
        );
    }

    try {
        const normalizationResult = normalizeUserRichTextInput({
            html: body,
            plainText: bodyPlainText,
            validationMode: "conversation",
            logLabel: "[ProjectPlainText] Frontend/backend plain text mismatch",
        });
        if (!normalizationResult.success) {
            throw httpErrors.badRequest(normalizationResult.reason);
        }

        const normalizedBody = normalizeOptionalString(
            normalizationResult.content.html,
        );
        if (normalizedBody === null) {
            return { body: undefined, bodyPlainText: "" };
        }

        return {
            body: normalizedBody,
            bodyPlainText: normalizationResult.content.plainText,
        };
    } catch (error) {
        if (error instanceof Error) {
            throw httpErrors.badRequest(error.message);
        }
        throw httpErrors.badRequest("Error while sanitizing project body");
    }
}

function buildProjectBannerLocalizationRows({
    projectContentId,
    localizations,
}: {
    projectContentId: number;
    localizations: readonly SanitizedProjectContentLocalization[];
}): {
    projectContentId: number;
    languageCode: SupportedDisplayLanguageCodes;
    bannerPath: string;
    bannerIsFullPath: boolean;
}[] {
    return localizations.flatMap((localization) => {
        if (localization.bannerPath === null) {
            return [];
        }

        return [
            {
                projectContentId,
                languageCode: localization.languageCode,
                bannerPath: localization.bannerPath,
                bannerIsFullPath: localization.bannerIsFullPath,
            },
        ];
    });
}

function sanitizeProjectContentLocalizations({
    localizations,
    targetLanguageCodes,
    localizedSubtitleRequired,
    localizedBodyRequired,
}: {
    localizations: readonly ProjectContentLocalization[];
    targetLanguageCodes: readonly SupportedDisplayLanguageCodes[];
    localizedSubtitleRequired: boolean;
    localizedBodyRequired: boolean;
}): SanitizedProjectContentLocalization[] {
    const targetLanguageCodeSet = new Set(targetLanguageCodes);
    return localizations.map((localization) => {
        if (!targetLanguageCodeSet.has(localization.languageCode)) {
            throw httpErrors.badRequest(
                "Project content localization language must be one of the active project target languages",
            );
        }

        const projectTitle = normalizeOptionalString(localization.projectTitle);
        const sanitizedBody = sanitizeProjectBody({
            body: localization.body,
            bodyPlainText: localization.bodyPlainText,
        });
        const subtitle = normalizeOptionalString(localization.subtitle);
        if (
            projectTitle === null &&
            (subtitle !== null || sanitizedBody.body !== undefined)
        ) {
            throw httpErrors.badRequest(
                "Project content localization title is required when localized subtitle or body is set",
            );
        }
        if (projectTitle !== null && localizedSubtitleRequired && subtitle === null) {
            throw httpErrors.badRequest(
                "Project content localization subtitle is required when the project subtitle is set",
            );
        }
        if (
            projectTitle !== null &&
            localizedBodyRequired &&
            sanitizedBody.body === undefined
        ) {
            throw httpErrors.badRequest(
                "Project content localization body is required when the project body is set",
            );
        }

        return {
            languageCode: localization.languageCode,
            projectTitle,
            subtitle,
            body: sanitizedBody.body ?? null,
            bodyPlainText:
                sanitizedBody.body === undefined
                    ? undefined
                    : sanitizedBody.bodyPlainText,
            bannerPath: normalizeOptionalString(localization.bannerPath),
            bannerIsFullPath: localization.bannerIsFullPath,
        };
    });
}

function assertCompleteManualProjectContentLocalizations({
    targetLanguageCodes,
    localizations,
    sourceSubtitleRequired,
    sourceBodyRequired,
}: {
    targetLanguageCodes: readonly SupportedDisplayLanguageCodes[];
    localizations: readonly SanitizedProjectContentLocalization[];
    sourceSubtitleRequired: boolean;
    sourceBodyRequired: boolean;
}): void {
    const localizationsByLanguageCode = new Map(
        localizations.map((localization) => [
            localization.languageCode,
            localization,
        ]),
    );

    for (const languageCode of targetLanguageCodes) {
        const localization = localizationsByLanguageCode.get(languageCode);
        if (
            localization?.projectTitle === undefined ||
            localization.projectTitle === null ||
            (sourceSubtitleRequired && localization.subtitle === null) ||
            (sourceBodyRequired && localization.body === null)
        ) {
            throw httpErrors.badRequest(
                "Complete project content localization is required for every active target language when dynamic translation is off",
            );
        }
    }
}

function projectBodyRequiresLocalization(
    bodyPlainText: string | null | undefined,
): boolean {
    return normalizeOptionalString(bodyPlainText ?? undefined) !== null;
}

function projectSubtitleRequiresLocalization(
    subtitle: string | null | undefined,
): boolean {
    return normalizeOptionalString(subtitle ?? undefined) !== null;
}

async function hasCompleteStoredManualProjectContentLocalizations({
    db,
    projectContentId,
    targetLanguageCodes,
    sourceSubtitleRequired,
    sourceBodyRequired,
}: {
    db: ProjectDatabase;
    projectContentId: number;
    targetLanguageCodes: readonly SupportedDisplayLanguageCodes[];
    sourceSubtitleRequired: boolean;
    sourceBodyRequired: boolean;
}): Promise<boolean> {
    if (targetLanguageCodes.length === 0) {
        return true;
    }

    const rows = await db
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
                    projectContentId,
                ),
                eq(projectContentTranslationTable.sourceKind, "manual"),
                isNull(projectContentTranslationTable.deletedAt),
                inArray(
                    projectContentTranslationTable.displayLanguageCode,
                    targetLanguageCodes,
                ),
            ),
        );
    const rowsByLanguageCode = new Map(
        rows.map((row) => [row.languageCode, row]),
    );

    return targetLanguageCodes.every((languageCode) => {
        const row = rowsByLanguageCode.get(languageCode);
        return (
            row !== undefined &&
            row.title.trim() !== "" &&
            (!sourceSubtitleRequired ||
                projectSubtitleRequiresLocalization(row.subtitle)) &&
            (!sourceBodyRequired ||
                projectBodyRequiresLocalization(htmlToCountedText(row.body ?? "")))
        );
    });
}

async function syncProjectContentLocalizations({
    db,
    projectContentId,
    localizations,
    targetLanguageCodes,
    sourceLanguageMetadata,
    now,
}: {
    db: ProjectDatabase;
    projectContentId: number;
    localizations: readonly SanitizedProjectContentLocalization[];
    targetLanguageCodes: readonly SupportedDisplayLanguageCodes[];
    sourceLanguageMetadata: ContentLanguageMetadata;
    now: Date;
}): Promise<void> {
    const textLocalizations = localizations.filter(
        (localization): localization is SanitizedProjectContentTextLocalization =>
            localization.projectTitle !== null,
    );
    const textLocalizationLanguageCodeSet = new Set(
        textLocalizations.map((localization) => localization.languageCode),
    );
    const omittedTargetLanguageCodes = targetLanguageCodes.filter(
        (languageCode) => !textLocalizationLanguageCodeSet.has(languageCode),
    );
    if (omittedTargetLanguageCodes.length > 0) {
        await db
            .update(projectContentTranslationTable)
            .set({ deletedAt: now, updatedAt: now })
            .where(
                and(
                    eq(
                        projectContentTranslationTable.projectContentId,
                        projectContentId,
                    ),
                    eq(projectContentTranslationTable.sourceKind, "manual"),
                    inArray(
                        projectContentTranslationTable.displayLanguageCode,
                        omittedTargetLanguageCodes,
                    ),
                    isNull(projectContentTranslationTable.deletedAt),
                ),
            );
    }

    for (const localization of textLocalizations) {
        await db
            .insert(projectContentTranslationTable)
            .values({
                projectContentId,
                displayLanguageCode: localization.languageCode,
                translatedTitle: localization.projectTitle,
                translatedSubtitle: localization.subtitle,
                translatedBody: localization.body,
                translatedBodyPlainText: localization.bodyPlainText ?? null,
                sourceKind: "manual",
                ...contentLanguageMetadataUpdateValues(sourceLanguageMetadata),
            })
            .onConflictDoUpdate({
                target: [
                    projectContentTranslationTable.projectContentId,
                    projectContentTranslationTable.displayLanguageCode,
                ],
                targetWhere: isNull(projectContentTranslationTable.deletedAt),
                set: {
                    translatedTitle: localization.projectTitle,
                    translatedSubtitle: localization.subtitle,
                    translatedBody: localization.body,
                    translatedBodyPlainText: localization.bodyPlainText ?? null,
                    sourceKind: "manual",
                    deletedAt: null,
                    ...contentLanguageMetadataUpdateValues(
                        sourceLanguageMetadata,
                    ),
                    updatedAt: now,
                },
            });

        await db
            .update(contentTranslationWorkTable)
            .set({
                status: "completed",
                leaseOwner: null,
                leaseToken: null,
                leaseExpiresAt: null,
                lastErrorCode: null,
                lastErrorMessage: null,
                completedAt: now,
                failedAt: null,
                updatedAt: now,
            })
            .where(
                and(
                    eq(contentTranslationWorkTable.sourceKind, "project"),
                    eq(
                        contentTranslationWorkTable.projectContentId,
                        projectContentId,
                    ),
                    eq(
                        contentTranslationWorkTable.displayLanguageCode,
                        localization.languageCode,
                    ),
                ),
            );
    }
}

async function deleteMachineProjectContentTranslations({
    db,
    projectContentId,
    now,
}: {
    db: ProjectDatabase;
    projectContentId: number;
    now: Date;
}): Promise<void> {
    await db
        .update(projectContentTranslationTable)
        .set({ deletedAt: now, updatedAt: now })
        .where(
            and(
                eq(projectContentTranslationTable.projectContentId, projectContentId),
                eq(projectContentTranslationTable.sourceKind, "machine"),
                isNull(projectContentTranslationTable.deletedAt),
            ),
        );
}

async function syncProjectBannerLocalizations({
    db,
    projectContentId,
    localizations,
    targetLanguageCodes,
    now,
}: {
    db: ProjectDatabase;
    projectContentId: number;
    localizations: readonly SanitizedProjectContentLocalization[];
    targetLanguageCodes: readonly SupportedDisplayLanguageCodes[];
    now: Date;
}): Promise<void> {
    const requestedRows = buildProjectBannerLocalizationRows({
        projectContentId,
        localizations,
    });
    const requestedRowsByLanguageCode = new Map(
        requestedRows.map((row) => [row.languageCode, row]),
    );
    const activeRows =
        targetLanguageCodes.length === 0
            ? []
            : await db
                  .select({
                      id: projectContentBannerLocalizationTable.id,
                      languageCode:
                          projectContentBannerLocalizationTable.languageCode,
                  })
                  .from(projectContentBannerLocalizationTable)
                  .where(
                      and(
                          eq(
                              projectContentBannerLocalizationTable.projectContentId,
                              projectContentId,
                          ),
                          inArray(
                              projectContentBannerLocalizationTable.languageCode,
                              targetLanguageCodes,
                          ),
                          isNull(projectContentBannerLocalizationTable.deletedAt),
                      ),
                  );
    const activeRowsByLanguageCode = new Map(
        activeRows.map((row) => [row.languageCode, row]),
    );

    for (const activeRow of activeRows) {
        if (!requestedRowsByLanguageCode.has(activeRow.languageCode)) {
            await db
                .update(projectContentBannerLocalizationTable)
                .set({ deletedAt: now, updatedAt: now })
                .where(
                    eq(projectContentBannerLocalizationTable.id, activeRow.id),
                );
        }
    }

    for (const requestedRow of requestedRows) {
        const activeRow = activeRowsByLanguageCode.get(
            requestedRow.languageCode,
        );
        if (activeRow === undefined) {
            await db
                .insert(projectContentBannerLocalizationTable)
                .values(requestedRow);
            continue;
        }

        await db
            .update(projectContentBannerLocalizationTable)
            .set({
                bannerPath: requestedRow.bannerPath,
                bannerIsFullPath: requestedRow.bannerIsFullPath,
                deletedAt: null,
                updatedAt: now,
            })
            .where(eq(projectContentBannerLocalizationTable.id, activeRow.id));
    }
}

async function resolveProjectContentLanguageMetadata({
    projectTitle,
    subtitle,
    bodyPlainText,
    googleCloudCredentials,
    useGoogleLanguageDetection,
}: {
    projectTitle: string;
    subtitle: string | null | undefined;
    bodyPlainText: string;
    googleCloudCredentials: GoogleCloudCredentials | undefined;
    useGoogleLanguageDetection: boolean;
}): Promise<ContentLanguageMetadata> {
    const projectBodyPlainText = [subtitle ?? "", bodyPlainText]
        .map((text) => text.trim())
        .filter((text) => text.length > 0)
        .join("\n\n");

    return await resolveContentLanguageMetadata({
        text: buildConversationLanguageDetectionCorpus({
            conversationTitle: projectTitle,
            bodyPlainText: projectBodyPlainText,
        }),
        googleText: buildGoogleConversationLanguageDetectionCorpus({
            conversationTitle: projectTitle,
            bodyPlainText: projectBodyPlainText,
        }),
        googleCloudCredentials,
        useGoogleLanguageDetection,
    });
}

function projectLanguageSettingsUseDynamicTranslationFeature({
    languageSettings,
}: {
    languageSettings: {
        dynamicTranslationEnabled: boolean;
        targetLanguageCodes: readonly string[];
    };
}): boolean {
    return (
        languageSettings.dynamicTranslationEnabled ||
        languageSettings.targetLanguageCodes.length > 0
    );
}

async function refreshInheritedConversationLanguageSettings({
    db,
    projectId,
    dynamicTranslationEnabled,
    targetLanguageCodes,
    now,
}: {
    db: ProjectDatabase;
    projectId: number;
    dynamicTranslationEnabled: boolean;
    targetLanguageCodes: readonly SupportedDisplayLanguageCodes[];
    now: Date;
}): Promise<void> {
    const inheritedConversationRows = await db
        .select({ conversationId: conversationTable.id })
        .from(conversationTable)
        .where(
            and(
                eq(conversationTable.projectId, projectId),
                eq(conversationTable.languageSettingsSource, "project_inherited"),
                isNotNull(conversationTable.currentContentId),
            ),
        );
    const conversationIds = inheritedConversationRows.map(
        (row) => row.conversationId,
    );
    if (conversationIds.length === 0) {
        return;
    }

    await db
        .update(conversationTable)
        .set({ dynamicTranslationEnabled, updatedAt: now })
        .where(inArray(conversationTable.id, conversationIds));

    await db
        .update(conversationTranslationTargetLanguageTable)
        .set({ deletedAt: now })
        .where(
            and(
                inArray(
                    conversationTranslationTargetLanguageTable.conversationId,
                    conversationIds,
                ),
                isNull(conversationTranslationTargetLanguageTable.deletedAt),
            ),
        );

    if (targetLanguageCodes.length === 0) {
        return;
    }

    await db.insert(conversationTranslationTargetLanguageTable).values(
        conversationIds.flatMap((conversationId) =>
            targetLanguageCodes.map((languageCode) => ({
                conversationId,
                languageCode,
                createdAt: now,
            })),
        ),
    );
}

async function canUseDynamicTranslationForProjectOwnerSlugs({
    db,
    ownerOrganizationSlugs,
    organizationsBySlug,
    now,
}: {
    db: PostgresJsDatabase;
    ownerOrganizationSlugs: string[];
    organizationsBySlug: Map<string, OrganizationRecord>;
    now: Date;
}): Promise<boolean> {
    const ownerOrganizationIds = ownerOrganizationSlugs.map((slug) =>
        getOrganizationId({ organizationsBySlug, slug }),
    );
    return await hasActiveDynamicTranslationEntitlementForOrganizations({
        db,
        organizationIds: ownerOrganizationIds,
        now,
    });
}

function getNextSortOrder({
    role,
    sortOrdersByRole,
}: {
    role: ProjectOrganizationAttributionRole;
    sortOrdersByRole: Map<ProjectOrganizationAttributionRole, number>;
}): number {
    const sortOrder = sortOrdersByRole.get(role) ?? 0;
    sortOrdersByRole.set(role, sortOrder + 1);
    return sortOrder;
}

async function getListedOrganizationsBySlug({
    db,
    slugs,
}: {
    db: PostgresJsDatabase;
    slugs: string[];
}): Promise<
    | { success: true; organizationsBySlug: Map<string, OrganizationRecord> }
    | {
          success: false;
          reason: "unknown_organization_slug" | "organization_not_listed";
          organizationSlugs: string[];
      }
> {
    const uniqueSlugs = uniqueStrings(slugs);
    if (uniqueSlugs.length === 0) {
        return { success: true, organizationsBySlug: new Map() };
    }

    const rows = await db
        .select({
            id: organizationTable.id,
            slug: organizationTable.slug,
            directoryVisibility: organizationTable.directoryVisibility,
        })
        .from(organizationTable)
        .where(
            and(
                inArray(organizationTable.slug, uniqueSlugs),
                isNull(organizationTable.deletedAt),
            ),
        );

    const organizationsBySlug = new Map(
        rows.map((organization) => [organization.slug, organization]),
    );
    const missingSlugs = uniqueSlugs.filter(
        (slug) => !organizationsBySlug.has(slug),
    );
    if (missingSlugs.length > 0) {
        return {
            success: false,
            reason: "unknown_organization_slug",
            organizationSlugs: missingSlugs,
        };
    }

    const unlistedSlugs = rows
        .filter((organization) => organization.directoryVisibility !== "listed")
        .map((organization) => organization.slug);
    if (unlistedSlugs.length > 0) {
        return {
            success: false,
            reason: "organization_not_listed",
            organizationSlugs: unlistedSlugs,
        };
    }

    return { success: true, organizationsBySlug };
}

function getOrganizationId({
    organizationsBySlug,
    slug,
}: {
    organizationsBySlug: Map<string, OrganizationRecord>;
    slug: string;
}): number {
    const organization = organizationsBySlug.get(slug);
    if (organization === undefined) {
        throw httpErrors.internalServerError(
            `Organization slug was not loaded before project creation: ${slug}`,
        );
    }

    return organization.id;
}

function buildAttributions({
    requestedAttributions,
    organizationsBySlug,
}: {
    requestedAttributions: CreateProjectAttributionRequest[];
    organizationsBySlug: Map<string, OrganizationRecord>;
}): AttributionToInsert[] {
    const attributions: AttributionToInsert[] = [];
    const realAttributionKeys = new Set<string>();

    const addRealAttribution = ({
        role,
        organizationSlug,
    }: {
        role: ProjectOrganizationAttributionRole;
        organizationSlug: string;
    }): void => {
        const organizationId = getOrganizationId({
            organizationsBySlug,
            slug: organizationSlug,
        });
        const key = `${role}:${String(organizationId)}`;
        if (realAttributionKeys.has(key)) {
            return;
        }

        realAttributionKeys.add(key);
        attributions.push({
            source: "organization",
            role,
            organizationId,
        });
    };

    for (const attribution of requestedAttributions) {
        if (attribution.source === "organization") {
            addRealAttribution({
                role: attribution.role,
                organizationSlug: attribution.organizationSlug,
            });
            continue;
        }

        attributions.push({
            source: "external",
            role: attribution.role,
            defaultLanguageCode: attribution.defaultLanguageCode,
            displayName: attribution.displayName,
            description: normalizeOptionalString(attribution.description),
            imagePath: normalizeOptionalString(attribution.imagePath),
            isFullImagePath: attribution.isFullImagePath,
            websiteUrl: normalizeOptionalString(attribution.websiteUrl),
            additionalLocalizations: attribution.additionalLocalizations.map(
                (localization) => ({
                    languageCode: localization.languageCode,
                    displayName: localization.displayName,
                    description: localization.description,
                    imagePath: normalizeOptionalString(localization.imagePath),
                    isFullImagePath: localization.isFullImagePath,
                    websiteUrl: normalizeOptionalString(
                        localization.websiteUrl,
                    ),
                }),
            ),
        });
    }

    return attributions;
}

export async function createProject({
    db,
    data,
    googleCloudCredentials,
}: {
    db: PostgresJsDatabase;
    data: CreateProjectRequest;
    googleCloudCredentials: GoogleCloudCredentials | undefined;
}): Promise<CreateProjectResponse> {
    const existingProject = await db
        .select({ id: projectTable.id })
        .from(projectTable)
        .where(
            and(
                eq(projectTable.slug, data.projectSlug),
                isNull(projectTable.deletedAt),
            ),
        )
        .limit(1);
    if (existingProject.at(0) !== undefined) {
        return {
            success: false,
            reason: "project_slug_already_exists",
        };
    }

    const ownerOrganizationSlugs = uniqueStrings(data.ownerOrganizationSlugs);
    const attributionOrganizationSlugs = data.attributions.flatMap(
        (attribution) =>
            attribution.source === "organization"
                ? [attribution.organizationSlug]
                : [],
    );
    const contactOrganizationSlugs =
        data.contact?.organizationSlug === undefined
            ? []
            : [data.contact.organizationSlug];
    const organizationLookup = await getListedOrganizationsBySlug({
        db,
        slugs: [
            ...ownerOrganizationSlugs,
            ...attributionOrganizationSlugs,
            ...contactOrganizationSlugs,
        ],
    });
    if (!organizationLookup.success) {
        return organizationLookup;
    }

    if (
        projectLanguageSettingsUseDynamicTranslationFeature({
            languageSettings: data.languageSettings,
        }) &&
        !(await canUseDynamicTranslationForProjectOwnerSlugs({
            db,
            ownerOrganizationSlugs,
            organizationsBySlug: organizationLookup.organizationsBySlug,
            now: new Date(),
        }))
    ) {
        return {
            success: false,
            reason: "dynamic_translation_entitlement_required",
        };
    }

    const attributions = buildAttributions({
        requestedAttributions: data.attributions,
        organizationsBySlug: organizationLookup.organizationsBySlug,
    });

    const sanitizedProjectBody = sanitizeProjectBody({
        body: data.body,
        bodyPlainText: data.bodyPlainText,
    });
    const bodyPlainText = sanitizedProjectBody.bodyPlainText;
    const projectLanguageMetadata = await resolveProjectContentLanguageMetadata(
        {
            projectTitle: data.projectTitle,
            subtitle: data.subtitle,
            bodyPlainText,
            googleCloudCredentials,
            useGoogleLanguageDetection:
                data.languageSettings.dynamicTranslationEnabled,
        },
    );
    const normalizedLanguageSettings = normalizeProjectLanguageSettings({
        languageSettings: data.languageSettings,
        canUseDynamicTranslation: true,
    });
    const sourceSubtitleRequired = projectSubtitleRequiresLocalization(
        data.subtitle,
    );
    const sourceBodyRequired = projectBodyRequiresLocalization(bodyPlainText);
    const contentLocalizations = sanitizeProjectContentLocalizations({
        localizations: data.contentLocalizations,
        targetLanguageCodes: normalizedLanguageSettings.targetLanguageCodes,
        localizedSubtitleRequired: sourceSubtitleRequired,
        localizedBodyRequired: sourceBodyRequired,
    });
    if (!normalizedLanguageSettings.dynamicTranslationEnabled) {
        assertCompleteManualProjectContentLocalizations({
            targetLanguageCodes: normalizedLanguageSettings.targetLanguageCodes,
            localizations: contentLocalizations,
            sourceSubtitleRequired,
            sourceBodyRequired,
        });
    }

    try {
        return await db.transaction(async (tx) => {
            const insertedProjects = await tx
                .insert(projectTable)
                .values({
                    slug: data.projectSlug,
                    title: data.projectTitle,
                    directoryVisibility: "listed",
                    autoProvisionedForOrganizationId: null,
                    currentContentId: null,
                    dynamicTranslationEnabled:
                        normalizedLanguageSettings.dynamicTranslationEnabled,
                })
                .returning({ projectId: projectTable.id });
            const insertedProject = insertedProjects.at(0);
            if (insertedProject === undefined) {
                throw httpErrors.internalServerError(
                    "Failed to create project",
                );
            }

            const insertedContents = await tx
                .insert(projectContentTable)
                .values({
                    projectId: insertedProject.projectId,
                    title: data.projectTitle,
                    subtitle: normalizeOptionalString(data.subtitle),
                    body: sanitizedProjectBody.body ?? null,
                    bodyPlainText,
                    bannerPath: normalizeOptionalString(data.bannerPath),
                    bannerIsFullPath: data.bannerIsFullPath,
                    ...contentLanguageMetadataUpdateValues(
                        projectLanguageMetadata,
                    ),
                })
                .returning({ contentId: projectContentTable.id });
            const insertedContent = insertedContents.at(0);
            if (insertedContent === undefined) {
                throw httpErrors.internalServerError(
                    "Failed to create project content",
                );
            }

            await syncProjectBannerLocalizations({
                db: tx,
                projectContentId: insertedContent.contentId,
                localizations: contentLocalizations,
                targetLanguageCodes: normalizedLanguageSettings.targetLanguageCodes,
                now: new Date(),
            });

            await syncProjectContentLocalizations({
                db: tx,
                projectContentId: insertedContent.contentId,
                localizations: contentLocalizations,
                targetLanguageCodes: normalizedLanguageSettings.targetLanguageCodes,
                sourceLanguageMetadata: projectLanguageMetadata,
                now: new Date(),
            });

            await tx
                .update(projectTable)
                .set({ currentContentId: insertedContent.contentId })
                .where(eq(projectTable.id, insertedProject.projectId));

            await tx.insert(projectOrganizationOwnershipTable).values(
                ownerOrganizationSlugs.map((organizationSlug) => ({
                    projectId: insertedProject.projectId,
                    organizationId: getOrganizationId({
                        organizationsBySlug:
                            organizationLookup.organizationsBySlug,
                        slug: organizationSlug,
                    }),
                })),
            );

            if (normalizedLanguageSettings.targetLanguageCodes.length > 0) {
                await tx.insert(projectTranslationTargetLanguageTable).values(
                    normalizedLanguageSettings.targetLanguageCodes.map(
                        (languageCode) => ({
                            projectId: insertedProject.projectId,
                            languageCode,
                        }),
                    ),
                );
            }

            const sortOrdersByRole = new Map<
                ProjectOrganizationAttributionRole,
                number
            >();
            for (const attribution of attributions) {
                const sortOrder = getNextSortOrder({
                    role: attribution.role,
                    sortOrdersByRole,
                });

                if (attribution.source === "organization") {
                    await tx
                        .insert(projectOrganizationAttributionTable)
                        .values({
                            projectId: insertedProject.projectId,
                            role: attribution.role,
                            sortOrder,
                            organizationId: attribution.organizationId,
                            externalOrganizationId: null,
                        });
                    continue;
                }

                const insertedExternalOrganizations = await tx
                    .insert(projectExternalOrganizationTable)
                    .values({
                        projectId: insertedProject.projectId,
                        displayName: attribution.displayName,
                        defaultLanguageCode: attribution.defaultLanguageCode,
                        description: attribution.description,
                        imagePath: attribution.imagePath,
                        isFullImagePath: attribution.isFullImagePath,
                        websiteUrl: attribution.websiteUrl,
                    })
                    .returning({
                        externalOrganizationId:
                            projectExternalOrganizationTable.id,
                    });
                const insertedExternalOrganization =
                    insertedExternalOrganizations.at(0);
                if (insertedExternalOrganization === undefined) {
                    throw httpErrors.internalServerError(
                        "Failed to create external organization",
                    );
                }

                await tx
                    .insert(projectExternalOrganizationLocalizationTable)
                    .values({
                        externalOrganizationId:
                            insertedExternalOrganization.externalOrganizationId,
                        languageCode: attribution.defaultLanguageCode,
                        displayName: attribution.displayName,
                        description: attribution.description ?? "",
                        websiteUrl: attribution.websiteUrl,
                        imagePath: attribution.imagePath,
                        isFullImagePath: attribution.isFullImagePath,
                    });

                const additionalLocalizations =
                    attribution.additionalLocalizations
                        .filter(
                            (localization) =>
                                localization.languageCode !==
                                attribution.defaultLanguageCode,
                        )
                        .map((localization) => ({
                            externalOrganizationId:
                                insertedExternalOrganization.externalOrganizationId,
                            languageCode: localization.languageCode,
                            displayName: localization.displayName,
                            description: localization.description,
                            websiteUrl: localization.websiteUrl,
                            imagePath: localization.imagePath,
                            isFullImagePath: localization.isFullImagePath,
                        }));
                if (additionalLocalizations.length > 0) {
                    await tx
                        .insert(projectExternalOrganizationLocalizationTable)
                        .values(additionalLocalizations)
                        .onConflictDoNothing();
                }

                await tx.insert(projectOrganizationAttributionTable).values({
                    projectId: insertedProject.projectId,
                    role: attribution.role,
                    sortOrder,
                    organizationId: null,
                    externalOrganizationId:
                        insertedExternalOrganization.externalOrganizationId,
                });
            }

            if (data.contact !== undefined) {
                await tx.insert(projectContactTable).values({
                    projectId: insertedProject.projectId,
                    firstName: data.contact.firstName.trim(),
                    lastName: normalizeOptionalString(data.contact.lastName),
                    roleLabel: normalizeOptionalString(data.contact.roleLabel),
                    email:
                        data.contact.email === undefined
                            ? null
                            : normalizeEmail(data.contact.email),
                    websiteUrl: normalizeOptionalString(data.contact.websiteUrl),
                    imagePath: normalizeOptionalString(data.contact.imagePath),
                    isFullImagePath: data.contact.isFullImagePath,
                    organizationId:
                        data.contact.organizationSlug === undefined
                            ? null
                            : getOrganizationId({
                                  organizationsBySlug:
                                      organizationLookup.organizationsBySlug,
                                  slug: data.contact.organizationSlug,
                              }),
                    externalOrganizationId: null,
                });
            }

            return {
                success: true,
                projectId: insertedProject.projectId,
                projectSlug: data.projectSlug,
            };
        });
    } catch (error) {
        if (isUniqueViolation(error)) {
            return {
                success: false,
                reason: getUniqueViolationReason(error),
            };
        }

        throw error;
    }
}

export async function getAllProjects({
    db,
    projectSlug,
}: {
    db: PostgresJsDatabase;
    projectSlug?: string;
}): Promise<GetAllProjectsResponse> {
    const projectWhereClause =
        projectSlug === undefined
            ? and(
                  eq(projectTable.directoryVisibility, "listed"),
                  isNull(projectTable.deletedAt),
              )
            : and(
                  eq(projectTable.directoryVisibility, "listed"),
                  isNull(projectTable.deletedAt),
                  eq(projectTable.slug, projectSlug),
              );
    const projectRows = await db
        .select({
            projectId: projectTable.id,
            projectContentId: projectContentTable.id,
            projectSlug: projectTable.slug,
            projectTitle: projectTable.title,
            subtitle: projectContentTable.subtitle,
            body: projectContentTable.body,
            bodyPlainText: projectContentTable.bodyPlainText,
            bannerPath: projectContentTable.bannerPath,
            bannerIsFullPath: projectContentTable.bannerIsFullPath,
            dynamicTranslationEnabled: projectTable.dynamicTranslationEnabled,
        })
        .from(projectTable)
        .leftJoin(
            projectContentTable,
            eq(projectContentTable.id, projectTable.currentContentId),
        )
        .where(projectWhereClause);

    const projectIds = projectRows.map((project) => project.projectId);
    const projectContentIds = projectRows.flatMap((project) =>
        project.projectContentId === null ? [] : [project.projectContentId],
    );
    const targetLanguageRows =
        projectIds.length === 0
            ? []
            : await db
                  .select({
                      projectId:
                          projectTranslationTargetLanguageTable.projectId,
                      languageCode:
                          projectTranslationTargetLanguageTable.languageCode,
                  })
                  .from(projectTranslationTargetLanguageTable)
                  .where(
                      and(
                          inArray(
                              projectTranslationTargetLanguageTable.projectId,
                              projectIds,
                          ),
                          isNull(projectTranslationTargetLanguageTable.deletedAt),
                      ),
                  );

    const ownerRows =
        projectIds.length === 0
            ? []
            : await db
                  .select({
                      projectId: projectOrganizationOwnershipTable.projectId,
                      organizationSlug: organizationTable.slug,
                  })
                  .from(projectOrganizationOwnershipTable)
                  .innerJoin(
                      organizationTable,
                      eq(
                          organizationTable.id,
                          projectOrganizationOwnershipTable.organizationId,
                      ),
                  )
                  .where(
                      and(
                          inArray(
                              projectOrganizationOwnershipTable.projectId,
                              projectIds,
                          ),
                          isNull(projectOrganizationOwnershipTable.deletedAt),
                      ),
                  );

    const bannerLocalizationRows =
        projectContentIds.length === 0
            ? []
            : await db
                  .select({
                      projectContentId:
                          projectContentBannerLocalizationTable.projectContentId,
                      languageCode:
                          projectContentBannerLocalizationTable.languageCode,
                      bannerPath:
                          projectContentBannerLocalizationTable.bannerPath,
                      bannerIsFullPath:
                          projectContentBannerLocalizationTable.bannerIsFullPath,
                  })
                  .from(projectContentBannerLocalizationTable)
                  .where(
                      and(
                          inArray(
                              projectContentBannerLocalizationTable.projectContentId,
                              projectContentIds,
                          ),
                          isNull(
                              projectContentBannerLocalizationTable.deletedAt,
                          ),
                      ),
                  );

    const contentLocalizationRows =
        projectContentIds.length === 0
            ? []
            : await db
                  .select({
                      projectContentId:
                          projectContentTranslationTable.projectContentId,
                      languageCode:
                          projectContentTranslationTable.displayLanguageCode,
                      projectTitle:
                          projectContentTranslationTable.translatedTitle,
                      subtitle:
                          projectContentTranslationTable.translatedSubtitle,
                      body: projectContentTranslationTable.translatedBody,
                      sourceKind: projectContentTranslationTable.sourceKind,
                  })
                  .from(projectContentTranslationTable)
                  .where(
                      and(
                          inArray(
                              projectContentTranslationTable.projectContentId,
                              projectContentIds,
                          ),
                          isNull(projectContentTranslationTable.deletedAt),
                      ),
                  );

    const attributionRows =
        projectIds.length === 0
            ? []
            : await db
                  .select({
                      projectId: projectOrganizationAttributionTable.projectId,
                      role: projectOrganizationAttributionTable.role,
                      sortOrder: projectOrganizationAttributionTable.sortOrder,
                      organizationSlug: organizationTable.slug,
                      externalOrganizationId:
                          projectExternalOrganizationTable.id,
                      defaultLanguageCode:
                          projectExternalOrganizationTable.defaultLanguageCode,
                      displayName: projectExternalOrganizationTable.displayName,
                      description: projectExternalOrganizationTable.description,
                      imagePath: projectExternalOrganizationTable.imagePath,
                      isFullImagePath:
                          projectExternalOrganizationTable.isFullImagePath,
                      websiteUrl: projectExternalOrganizationTable.websiteUrl,
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
                              projectIds,
                          ),
                          isNull(projectOrganizationAttributionTable.deletedAt),
                      ),
                  );

    const externalOrganizationIds = attributionRows.flatMap((attribution) =>
        attribution.externalOrganizationId === null
            ? []
            : [attribution.externalOrganizationId],
    );
    const externalLocalizationRows =
        externalOrganizationIds.length === 0
            ? []
            : await db
                  .select({
                      externalOrganizationId:
                          projectExternalOrganizationLocalizationTable.externalOrganizationId,
                      languageCode:
                          projectExternalOrganizationLocalizationTable.languageCode,
                      displayName:
                          projectExternalOrganizationLocalizationTable.displayName,
                      description:
                          projectExternalOrganizationLocalizationTable.description,
                      websiteUrl:
                          projectExternalOrganizationLocalizationTable.websiteUrl,
                      imagePath:
                          projectExternalOrganizationLocalizationTable.imagePath,
                      isFullImagePath:
                          projectExternalOrganizationLocalizationTable.isFullImagePath,
                  })
                  .from(projectExternalOrganizationLocalizationTable)
                  .where(
                      and(
                          inArray(
                              projectExternalOrganizationLocalizationTable.externalOrganizationId,
                              externalOrganizationIds,
                          ),
                          isNull(
                              projectExternalOrganizationLocalizationTable.deletedAt,
                          ),
                      ),
                  );

    const contactRows =
        projectIds.length === 0
            ? []
            : await db
                  .select({
                      projectId: projectContactTable.projectId,
                      firstName: projectContactTable.firstName,
                      lastName: projectContactTable.lastName,
                      roleLabel: projectContactTable.roleLabel,
                      email: projectContactTable.email,
                      websiteUrl: projectContactTable.websiteUrl,
                      imagePath: projectContactTable.imagePath,
                      isFullImagePath: projectContactTable.isFullImagePath,
                      organizationSlug: organizationTable.slug,
                  })
                  .from(projectContactTable)
                  .leftJoin(
                      organizationTable,
                      eq(
                          organizationTable.id,
                          projectContactTable.organizationId,
                      ),
                  )
                  .where(
                      and(
                          inArray(projectContactTable.projectId, projectIds),
                          isNull(projectContactTable.deletedAt),
                      ),
                  );

    const additionalLanguagesByProjectId = new Map<
        number,
        GetAllProjectsResponse["projectList"][number]["languageSettings"]["targetLanguageCodes"]
    >();
    for (const targetLanguage of targetLanguageRows) {
        const targetLanguageCodes =
            additionalLanguagesByProjectId.get(targetLanguage.projectId) ?? [];
        targetLanguageCodes.push(targetLanguage.languageCode);
        additionalLanguagesByProjectId.set(
            targetLanguage.projectId,
            targetLanguageCodes,
        );
    }
    const activeLanguageCodesByProjectContentId = new Map<
        number,
        Set<SupportedDisplayLanguageCodes>
    >();
    for (const project of projectRows) {
        if (project.projectContentId === null) {
            continue;
        }

        activeLanguageCodesByProjectContentId.set(
            project.projectContentId,
            new Set(additionalLanguagesByProjectId.get(project.projectId) ?? []),
        );
    }

    const bannerLocalizationsByProjectContentId = new Map<
        number,
        {
            languageCode: SupportedDisplayLanguageCodes;
            bannerPath: string;
            bannerIsFullPath: boolean;
        }[]
    >();
    for (const localization of bannerLocalizationRows) {
        const bannerLocalizations =
            bannerLocalizationsByProjectContentId.get(
                localization.projectContentId,
            ) ?? [];
        bannerLocalizations.push({
            languageCode: localization.languageCode,
            bannerPath: localization.bannerPath,
            bannerIsFullPath: localization.bannerIsFullPath,
        });
        bannerLocalizationsByProjectContentId.set(
            localization.projectContentId,
            bannerLocalizations,
        );
    }

    const contentLocalizationsByProjectContentId = new Map<
        number,
        GetAllProjectsResponse["projectList"][number]["contentLocalizations"]
    >();
    const machineContentLocalizationsByProjectContentId = new Map<
        number,
        GetAllProjectsResponse["projectList"][number]["machineContentLocalizations"]
    >();
    for (const localization of contentLocalizationRows) {
        if (
            activeLanguageCodesByProjectContentId
                .get(localization.projectContentId)
                ?.has(localization.languageCode) !== true
        ) {
            continue;
        }

        const contentLocalizationsBySourceKind =
            localization.sourceKind === "manual"
                ? contentLocalizationsByProjectContentId
                : machineContentLocalizationsByProjectContentId;
        const contentLocalizations =
            contentLocalizationsBySourceKind.get(localization.projectContentId) ??
            [];
        const bannerLocalization = bannerLocalizationsByProjectContentId
            .get(localization.projectContentId)
            ?.find(
                (banner) => banner.languageCode === localization.languageCode,
            );
        contentLocalizations.push({
            languageCode: localization.languageCode,
            projectTitle: localization.projectTitle,
            subtitle: localization.subtitle ?? undefined,
            body: localization.body ?? undefined,
            bodyPlainText:
                localization.body === null
                    ? undefined
                    : htmlToCountedText(localization.body),
            bannerPath: bannerLocalization?.bannerPath,
            bannerIsFullPath: bannerLocalization?.bannerIsFullPath ?? false,
        });
        contentLocalizationsBySourceKind.set(
            localization.projectContentId,
            contentLocalizations,
        );
    }

    for (const [projectContentId, bannerLocalizations] of bannerLocalizationsByProjectContentId) {
        const activeLanguageCodes = activeLanguageCodesByProjectContentId.get(projectContentId);
        const contentLocalizations =
            contentLocalizationsByProjectContentId.get(projectContentId) ?? [];
        const existingLocalizationLanguageCodes = new Set(
            contentLocalizations.map((localization) => localization.languageCode),
        );
        for (const bannerLocalization of bannerLocalizations) {
            if (
                activeLanguageCodes?.has(bannerLocalization.languageCode) !== true ||
                existingLocalizationLanguageCodes.has(bannerLocalization.languageCode)
            ) {
                continue;
            }

            contentLocalizations.push({
                languageCode: bannerLocalization.languageCode,
                bannerPath: bannerLocalization.bannerPath,
                bannerIsFullPath: bannerLocalization.bannerIsFullPath,
            });
        }
        contentLocalizationsByProjectContentId.set(
            projectContentId,
            contentLocalizations,
        );
    }

    const ownerSlugsByProjectId = new Map<number, string[]>();
    for (const owner of ownerRows) {
        const ownerSlugs = ownerSlugsByProjectId.get(owner.projectId) ?? [];
        ownerSlugs.push(owner.organizationSlug);
        ownerSlugsByProjectId.set(owner.projectId, ownerSlugs);
    }

    const localizationsByExternalOrganizationId = new Map<
        number,
        Extract<
            GetAllProjectsResponse["projectList"][number]["attributions"][number],
            { source: "external" }
        >["additionalLocalizations"]
    >();
    for (const localization of externalLocalizationRows) {
        const localizations =
            localizationsByExternalOrganizationId.get(
                localization.externalOrganizationId,
            ) ?? [];
        localizations.push({
            languageCode: localization.languageCode,
            displayName: localization.displayName,
            description: localization.description,
            websiteUrl: localization.websiteUrl ?? undefined,
            imagePath: localization.imagePath ?? undefined,
            isFullImagePath: localization.isFullImagePath,
        });
        localizationsByExternalOrganizationId.set(
            localization.externalOrganizationId,
            localizations,
        );
    }

    const attributionsByProjectId = new Map<
        number,
        GetAllProjectsResponse["projectList"][number]["attributions"]
    >();
    for (const attribution of attributionRows.toSorted(
        (first, second) => first.sortOrder - second.sortOrder,
    )) {
        const attributions =
            attributionsByProjectId.get(attribution.projectId) ?? [];
        if (attribution.organizationSlug !== null) {
            attributions.push({
                source: "organization",
                role: attribution.role,
                organizationSlug: attribution.organizationSlug,
            });
        } else if (
            attribution.externalOrganizationId !== null &&
            attribution.defaultLanguageCode !== null &&
            attribution.displayName !== null
        ) {
            const additionalLocalizations = (
                localizationsByExternalOrganizationId.get(
                    attribution.externalOrganizationId,
                ) ?? []
            ).filter(
                (localization) =>
                    localization.languageCode !==
                    attribution.defaultLanguageCode,
            );
            attributions.push({
                source: "external",
                role: attribution.role,
                defaultLanguageCode: attribution.defaultLanguageCode,
                displayName: attribution.displayName,
                description: attribution.description ?? undefined,
                imagePath: attribution.imagePath ?? undefined,
                isFullImagePath: attribution.isFullImagePath ?? false,
                websiteUrl: attribution.websiteUrl ?? undefined,
                additionalLocalizations,
            });
        }
        attributionsByProjectId.set(attribution.projectId, attributions);
    }

    const contactsByProjectId = new Map(
        contactRows.map((contact) => [
            contact.projectId,
            {
                firstName: contact.firstName,
                lastName: contact.lastName ?? undefined,
                roleLabel: contact.roleLabel ?? undefined,
                email: contact.email ?? undefined,
                websiteUrl: contact.websiteUrl ?? undefined,
                imagePath: contact.imagePath ?? undefined,
                isFullImagePath: contact.isFullImagePath,
                organizationSlug: contact.organizationSlug ?? undefined,
            },
        ]),
    );

    return {
        projectList: projectRows.map((project) => ({
            projectSlug: project.projectSlug,
            projectTitle: project.projectTitle,
            ownerOrganizationSlugs:
                ownerSlugsByProjectId.get(project.projectId) ?? [],
            subtitle: project.subtitle ?? undefined,
            body: project.body ?? undefined,
            bodyPlainText: project.bodyPlainText ?? undefined,
            bannerPath: project.bannerPath ?? undefined,
            bannerIsFullPath: project.bannerIsFullPath ?? false,
            contentLocalizations:
                project.projectContentId === null
                    ? []
                    : (contentLocalizationsByProjectContentId.get(
                          project.projectContentId,
                      ) ?? []),
            machineContentLocalizations:
                project.projectContentId === null
                    ? []
                    : (machineContentLocalizationsByProjectContentId.get(
                          project.projectContentId,
                      ) ?? []),
            languageSettings: {
                dynamicTranslationEnabled: project.dynamicTranslationEnabled,
                targetLanguageCodes:
                    additionalLanguagesByProjectId.get(project.projectId) ?? [],
            },
            attributions: attributionsByProjectId.get(project.projectId) ?? [],
            contact: contactsByProjectId.get(project.projectId),
        })),
    };
}

export async function getProjectOptions({
    db,
}: {
    db: PostgresJsDatabase;
}): Promise<GetProjectOptionsResponse> {
    const projectList: AdminProjectOption[] = await db
        .select({
            projectSlug: projectTable.slug,
            projectTitle: projectTable.title,
        })
        .from(projectTable)
        .where(
            and(
                eq(projectTable.directoryVisibility, "listed"),
                isNull(projectTable.deletedAt),
            ),
        );

    return { projectList };
}

export async function getProjectDetails({
    db,
    projectSlug,
}: {
    db: PostgresJsDatabase;
    projectSlug: string;
}): Promise<GetProjectDetailsResponse> {
    const response = await getAllProjects({ db, projectSlug });
    return { project: response.projectList.at(0) };
}

export async function updateProjectSlug({
    db,
    currentProjectSlug,
    newProjectSlug,
}: {
    db: PostgresJsDatabase;
    currentProjectSlug: string;
    newProjectSlug: string;
}): Promise<UpdateProjectSlugResponse> {
    if (currentProjectSlug === newProjectSlug) {
        return { success: true };
    }

    try {
        const updatedRows = await db
            .update(projectTable)
            .set({ slug: newProjectSlug, updatedAt: new Date() })
            .where(
                and(
                    eq(projectTable.slug, currentProjectSlug),
                    isNull(projectTable.deletedAt),
                ),
            )
            .returning({ id: projectTable.id });
        if (updatedRows.length === 0) {
            return { success: false, reason: "project_not_found" };
        }

        return { success: true };
    } catch (error) {
        if (isUniqueViolation(error)) {
            return { success: false, reason: "project_slug_already_exists" };
        }

        throw error;
    }
}

export async function archiveProject({
    db,
    projectSlug,
}: {
    db: PostgresJsDatabase;
    projectSlug: string;
}): Promise<void> {
    const now = new Date();
    const updatedProjects = await db
        .update(projectTable)
        .set({
            directoryVisibility: "unlisted",
            deletedAt: now,
            updatedAt: now,
        })
        .where(
            and(
                eq(projectTable.slug, projectSlug),
                isNull(projectTable.deletedAt),
            ),
        )
        .returning({ projectId: projectTable.id });
    if (updatedProjects.length === 0) {
        throw httpErrors.notFound("Project not found");
    }
}

export async function updateProject({
    db,
    data,
    googleCloudCredentials,
}: {
    db: PostgresJsDatabase;
    data: UpdateProjectRequest;
    googleCloudCredentials: GoogleCloudCredentials | undefined;
}): Promise<UpdateProjectResponse> {
    const projectRows = await db
        .select({
            projectId: projectTable.id,
            currentContentId: projectTable.currentContentId,
            dynamicTranslationEnabled: projectTable.dynamicTranslationEnabled,
            currentTitle: projectContentTable.title,
            currentBody: projectContentTable.body,
            currentBodyPlainText: projectContentTable.bodyPlainText,
            sourceLanguageCode: projectContentTable.sourceLanguageCode,
            sourceRawLanguageCode: projectContentTable.sourceRawLanguageCode,
            sourceLanguageProvider: projectContentTable.sourceLanguageProvider,
            sourceLanguageConfidence:
                projectContentTable.sourceLanguageConfidence,
        })
        .from(projectTable)
        .leftJoin(
            projectContentTable,
            eq(projectContentTable.id, projectTable.currentContentId),
        )
        .where(
            and(
                eq(projectTable.slug, data.currentProjectSlug),
                isNull(projectTable.deletedAt),
            ),
        )
        .limit(1);
    const project = projectRows.at(0);
    if (project === undefined) {
        return { success: false, reason: "project_not_found" };
    }

    const ownerOrganizationSlugs = uniqueStrings(data.ownerOrganizationSlugs);
    const attributionOrganizationSlugs = data.attributions.flatMap(
        (attribution) =>
            attribution.source === "organization"
                ? [attribution.organizationSlug]
                : [],
    );
    const contactOrganizationSlugs =
        data.contact?.organizationSlug === undefined
            ? []
            : [data.contact.organizationSlug];
    const organizationLookup = await getListedOrganizationsBySlug({
        db,
        slugs: [
            ...ownerOrganizationSlugs,
            ...attributionOrganizationSlugs,
            ...contactOrganizationSlugs,
        ],
    });
    if (!organizationLookup.success) {
        return organizationLookup;
    }

    if (
        projectLanguageSettingsUseDynamicTranslationFeature({
            languageSettings: data.languageSettings,
        }) &&
        !(await canUseDynamicTranslationForProjectOwnerSlugs({
            db,
            ownerOrganizationSlugs,
            organizationsBySlug: organizationLookup.organizationsBySlug,
            now: new Date(),
        }))
    ) {
        return {
            success: false,
            reason: "dynamic_translation_entitlement_required",
        };
    }

    const attributions = buildAttributions({
        requestedAttributions: data.attributions,
        organizationsBySlug: organizationLookup.organizationsBySlug,
    });
    const sanitizedProjectBody = sanitizeProjectBody({
        body: data.body,
        bodyPlainText: data.bodyPlainText,
    });
    const bodyPlainText = sanitizedProjectBody.bodyPlainText;
    const currentBodyPlainText =
        project.currentBodyPlainText ??
        htmlToCountedText(project.currentBody ?? "");
    const languageTextChanged =
        project.currentContentId === null ||
        project.currentTitle !== data.projectTitle ||
        currentBodyPlainText !== bodyPlainText;
    const shouldRefreshLanguageMetadata =
        languageTextChanged ||
        (data.languageSettings.dynamicTranslationEnabled &&
            !project.dynamicTranslationEnabled);
    const projectLanguageMetadata = shouldRefreshLanguageMetadata
        ? await resolveProjectContentLanguageMetadata({
              projectTitle: data.projectTitle,
              subtitle: data.subtitle,
              bodyPlainText,
              googleCloudCredentials,
              useGoogleLanguageDetection:
                  data.languageSettings.dynamicTranslationEnabled,
          })
        : undefined;
    const normalizedLanguageSettings = normalizeProjectLanguageSettings({
        languageSettings: data.languageSettings,
        canUseDynamicTranslation: true,
    });
    const sourceSubtitleRequired = projectSubtitleRequiresLocalization(
        data.subtitle,
    );
    const sourceBodyRequired = projectBodyRequiresLocalization(bodyPlainText);
    const contentLocalizations = sanitizeProjectContentLocalizations({
        localizations: data.contentLocalizations,
        targetLanguageCodes: normalizedLanguageSettings.targetLanguageCodes,
        localizedSubtitleRequired: sourceSubtitleRequired,
        localizedBodyRequired: sourceBodyRequired,
    });
    if (!normalizedLanguageSettings.dynamicTranslationEnabled) {
        assertCompleteManualProjectContentLocalizations({
            targetLanguageCodes: normalizedLanguageSettings.targetLanguageCodes,
            localizations: contentLocalizations,
            sourceSubtitleRequired,
            sourceBodyRequired,
        });
    }
    const sourceLanguageMetadata: ContentLanguageMetadata =
        projectLanguageMetadata ?? {
            sourceLanguageCode: project.sourceLanguageCode,
            sourceRawLanguageCode: project.sourceRawLanguageCode,
            sourceLanguageProvider: project.sourceLanguageProvider,
            sourceLanguageConfidence: project.sourceLanguageConfidence,
        };

    try {
        await db.transaction(async (tx) => {
            const now = new Date();
            const updatedProjects = await tx
                .update(projectTable)
                .set({
                    slug: data.projectSlug,
                    title: data.projectTitle,
                    dynamicTranslationEnabled:
                        normalizedLanguageSettings.dynamicTranslationEnabled,
                    updatedAt: now,
                })
                .where(eq(projectTable.id, project.projectId))
                .returning({ projectId: projectTable.id });
            if (updatedProjects.length === 0) {
                throw httpErrors.notFound("Project not found");
            }

            if (project.currentContentId === null) {
                const insertedContents = await tx
                    .insert(projectContentTable)
                    .values({
                        projectId: project.projectId,
                        title: data.projectTitle,
                        subtitle: normalizeOptionalString(data.subtitle),
                        body: sanitizedProjectBody.body ?? null,
                        bodyPlainText,
                        bannerPath: normalizeOptionalString(data.bannerPath),
                        bannerIsFullPath: data.bannerIsFullPath,
                        ...contentLanguageMetadataUpdateValues(
                            projectLanguageMetadata ??
                                UNKNOWN_CONTENT_LANGUAGE_METADATA,
                        ),
                    })
                    .returning({ contentId: projectContentTable.id });
                const insertedContent = insertedContents.at(0);
                if (insertedContent === undefined) {
                    throw httpErrors.internalServerError(
                        "Failed to create project content",
                    );
                }
                await tx
                    .update(projectTable)
                    .set({ currentContentId: insertedContent.contentId })
                    .where(eq(projectTable.id, project.projectId));

                await syncProjectBannerLocalizations({
                    db: tx,
                    projectContentId: insertedContent.contentId,
                    localizations: contentLocalizations,
                    targetLanguageCodes:
                        normalizedLanguageSettings.targetLanguageCodes,
                    now,
                });

                await syncProjectContentLocalizations({
                    db: tx,
                    projectContentId: insertedContent.contentId,
                    localizations: contentLocalizations,
                    targetLanguageCodes:
                        normalizedLanguageSettings.targetLanguageCodes,
                    sourceLanguageMetadata:
                        projectLanguageMetadata ??
                        UNKNOWN_CONTENT_LANGUAGE_METADATA,
                    now,
                });
            } else {
                await tx
                    .update(projectContentTable)
                    .set({
                        title: data.projectTitle,
                        subtitle: normalizeOptionalString(data.subtitle),
                        body: sanitizedProjectBody.body ?? null,
                        bodyPlainText,
                        bannerPath: normalizeOptionalString(data.bannerPath),
                        bannerIsFullPath: data.bannerIsFullPath,
                        ...(projectLanguageMetadata === undefined
                            ? {}
                            : contentLanguageMetadataUpdateValues(
                                  projectLanguageMetadata,
                              )),
                    })
                    .where(
                        eq(projectContentTable.id, project.currentContentId),
                    );

                if (languageTextChanged) {
                    await deleteMachineProjectContentTranslations({
                        db: tx,
                        projectContentId: project.currentContentId,
                        now,
                    });
                }

                await syncProjectBannerLocalizations({
                    db: tx,
                    projectContentId: project.currentContentId,
                    localizations: contentLocalizations,
                    targetLanguageCodes:
                        normalizedLanguageSettings.targetLanguageCodes,
                    now,
                });

                await syncProjectContentLocalizations({
                    db: tx,
                    projectContentId: project.currentContentId,
                    localizations: contentLocalizations,
                    targetLanguageCodes:
                        normalizedLanguageSettings.targetLanguageCodes,
                    sourceLanguageMetadata,
                    now,
                });
            }

            await tx
                .update(projectOrganizationOwnershipTable)
                .set({ deletedAt: now })
                .where(
                    and(
                        eq(
                            projectOrganizationOwnershipTable.projectId,
                            project.projectId,
                        ),
                        isNull(projectOrganizationOwnershipTable.deletedAt),
                    ),
                );
            await tx.insert(projectOrganizationOwnershipTable).values(
                ownerOrganizationSlugs.map((organizationSlug) => ({
                    projectId: project.projectId,
                    organizationId: getOrganizationId({
                        organizationsBySlug:
                            organizationLookup.organizationsBySlug,
                        slug: organizationSlug,
                    }),
                })),
            );

            await tx
                .update(projectTranslationTargetLanguageTable)
                .set({ deletedAt: now })
                .where(
                    and(
                        eq(
                            projectTranslationTargetLanguageTable.projectId,
                            project.projectId,
                        ),
                        isNull(projectTranslationTargetLanguageTable.deletedAt),
                    ),
                );
            if (normalizedLanguageSettings.targetLanguageCodes.length > 0) {
                await tx.insert(projectTranslationTargetLanguageTable).values(
                    normalizedLanguageSettings.targetLanguageCodes.map(
                        (languageCode) => ({
                            projectId: project.projectId,
                            languageCode,
                        }),
                    ),
                );
            }

            const existingExternalOrganizationRows = await tx
                .select({ id: projectExternalOrganizationTable.id })
                .from(projectExternalOrganizationTable)
                .where(
                    and(
                        eq(
                            projectExternalOrganizationTable.projectId,
                            project.projectId,
                        ),
                        isNull(projectExternalOrganizationTable.deletedAt),
                    ),
                );
            const existingExternalOrganizationIds =
                existingExternalOrganizationRows.map(
                    (externalOrganization) => externalOrganization.id,
                );
            await tx
                .update(projectOrganizationAttributionTable)
                .set({ deletedAt: now })
                .where(
                    and(
                        eq(
                            projectOrganizationAttributionTable.projectId,
                            project.projectId,
                        ),
                        isNull(projectOrganizationAttributionTable.deletedAt),
                    ),
                );
            if (existingExternalOrganizationIds.length > 0) {
                await tx
                    .update(projectExternalOrganizationLocalizationTable)
                    .set({ deletedAt: now, updatedAt: now })
                    .where(
                        and(
                            inArray(
                                projectExternalOrganizationLocalizationTable.externalOrganizationId,
                                existingExternalOrganizationIds,
                            ),
                            isNull(
                                projectExternalOrganizationLocalizationTable.deletedAt,
                            ),
                        ),
                    );
                await tx
                    .update(projectExternalOrganizationTable)
                    .set({ deletedAt: now, updatedAt: now })
                    .where(
                        and(
                            inArray(
                                projectExternalOrganizationTable.id,
                                existingExternalOrganizationIds,
                            ),
                            isNull(projectExternalOrganizationTable.deletedAt),
                        ),
                    );
            }

            const sortOrdersByRole = new Map<
                ProjectOrganizationAttributionRole,
                number
            >();
            for (const attribution of attributions) {
                const sortOrder = getNextSortOrder({
                    role: attribution.role,
                    sortOrdersByRole,
                });

                if (attribution.source === "organization") {
                    await tx
                        .insert(projectOrganizationAttributionTable)
                        .values({
                            projectId: project.projectId,
                            role: attribution.role,
                            sortOrder,
                            organizationId: attribution.organizationId,
                            externalOrganizationId: null,
                        });
                    continue;
                }

                const insertedExternalOrganizations = await tx
                    .insert(projectExternalOrganizationTable)
                    .values({
                        projectId: project.projectId,
                        displayName: attribution.displayName,
                        defaultLanguageCode: attribution.defaultLanguageCode,
                        description: attribution.description,
                        imagePath: attribution.imagePath,
                        isFullImagePath: attribution.isFullImagePath,
                        websiteUrl: attribution.websiteUrl,
                    })
                    .returning({
                        externalOrganizationId:
                            projectExternalOrganizationTable.id,
                    });
                const insertedExternalOrganization =
                    insertedExternalOrganizations.at(0);
                if (insertedExternalOrganization === undefined) {
                    throw httpErrors.internalServerError(
                        "Failed to create external organization",
                    );
                }

                await tx
                    .insert(projectExternalOrganizationLocalizationTable)
                    .values({
                        externalOrganizationId:
                            insertedExternalOrganization.externalOrganizationId,
                        languageCode: attribution.defaultLanguageCode,
                        displayName: attribution.displayName,
                        description: attribution.description ?? "",
                        websiteUrl: attribution.websiteUrl,
                        imagePath: attribution.imagePath,
                        isFullImagePath: attribution.isFullImagePath,
                    });

                const additionalLocalizations =
                    attribution.additionalLocalizations
                        .filter(
                            (localization) =>
                                localization.languageCode !==
                                attribution.defaultLanguageCode,
                        )
                        .map((localization) => ({
                            externalOrganizationId:
                                insertedExternalOrganization.externalOrganizationId,
                            languageCode: localization.languageCode,
                            displayName: localization.displayName,
                            description: localization.description,
                            websiteUrl: localization.websiteUrl,
                            imagePath: localization.imagePath,
                            isFullImagePath: localization.isFullImagePath,
                        }));
                if (additionalLocalizations.length > 0) {
                    await tx
                        .insert(projectExternalOrganizationLocalizationTable)
                        .values(additionalLocalizations)
                        .onConflictDoNothing();
                }

                await tx.insert(projectOrganizationAttributionTable).values({
                    projectId: project.projectId,
                    role: attribution.role,
                    sortOrder,
                    organizationId: null,
                    externalOrganizationId:
                        insertedExternalOrganization.externalOrganizationId,
                });
            }

            await tx
                .update(projectContactTable)
                .set({ deletedAt: now, updatedAt: now })
                .where(
                    and(
                        eq(projectContactTable.projectId, project.projectId),
                        isNull(projectContactTable.deletedAt),
                    ),
                );
            if (data.contact !== undefined) {
                await tx.insert(projectContactTable).values({
                    projectId: project.projectId,
                    firstName: data.contact.firstName.trim(),
                    lastName: normalizeOptionalString(data.contact.lastName),
                    roleLabel: normalizeOptionalString(data.contact.roleLabel),
                    email:
                        data.contact.email === undefined
                            ? null
                            : normalizeEmail(data.contact.email),
                    websiteUrl: normalizeOptionalString(data.contact.websiteUrl),
                    imagePath: normalizeOptionalString(data.contact.imagePath),
                    isFullImagePath: data.contact.isFullImagePath,
                    organizationId:
                        data.contact.organizationSlug === undefined
                            ? null
                            : getOrganizationId({
                                  organizationsBySlug:
                                      organizationLookup.organizationsBySlug,
                                  slug: data.contact.organizationSlug,
                              }),
                    externalOrganizationId: null,
                });
            }
        });
    } catch (error) {
        if (isUniqueViolation(error)) {
            return {
                success: false,
                reason: getUniqueViolationReason(error),
            };
        }

        throw error;
    }

    return {
        success: true,
        projectId: project.projectId,
        projectSlug: data.projectSlug,
    };
}

export async function updateProjectLanguageSettings({
    db,
    data,
    googleCloudCredentials,
}: {
    db: PostgresJsDatabase;
    data: UpdateProjectLanguageSettingsRequest;
    googleCloudCredentials: GoogleCloudCredentials | undefined;
}): Promise<UpdateProjectLanguageSettingsServiceResponse> {
    const projectRows = await db
        .select({ projectId: projectTable.id })
        .from(projectTable)
        .where(
            and(
                eq(projectTable.slug, data.projectSlug),
                isNull(projectTable.deletedAt),
            ),
        )
        .limit(1);
    const project = projectRows.at(0);
    if (project === undefined) {
        return { success: false, reason: "project_not_found" };
    }

    const ownershipRows = await db
        .select({
            organizationId: projectOrganizationOwnershipTable.organizationId,
        })
        .from(projectOrganizationOwnershipTable)
        .where(
            and(
                eq(projectOrganizationOwnershipTable.projectId, project.projectId),
                isNull(projectOrganizationOwnershipTable.deletedAt),
            ),
        );

    if (
        projectLanguageSettingsUseDynamicTranslationFeature({
            languageSettings: data.languageSettings,
        }) &&
        !(await hasActiveDynamicTranslationEntitlementForOrganizations({
            db,
            organizationIds: ownershipRows.map((row) => row.organizationId),
            now: new Date(),
        }))
    ) {
        return {
            success: false,
            reason: "dynamic_translation_entitlement_required",
        };
    }

    const languageSettingsUpdated = await db.transaction(async (tx) => {
        const now = new Date();
        const currentContentRows = await tx
            .select({
                contentId: projectContentTable.id,
                title: projectContentTable.title,
                subtitle: projectContentTable.subtitle,
                body: projectContentTable.body,
                bodyPlainText: projectContentTable.bodyPlainText,
                sourceLanguageCode: projectContentTable.sourceLanguageCode,
            })
            .from(projectTable)
            .innerJoin(
                projectContentTable,
                eq(projectContentTable.id, projectTable.currentContentId),
            )
            .where(eq(projectTable.id, project.projectId))
            .limit(1);
        const currentContent = currentContentRows.at(0);
        let sourceLanguageMetadata: ContentLanguageMetadata | undefined;

        if (
            currentContent !== undefined &&
            data.languageSettings.dynamicTranslationEnabled
        ) {
            const bodyPlainText =
                currentContent.bodyPlainText ??
                htmlToCountedText(currentContent.body ?? "");
            sourceLanguageMetadata = await resolveProjectContentLanguageMetadata({
                projectTitle: currentContent.title,
                subtitle: currentContent.subtitle,
                bodyPlainText,
                googleCloudCredentials,
                useGoogleLanguageDetection: true,
            });
        }

        const normalizedLanguageSettings = normalizeProjectLanguageSettings({
            languageSettings: data.languageSettings,
            canUseDynamicTranslation: true,
        });

        if (!normalizedLanguageSettings.dynamicTranslationEnabled) {
            if (currentContent === undefined) {
                return false;
            }

            const bodyPlainText =
                currentContent.bodyPlainText ??
                htmlToCountedText(currentContent.body ?? "");
            if (
                !(await hasCompleteStoredManualProjectContentLocalizations({
                    db: tx,
                    projectContentId: currentContent.contentId,
                    targetLanguageCodes:
                        normalizedLanguageSettings.targetLanguageCodes,
                    sourceSubtitleRequired: projectSubtitleRequiresLocalization(
                        currentContent.subtitle,
                    ),
                    sourceBodyRequired:
                        projectBodyRequiresLocalization(bodyPlainText),
                }))
            ) {
                return false;
            }
        }

        await tx
            .update(projectTable)
            .set({
                dynamicTranslationEnabled:
                    normalizedLanguageSettings.dynamicTranslationEnabled,
                updatedAt: now,
            })
            .where(eq(projectTable.id, project.projectId));

        if (sourceLanguageMetadata !== undefined && currentContent !== undefined) {
            await tx
                .update(projectContentTable)
                .set(
                    contentLanguageMetadataUpdateValues(sourceLanguageMetadata),
                )
                .where(eq(projectContentTable.id, currentContent.contentId));
        }

        await tx
            .update(projectTranslationTargetLanguageTable)
            .set({ deletedAt: now })
            .where(
                and(
                    eq(
                        projectTranslationTargetLanguageTable.projectId,
                        project.projectId,
                    ),
                    isNull(projectTranslationTargetLanguageTable.deletedAt),
                ),
            );

        if (normalizedLanguageSettings.targetLanguageCodes.length > 0) {
            await tx.insert(projectTranslationTargetLanguageTable).values(
                normalizedLanguageSettings.targetLanguageCodes.map(
                    (languageCode) => ({
                        projectId: project.projectId,
                        languageCode,
                    }),
                ),
            );
        }

        const defaultLanguageCode =
            sourceLanguageToDisplayLanguage({
                sourceLanguageCode:
                    sourceLanguageMetadata?.sourceLanguageCode ??
                    currentContent?.sourceLanguageCode ??
                    null,
            }) ?? getImplicitDefaultDisplayLanguage();
        const inheritedTargetLanguagePolicy = getProjectTranslationTargetLanguagePolicy({
            languageSettings: {
                dynamicTranslationEnabled:
                    normalizedLanguageSettings.dynamicTranslationEnabled,
                defaultLanguageCode,
                targetLanguageCodes: normalizedLanguageSettings.targetLanguageCodes,
            },
        });
        await refreshInheritedConversationLanguageSettings({
            db: tx,
            projectId: project.projectId,
            dynamicTranslationEnabled:
                inheritedTargetLanguagePolicy.dynamicTranslationEnabled,
            targetLanguageCodes:
                inheritedTargetLanguagePolicy.effectiveTargetLanguageCodes,
            now,
        });

        return true;
    });

    if (!languageSettingsUpdated) {
        return {
            success: false,
            reason: "missing_manual_project_content_localization",
        };
    }

    return { success: true, projectId: project.projectId };
}

export async function updateProjectExternalOrganizationLocalization({
    db,
    data,
}: {
    db: PostgresJsDatabase;
    data: UpdateProjectExternalOrganizationLocalizationRequest;
}): Promise<UpdateProjectExternalOrganizationLocalizationResponse> {
    const imagePath =
        data.imagePath === undefined || data.imagePath.trim() === ""
            ? null
            : data.imagePath;
    const websiteUrl = data.websiteUrl ?? null;

    await db.transaction(async (tx) => {
        const now = new Date();
        await tx
            .insert(projectExternalOrganizationLocalizationTable)
            .values({
                externalOrganizationId: data.externalOrganizationId,
                languageCode: data.languageCode,
                displayName: data.displayName,
                description: data.description,
                websiteUrl,
                imagePath,
                isFullImagePath: data.isFullImagePath,
            })
            .onConflictDoUpdate({
                target: [
                    projectExternalOrganizationLocalizationTable.externalOrganizationId,
                    projectExternalOrganizationLocalizationTable.languageCode,
                ],
                targetWhere: isNull(
                    projectExternalOrganizationLocalizationTable.deletedAt,
                ),
                set: {
                    displayName: data.displayName,
                    description: data.description,
                    websiteUrl,
                    imagePath,
                    isFullImagePath: data.isFullImagePath,
                    deletedAt: null,
                    updatedAt: now,
                },
            });

        if (data.setAsDefault) {
            await tx
                .update(projectExternalOrganizationTable)
                .set({
                    defaultLanguageCode: data.languageCode,
                    displayName: data.displayName,
                    description: data.description,
                    websiteUrl,
                    imagePath,
                    isFullImagePath: data.isFullImagePath,
                    updatedAt: now,
                })
                .where(
                    and(
                        eq(
                            projectExternalOrganizationTable.id,
                            data.externalOrganizationId,
                        ),
                        isNull(projectExternalOrganizationTable.deletedAt),
                    ),
                );
        }
    });

    return { success: true };
}
