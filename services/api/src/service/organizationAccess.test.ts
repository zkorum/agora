import { describe, expect, it } from "vitest";
import {
    organizationCapabilityValues,
    organizationRoleCapabilities,
    organizationRoleHasCapability,
    organizationRolesWithCapability,
    organizationRoleValues,
    projectCapabilityValues,
    zodOrganizationRole,
} from "@/shared/organizationAccess.js";

describe("static organization roles", () => {
    it("gives admins every supported capability", () => {
        expect(new Set(organizationRoleCapabilities.admin)).toEqual(
            new Set([
                ...organizationCapabilityValues,
                ...projectCapabilityValues,
            ]),
        );
    });
    it.each([
        "organization_delete",
        "organization_manage_members",
        "project_delete",
        "project_manage_owner_organizations",
        "conversation_delete",
    ] as const)("reserves %s for admins", (capability) => {
        expect(organizationRolesWithCapability(capability)).toEqual(["admin"]);
    });
    it("gives moderators moderation only", () => {
        expect(organizationRoleCapabilities.moderator).toEqual([
            "conversation_moderate",
        ]);
    });
    it("keeps operations with managers and capability lookup consistent", () => {
        for (const capability of [
            "project_create",
            "project_update",
            "project_view_restricted_documents",
            "conversation_create",
            "conversation_edit",
            "conversation_email_update",
            "conversation_view_restricted_survey",
        ] as const) {
            expect(organizationRolesWithCapability(capability)).toEqual([
                "admin",
                "manager",
            ]);
        }
        for (const role of organizationRoleValues) {
            for (const capability of [
                ...organizationCapabilityValues,
                ...projectCapabilityValues,
            ]) {
                expect(
                    organizationRolesWithCapability(capability).includes(role),
                ).toBe(organizationRoleHasCapability({ role, capability }));
            }
        }
    });
    it("rejects unsupported role names at request boundaries", () => {
        expect(zodOrganizationRole.safeParse("owner").success).toBe(false);
        expect(zodOrganizationRole.safeParse(undefined).success).toBe(false);
    });
});
