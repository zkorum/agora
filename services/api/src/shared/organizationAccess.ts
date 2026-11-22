/** **** WARNING: GENERATED FROM SHARED DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
import { z } from "zod";

export const organizationRoleValues = [
    "admin",
    "manager",
    "moderator",
] as const;
export const zodOrganizationRole = z.enum(organizationRoleValues);
export type OrganizationRole = z.infer<typeof zodOrganizationRole>;

export const organizationCapabilityValues = [
    "organization_manage_members",
    "organization_manage_profile",
    "organization_delete",
    "project_create",
] as const;
export type OrganizationCapability =
    (typeof organizationCapabilityValues)[number];

export const projectCapabilityValues = [
    "project_update",
    "project_view_restricted_documents",
    "project_delete",
    "project_manage_owner_organizations",
    "conversation_create",
    "conversation_edit",
    "conversation_delete",
    "conversation_moderate",
    "conversation_email_update",
    "conversation_view_restricted_survey",
] as const;
export type ProjectCapability = (typeof projectCapabilityValues)[number];
export type OrganizationAccessCapability =
    | OrganizationCapability
    | ProjectCapability;

export const zodOrganizationManagementPermissions = z
    .object({
        canUpdate: z.boolean(),
        canManageMembers: z.boolean(),
        canCreateProjects: z.boolean(),
        canDelete: z.boolean(),
        canConfigureEmailUpdates: z.boolean(),
    })
    .strict();
export type OrganizationManagementPermissions = z.infer<
    typeof zodOrganizationManagementPermissions
>;

export const zodProjectManagementPermissions = z
    .object({
        canUpdate: z.boolean(),
        canDelete: z.boolean(),
        canManageOwners: z.boolean(),
        canConfigureEmailUpdates: z.boolean(),
        canViewRestrictedDocuments: z.boolean(),
    })
    .strict();
export type ProjectManagementPermissions = z.infer<
    typeof zodProjectManagementPermissions
>;

// Role assignments are persisted; these bundles are not separately editable grants.
export const organizationRoleCapabilities: Readonly<
    Record<OrganizationRole, readonly OrganizationAccessCapability[]>
> = {
    admin: [...organizationCapabilityValues, ...projectCapabilityValues],
    manager: [
        "project_create",
        "project_update",
        "project_view_restricted_documents",
        "conversation_create",
        "conversation_edit",
        "conversation_moderate",
        "conversation_email_update",
        "conversation_view_restricted_survey",
    ],
    moderator: ["conversation_moderate"],
};

export function organizationRoleHasCapability({
    role,
    capability,
}: {
    role: OrganizationRole;
    capability: OrganizationAccessCapability;
}): boolean {
    return organizationRoleCapabilities[role].includes(capability);
}

export function organizationRolesWithCapability(
    capability: OrganizationAccessCapability,
): OrganizationRole[] {
    return organizationRoleValues.filter((role) =>
        organizationRoleHasCapability({ role, capability }),
    );
}
