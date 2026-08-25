import { and, eq, gt, isNotNull, isNull, lte, or } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { getPrimaryDatabase } from "@/shared-backend/db.js";
import {
    conversationTable,
    organizationTable,
    premiumFeatureEntitlementTable,
    projectContactTable,
    projectTable,
} from "@/shared-backend/schema.js";
import type {
    AdminNoProjectEmailUpdatesConfiguration,
    GetAdminNoProjectEmailUpdatesResponse,
    UpdateAdminNoProjectEmailUpdatesRequest,
    UpdateAdminNoProjectEmailUpdatesResponse,
} from "@/shared/types/dto.js";
import { normalizeEmail } from "@/shared/types/zod-email.js";
import { getOrCreateDefaultProjectForOrganization } from "../projectAccess.js";
import { canDeleteConversationEmailUpdateContact } from "./organizationEmailUpdatesLogic.js";

interface OrganizationEmailUpdateContext {
    organizationId: number;
    hasEntitlement: boolean;
}

interface NoProjectContainer {
    projectId: number;
    defaultEnabled: boolean;
    contactId: number | null;
    contactName: string | null;
    contactEmail: string | null;
}

async function getOrganizationEmailUpdateContext({
    db,
    organizationSlug,
    now,
}: {
    db: PostgresJsDatabase;
    organizationSlug: string;
    now: Date;
}): Promise<OrganizationEmailUpdateContext | undefined> {
    const rows = await db
        .select({
            organizationId: organizationTable.id,
            entitlementId: premiumFeatureEntitlementTable.id,
        })
        .from(organizationTable)
        .leftJoin(
            premiumFeatureEntitlementTable,
            and(
                eq(
                    premiumFeatureEntitlementTable.organizationId,
                    organizationTable.id,
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
                eq(organizationTable.slug, organizationSlug),
                eq(organizationTable.directoryVisibility, "listed"),
                isNull(organizationTable.deletedAt),
            ),
        )
        .limit(1);
    const row = rows.at(0);
    return row === undefined
        ? undefined
        : {
              organizationId: row.organizationId,
              hasEntitlement: row.entitlementId !== null,
          };
}

function buildNoProjectContainerQuery({
    db,
    organizationId,
}: {
    db: PostgresJsDatabase;
    organizationId: number;
}) {
    return db
        .select({
            projectId: projectTable.id,
            defaultEnabled: projectTable.conversationEmailUpdateDefaultEnabled,
            contactId: projectContactTable.id,
            contactName: projectContactTable.firstName,
            contactEmail: projectContactTable.email,
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
                eq(projectTable.autoProvisionedForOrganizationId, organizationId),
                isNull(projectTable.deletedAt),
            ),
        )
        .limit(1);
}

async function getNoProjectContainer({
    db,
    organizationId,
}: {
    db: PostgresJsDatabase;
    organizationId: number;
}): Promise<NoProjectContainer | undefined> {
    const rows = await buildNoProjectContainerQuery({ db, organizationId });
    return rows.at(0);
}

async function lockNoProjectContainer({
    db,
    organizationId,
}: {
    db: PostgresJsDatabase;
    organizationId: number;
}): Promise<NoProjectContainer | undefined> {
    const projectRows = await db
        .select({
            projectId: projectTable.id,
            defaultEnabled: projectTable.conversationEmailUpdateDefaultEnabled,
        })
        .from(projectTable)
        .where(
            and(
                eq(projectTable.autoProvisionedForOrganizationId, organizationId),
                isNull(projectTable.deletedAt),
            ),
        )
        .limit(1)
        .for("update");
    const project = projectRows.at(0);
    if (project === undefined) {
        return undefined;
    }
    const contactRows = await db
        .select({
            contactId: projectContactTable.id,
            contactName: projectContactTable.firstName,
            contactEmail: projectContactTable.email,
        })
        .from(projectContactTable)
        .where(
            and(
                eq(projectContactTable.projectId, project.projectId),
                isNull(projectContactTable.deletedAt),
            ),
        )
        .limit(1);
    const contact = contactRows.at(0);
    return {
        ...project,
        contactId: contact?.contactId ?? null,
        contactName: contact?.contactName ?? null,
        contactEmail: contact?.contactEmail ?? null,
    };
}

async function hasExplicitlyEnabledConversation({
    db,
    projectId,
}: {
    db: PostgresJsDatabase;
    projectId: number;
}): Promise<boolean> {
    const rows = await db
        .select({ conversationId: conversationTable.id })
        .from(conversationTable)
        .where(
            and(
                eq(conversationTable.projectId, projectId),
                eq(
                    conversationTable.conversationEmailUpdateEnabledOverride,
                    true,
                ),
                isNotNull(conversationTable.currentContentId),
            ),
        )
        .limit(1);
    return rows.length === 1;
}

async function buildConfiguration({
    db,
    hasEntitlement,
    container,
}: {
    db: PostgresJsDatabase;
    hasEntitlement: boolean;
    container: NoProjectContainer | undefined;
}): Promise<AdminNoProjectEmailUpdatesConfiguration> {
    if (container === undefined) {
        return {
            hasEntitlement,
            defaultEnabled: false,
            contact: undefined,
            canDeleteContact: true,
        };
    }
    const explicitlyEnabled = await hasExplicitlyEnabledConversation({
        db,
        projectId: container.projectId,
    });
    const contact =
        container.contactName === null || container.contactEmail === null
            ? undefined
            : {
                  name: container.contactName,
                  email: container.contactEmail,
              };
    return {
        hasEntitlement,
        defaultEnabled: container.defaultEnabled,
        contact,
        canDeleteContact: canDeleteConversationEmailUpdateContact({
            defaultEnabled: container.defaultEnabled,
            hasExplicitlyEnabledConversation: explicitlyEnabled,
        }),
    };
}

export async function getAdminNoProjectEmailUpdates({
    db,
    organizationSlug,
    now,
}: {
    db: PostgresJsDatabase;
    organizationSlug: string;
    now: Date;
}): Promise<GetAdminNoProjectEmailUpdatesResponse> {
    const context = await getOrganizationEmailUpdateContext({
        db,
        organizationSlug,
        now,
    });
    if (context === undefined) {
        return { success: false, reason: "organization_not_found" };
    }
    const container = await getNoProjectContainer({
        db,
        organizationId: context.organizationId,
    });
    return {
        success: true,
        configuration: await buildConfiguration({
            db,
            hasEntitlement: context.hasEntitlement,
            container,
        }),
    };
}

export async function updateAdminNoProjectEmailUpdates({
    db,
    userId,
    request,
    now,
}: {
    db: PostgresJsDatabase;
    userId: string;
    request: UpdateAdminNoProjectEmailUpdatesRequest;
    now: Date;
}): Promise<UpdateAdminNoProjectEmailUpdatesResponse> {
    return await getPrimaryDatabase(db).transaction(async (tx) => {
        const context = await getOrganizationEmailUpdateContext({
            db: tx,
            organizationSlug: request.organizationSlug,
            now,
        });
        if (context === undefined) {
            return { success: false, reason: "organization_not_found" };
        }
        if (!context.hasEntitlement) {
            return { success: false, reason: "entitlement_required" };
        }
        let container = await lockNoProjectContainer({
            db: tx,
            organizationId: context.organizationId,
        });
        if (
            container === undefined &&
            request.contact === undefined &&
            !request.defaultEnabled
        ) {
            return {
                success: true,
                configuration: await buildConfiguration({
                    db: tx,
                    hasEntitlement: true,
                    container: undefined,
                }),
            };
        }
        if (container === undefined) {
            await getOrCreateDefaultProjectForOrganization({
                db: tx,
                organizationId: context.organizationId,
            });
            container = await lockNoProjectContainer({
                db: tx,
                organizationId: context.organizationId,
            });
            if (container === undefined) {
                return { success: false, reason: "organization_not_found" };
            }
        }

        const hasEnabledConversation = await hasExplicitlyEnabledConversation({
            db: tx,
            projectId: container.projectId,
        });
        const canDeleteContact = canDeleteConversationEmailUpdateContact({
            defaultEnabled: request.defaultEnabled,
            hasExplicitlyEnabledConversation: hasEnabledConversation,
        });
        const savedContact =
            request.contact === undefined
                ? undefined
                : {
                      name: request.contact.name,
                      email: normalizeEmail(request.contact.email),
                  };
        if (savedContact === undefined && container.contactId !== null) {
            if (!canDeleteContact) {
                return { success: false, reason: "contact_in_use" };
            }
            await tx
                .update(projectContactTable)
                .set({ deletedAt: now, updatedAt: now })
                .where(eq(projectContactTable.id, container.contactId));
        } else if (savedContact !== undefined) {
            const contactValues = {
                firstName: savedContact.name,
                lastName: null,
                roleLabel: null,
                email: savedContact.email,
                websiteUrl: null,
                imagePath: null,
                isFullImagePath: false,
                organizationId: null,
                externalOrganizationId: null,
                updatedAt: now,
            };
            if (container.contactId === null) {
                await tx.insert(projectContactTable).values({
                    projectId: container.projectId,
                    ...contactValues,
                });
            } else {
                await tx
                    .update(projectContactTable)
                    .set(contactValues)
                    .where(eq(projectContactTable.id, container.contactId));
            }
        }

        await tx
            .update(projectTable)
            .set({
                conversationEmailUpdateDefaultEnabled: request.defaultEnabled,
                conversationEmailUpdateDefaultUpdatedAt: now,
                conversationEmailUpdateDefaultUpdatedByUserId: userId,
                updatedAt: now,
            })
            .where(eq(projectTable.id, container.projectId));

        return {
            success: true,
            configuration: {
                hasEntitlement: true,
                defaultEnabled: request.defaultEnabled,
                contact: savedContact,
                canDeleteContact,
            },
        };
    });
}
