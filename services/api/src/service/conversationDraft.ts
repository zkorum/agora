import { httpErrors } from "@fastify/sensible";
import {
    and,
    desc,
    eq,
    exists,
    inArray,
    isNotNull,
    isNull,
    lt,
    or,
    sql,
} from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { z } from "zod";
import {
    getPrimaryDatabase,
    type PostgresTransaction,
} from "@/shared-backend/db.js";
import {
    conversationDraftTable as draftTable,
    conversationTable,
    organizationMembershipTable,
    organizationTable,
    projectOrganizationOwnershipTable,
    projectTable,
    userTable,
} from "@/shared-backend/schema.js";
import type { SupportedDisplayLanguageCodes } from "@/shared/languages.js";
import { organizationRolesWithCapability } from "@/shared/organizationAccess.js";
import { Dto } from "@/shared/types/dto.js";
import {
    parseDraftPublication,
    prepareDraftContent,
    readDraftContent,
    type DraftContent,
} from "./conversationDraftContent.js";
import type { createConversationWriteService } from "./conversationWrite.js";
import {
    getProjectLanguageSettings,
    lockConversationCreateTarget,
} from "./projectAccess.js";
import type { InheritableProjectLanguageSettingsInput } from "./translationLanguageSetting.js";

type DraftRow = typeof draftTable.$inferSelect;
type DraftMutation = z.infer<typeof Dto.mutateConversationDraftRequest>;
type DraftProjectTarget = { projectSlug: string } | { projectId: number };
type DraftChange =
    | { kind: "save"; content: DraftContent }
    | { kind: "discard" };
interface AuthorizedRequest<T> {
    userId: string;
    request: T;
}

const createRoles = organizationRolesWithCapability("conversation_create");
const summaryColumns = {
    id: draftTable.id,
    revision: draftTable.revision,
    conversationType: draftTable.conversationType,
    createdAt: draftTable.createdAt,
    updatedAt: draftTable.updatedAt,
};
const activeDraft = and(
    isNull(draftTable.deletedAt),
    isNull(draftTable.publishedAt),
);

function draftNotFound() {
    return httpErrors.notFound("Conversation draft not found");
}

function checkRevision({
    revision,
    expectedRevision,
}: {
    revision: number;
    expectedRevision: number;
}) {
    if (revision !== expectedRevision) {
        throw httpErrors.conflict("Conversation draft revision changed");
    }
}

function toSummary({
    draft,
    projectSlug,
    conversationTitle,
}: {
    draft: Pick<DraftRow, keyof typeof summaryColumns>;
    projectSlug: string;
    conversationTitle: string | undefined;
}): z.infer<typeof Dto.conversationDraftSummary> {
    return {
        id: draft.id,
        revision: draft.revision,
        conversationType: draft.conversationType,
        createdAt: draft.createdAt.toISOString(),
        updatedAt: draft.updatedAt.toISOString(),
        projectSlug,
        conversationTitle,
    };
}

function toDraft({
    draft,
    projectSlug,
}: {
    draft: Pick<DraftRow, keyof typeof summaryColumns | "content">;
    projectSlug: string;
}): z.infer<typeof Dto.conversationDraft> {
    const parsed = readDraftContent(draft);
    return {
        ...toSummary({
            draft,
            projectSlug,
            conversationTitle: parsed.conversationTitle,
        }),
        content: parsed,
    };
}

function eligibleOwners({
    db,
    userId,
}: {
    db: PostgresJsDatabase;
    userId: string;
}) {
    return db
        .select({
            organizationId: organizationTable.id,
            organizationSlug: organizationTable.slug,
            isPersonalOrganization:
                sql<boolean>`${isNotNull(organizationTable.autoProvisionedForUserId)}`.as(
                    "is_personal_organization",
                ),
        })
        .from(projectOrganizationOwnershipTable)
        .innerJoin(
            organizationTable,
            eq(
                organizationTable.id,
                projectOrganizationOwnershipTable.organizationId,
            ),
        )
        .innerJoin(
            organizationMembershipTable,
            eq(
                organizationMembershipTable.organizationId,
                organizationTable.id,
            ),
        )
        .innerJoin(
            userTable,
            eq(userTable.id, organizationMembershipTable.userId),
        )
        .where(
            and(
                eq(
                    projectOrganizationOwnershipTable.projectId,
                    projectTable.id,
                ),
                isNull(projectOrganizationOwnershipTable.deletedAt),
                isNull(organizationTable.deletedAt),
                eq(organizationMembershipTable.userId, userId),
                isNull(organizationMembershipTable.deletedAt),
                inArray(organizationMembershipTable.role, createRoles),
                eq(userTable.isDeleted, false),
                isNull(userTable.authRestrictedAt),
            ),
        );
}

function canAccessProject(params: { db: PostgresJsDatabase; userId: string }) {
    return and(isNull(projectTable.deletedAt), exists(eligibleOwners(params)));
}

async function getDraftProjectScope({
    db,
    userId,
    target,
}: {
    db: PostgresJsDatabase;
    userId: string;
    target: DraftProjectTarget;
}) {
    const owner = eligibleOwners({ db, userId }).as("eligible_draft_owner");
    const owners = await db
        .select({
            projectId: projectTable.id,
            projectSlug: projectTable.slug,
            participationMode: projectTable.participationMode,
            organizationId: owner.organizationId,
            organizationSlug: owner.organizationSlug,
            isPersonalOrganization: owner.isPersonalOrganization,
        })
        .from(projectTable)
        // Each row is one eligible owner of this single project.
        .innerJoinLateral(owner, sql`true`)
        .where(
            and(
                isNull(projectTable.deletedAt),
                "projectId" in target
                    ? eq(projectTable.id, target.projectId)
                    : eq(projectTable.slug, target.projectSlug),
            ),
        )
        .orderBy(owner.organizationId);
    const first = owners.at(0);
    if (first === undefined) throw draftNotFound();
    return { project: first, owners };
}

async function lockDraftProject({
    tx,
    userId,
    target,
}: {
    tx: PostgresTransaction;
    userId: string;
    target: DraftProjectTarget;
}) {
    const { project } = await getDraftProjectScope({ db: tx, userId, target });
    if (
        !(await lockConversationCreateTarget({
            db: tx,
            userId,
            target: project,
        }))
    ) {
        throw draftNotFound();
    }
    // Use a fresh SELECT after waiting on account/organization/project locks.
    const locked = await getDraftProjectScope({ db: tx, userId, target });
    if (locked.project.projectId !== project.projectId) throw draftNotFound();
    return locked.project;
}

async function lockDraft({
    tx,
    draftId,
}: {
    tx: PostgresTransaction;
    draftId: string;
}) {
    const state = (
        await tx
            .select({
                revision: draftTable.revision,
                conversationType: draftTable.conversationType,
                publishedAt: draftTable.publishedAt,
                publishedConversationId: draftTable.publishedConversationId,
            })
            .from(draftTable)
            .where(
                and(eq(draftTable.id, draftId), isNull(draftTable.deletedAt)),
            )
            .for("update")
    ).at(0);
    if (state === undefined) throw draftNotFound();
    return state;
}

async function replayPublication({
    db,
    userId,
    projectId,
    publishedConversationId,
}: {
    db: PostgresJsDatabase;
    userId: string;
    projectId: number;
    publishedConversationId: number | null;
}) {
    if (publishedConversationId === null) throw draftNotFound();
    const published = (
        await db
            .select({ conversationSlugId: conversationTable.slugId })
            .from(conversationTable)
            .innerJoin(
                projectTable,
                eq(projectTable.id, conversationTable.projectId),
            )
            .where(
                and(
                    eq(conversationTable.id, publishedConversationId),
                    eq(projectTable.id, projectId),
                    canAccessProject({ db, userId }),
                    isNull(conversationTable.deletedAt),
                    isNotNull(conversationTable.currentContentId),
                ),
            )
    ).at(0);
    if (published === undefined) throw draftNotFound();
    return published;
}

function sameProjectLanguageSettings({
    before,
    after,
}: {
    before: InheritableProjectLanguageSettingsInput;
    after: InheritableProjectLanguageSettingsInput;
}): boolean {
    return (
        before.dynamicTranslationEnabled === after.dynamicTranslationEnabled &&
        before.defaultLanguageCode === after.defaultLanguageCode &&
        before.targetLanguageCodes.toSorted().join(",") ===
            after.targetLanguageCodes.toSorted().join(",")
    );
}

export function createConversationDraftService({
    db,
    createConversation,
}: {
    db: PostgresJsDatabase;
    createConversation: ReturnType<
        typeof createConversationWriteService
    >["create"];
}) {
    const primary = getPrimaryDatabase(db);

    async function create({
        request,
        userId,
    }: AuthorizedRequest<z.infer<typeof Dto.createConversationDraftRequest>>) {
        return await primary.transaction(async (tx) => {
            const { projectId, projectSlug } = await lockDraftProject({
                tx,
                userId,
                target: request,
            });
            const [draft] = await tx
                .insert(draftTable)
                .values({
                    projectId,
                    createdByUserId: userId,
                    conversationType: request.conversationType,
                })
                .returning({ ...summaryColumns, content: draftTable.content });
            return toDraft({ draft, projectSlug });
        });
    }

    async function list({
        request: { projectSlug, before, limit },
        userId,
    }: AuthorizedRequest<
        z.infer<typeof Dto.listConversationDraftsRequest>
    >): Promise<z.infer<typeof Dto.listConversationDraftsResponse>> {
        const cursorTime =
            before === undefined ? undefined : new Date(before.createdAt);
        const older =
            before === undefined || cursorTime === undefined
                ? undefined
                : or(
                      lt(draftTable.createdAt, cursorTime),
                      and(
                          eq(draftTable.createdAt, cursorTime),
                          lt(draftTable.id, before.id),
                      ),
                  );
        // The outer project row distinguishes an empty page from missing access.
        const rows = await primary
            .select({
                draft: {
                    ...summaryColumns,
                    // Extract the title without transferring the JSON document.
                    conversationTitle: sql<
                        string | null
                    >`${draftTable.content}->>'conversationTitle'`,
                },
            })
            .from(projectTable)
            .leftJoin(
                draftTable,
                and(
                    eq(draftTable.projectId, projectTable.id),
                    activeDraft,
                    older,
                ),
            )
            .where(
                and(
                    eq(projectTable.slug, projectSlug),
                    canAccessProject({ db: primary, userId }),
                ),
            )
            .orderBy(desc(draftTable.createdAt), desc(draftTable.id))
            .limit(limit + 1);
        if (rows.length === 0) throw draftNotFound();
        const drafts = rows.slice(0, limit).flatMap(({ draft }) => {
            if (draft === null) return [];
            const { conversationTitle, ...summary } = draft;
            return [
                toSummary({
                    draft: summary,
                    projectSlug,
                    conversationTitle: conversationTitle ?? undefined,
                }),
            ];
        });
        const last = drafts.at(-1);
        return {
            drafts,
            nextCursor:
                rows.length > limit && last !== undefined
                    ? { id: last.id, createdAt: last.createdAt }
                    : undefined,
        };
    }

    async function get({
        request: { draftId },
        userId,
    }: AuthorizedRequest<z.infer<typeof Dto.conversationDraftRequest>>) {
        const row = (
            await primary
                .select({
                    draft: { ...summaryColumns, content: draftTable.content },
                    projectSlug: projectTable.slug,
                })
                .from(draftTable)
                .innerJoin(
                    projectTable,
                    eq(projectTable.id, draftTable.projectId),
                )
                .where(
                    and(
                        eq(draftTable.id, draftId),
                        activeDraft,
                        canAccessProject({ db: primary, userId }),
                    ),
                )
        ).at(0);
        if (row === undefined) throw draftNotFound();
        return toDraft(row);
    }

    async function mutate({
        request: { draftId, expectedRevision },
        userId,
        change,
    }: AuthorizedRequest<DraftMutation> & { change: DraftChange }) {
        const project = (
            await primary
                .select({ projectId: draftTable.projectId })
                .from(draftTable)
                .innerJoin(
                    projectTable,
                    eq(projectTable.id, draftTable.projectId),
                )
                .where(
                    and(
                        eq(draftTable.id, draftId),
                        activeDraft,
                        canAccessProject({ db: primary, userId }),
                    ),
                )
        ).at(0);
        if (project === undefined) throw draftNotFound();
        // Sanitize and bound input before acquiring write locks.
        const settings =
            change.kind === "save"
                ? prepareDraftContent(change.content)
                : undefined;
        return await primary.transaction(async (tx) => {
            const { projectSlug } = await lockDraftProject({
                tx,
                userId,
                target: project,
            });
            const state = await lockDraft({ tx, draftId });
            if (state.publishedAt !== null) throw draftNotFound();
            checkRevision({ revision: state.revision, expectedRevision });
            if (
                settings !== undefined &&
                settings.conversationType !== state.conversationType
            ) {
                throw httpErrors.badRequest(
                    "Conversation draft type cannot change",
                );
            }
            const now = new Date();
            const [draft] = await tx
                .update(draftTable)
                .set({
                    revision: state.revision + 1,
                    updatedAt: now,
                    deletedAt: change.kind === "discard" ? now : undefined,
                    content: settings?.content ?? {},
                })
                .where(eq(draftTable.id, draftId))
                .returning({ ...summaryColumns, content: draftTable.content });
            return { draft, projectSlug };
        });
    }

    async function save({
        request,
        userId,
    }: AuthorizedRequest<z.infer<typeof Dto.saveConversationDraftRequest>>) {
        return toDraft(
            await mutate({
                request,
                userId,
                change: { kind: "save", content: request.content },
            }),
        );
    }

    async function discard(
        params: AuthorizedRequest<DraftMutation>,
    ): Promise<z.infer<typeof Dto.discardConversationDraftResponse>> {
        await mutate({ ...params, change: { kind: "discard" } });
        return { success: true };
    }

    async function publish({
        request: { draftId, expectedRevision, postAsOrganization },
        userId,
        displayLanguage,
    }: AuthorizedRequest<
        z.infer<typeof Dto.publishConversationDraftRequest>
    > & {
        displayLanguage: SupportedDisplayLanguageCodes;
    }): Promise<z.infer<typeof Dto.publishConversationDraftResponse>> {
        const draft = (
            await primary
                .select({
                    projectId: draftTable.projectId,
                    revision: draftTable.revision,
                    conversationType: draftTable.conversationType,
                    content: draftTable.content,
                    publishedAt: draftTable.publishedAt,
                    publishedConversationId: draftTable.publishedConversationId,
                })
                .from(draftTable)
                .innerJoin(
                    projectTable,
                    eq(projectTable.id, draftTable.projectId),
                )
                .where(
                    and(
                        eq(draftTable.id, draftId),
                        isNull(draftTable.deletedAt),
                        canAccessProject({ db: primary, userId }),
                    ),
                )
        ).at(0);
        if (draft === undefined) throw draftNotFound();
        checkRevision({ revision: draft.revision, expectedRevision });
        const { projectId } = draft;
        if (draft.publishedAt !== null) {
            return {
                success: true,
                ...(await replayPublication({
                    db: primary,
                    userId,
                    projectId,
                    publishedConversationId: draft.publishedConversationId,
                })),
            };
        }

        const scope = await getDraftProjectScope({
            db: primary,
            userId,
            target: { projectId },
        });
        if (postAsOrganization === undefined && scope.owners.length > 1) {
            throw httpErrors.badRequest(
                "Select an owning organization for publication",
            );
        }
        const owner = scope.owners.find(
            (candidate) =>
                postAsOrganization === undefined ||
                candidate.organizationSlug === postAsOrganization,
        );
        if (owner === undefined)
            throw httpErrors.forbidden(
                "Organization unavailable for publication",
            );
        const content = readDraftContent(draft);
        const projectLanguageSettings =
            content.languageSettingsSource === "conversation_override"
                ? undefined
                : await getProjectLanguageSettings({ db: primary, projectId });
        const publication = parseDraftPublication({
            content,
            projectSlug: scope.project.projectSlug,
            postAsOrganization: owner.isPersonalOrganization
                ? undefined
                : owner.organizationSlug,
            projectParticipationMode: scope.project.participationMode,
            projectLanguageSettings,
        });
        if (!publication.success) {
            return {
                success: false,
                failure: {
                    target: "draft",
                    reason: "invalid_configuration",
                    fields: [
                        ...new Set(
                            publication.error.issues.flatMap(({ path }) =>
                                path.length === 0
                                    ? []
                                    : [path.map(String).join(".")],
                            ),
                        ),
                    ],
                },
            };
        }

        return await createConversation({
            request: publication.data,
            userId,
            displayLanguage,
            draft: {
                target: owner,
                projectLanguageSettings,
                async claim(tx) {
                    const lockedScope = await getDraftProjectScope({
                        db: tx,
                        userId,
                        target: { projectId },
                    });
                    const lockedOwner = lockedScope.owners.find(
                        (candidate) =>
                            candidate.organizationId === owner.organizationId,
                    );
                    if (lockedOwner === undefined) {
                        throw httpErrors.forbidden(
                            "Organization unavailable for publication",
                        );
                    }
                    const state = await lockDraft({ tx, draftId });
                    checkRevision({
                        revision: state.revision,
                        expectedRevision,
                    });
                    if (state.publishedAt !== null) {
                        return {
                            kind: "already_published",
                            ...(await replayPublication({
                                db: tx,
                                userId,
                                projectId,
                                publishedConversationId:
                                    state.publishedConversationId,
                            })),
                        };
                    }
                    if (
                        lockedOwner.organizationSlug !==
                            owner.organizationSlug ||
                        (postAsOrganization === undefined &&
                            lockedScope.owners.length > 1)
                    ) {
                        throw httpErrors.conflict(
                            "Publication organizations changed; retry publication",
                        );
                    }
                    const modeChanged =
                        publication.data.participationModeSettingsSource ===
                            "project_inherited" &&
                        lockedScope.project.participationMode !==
                            publication.data.participationMode;
                    const languagesChanged =
                        projectLanguageSettings !== undefined &&
                        !sameProjectLanguageSettings({
                            before: projectLanguageSettings,
                            after: await getProjectLanguageSettings({
                                db: tx,
                                projectId,
                            }),
                        });
                    if (modeChanged || languagesChanged) {
                        throw httpErrors.conflict(
                            "Project settings changed; retry publication",
                        );
                    }
                    return {
                        kind: "publish",
                        async complete(conversationId) {
                            const now = new Date();
                            await tx
                                .update(draftTable)
                                .set({
                                    publishedConversationId: conversationId,
                                    publishedAt: now,
                                    updatedAt: now,
                                    content: {},
                                })
                                .where(eq(draftTable.id, draftId));
                        },
                    };
                },
            },
        });
    }

    return { create, list, get, save, discard, publish };
}
