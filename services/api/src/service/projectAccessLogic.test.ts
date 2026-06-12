import { describe, expect, it } from "vitest";
import {
    getProjectIdsWithCapabilityFromGrants,
    hasActivePremiumFeatureEntitlement,
    hasCapabilityForProject,
    type OrganizationCapabilityGrant,
    type ProjectOrganizationOwnershipGrant,
} from "@/service/projectAccessLogic.js";

describe("hasCapabilityForProject", () => {
    const capabilityGrants: OrganizationCapabilityGrant[] = [
        {
            organizationId: 10,
            capability: "conversation_update",
        },
        {
            organizationId: 11,
            capability: "conversation_manage_integrations",
        },
        {
            organizationId: 10,
            capability: "conversation_delete",
        },
    ];
    const projectOwnerships: ProjectOrganizationOwnershipGrant[] = [
        { projectId: 1, organizationId: 10 },
        { projectId: 1, organizationId: 11 },
        { projectId: 2, organizationId: 12 },
    ];

    it("allows when any effective project grant has the requested capability", () => {
        expect(
            hasCapabilityForProject({
                capabilityGrants,
                projectOwnerships,
                projectId: 1,
                capability: "conversation_manage_integrations",
            }),
        ).toBe(true);
    });

    it("denies when the capability belongs to an organization that does not own the project", () => {
        expect(
            hasCapabilityForProject({
                capabilityGrants,
                projectOwnerships,
                projectId: 2,
                capability: "conversation_delete",
            }),
        ).toBe(false);
    });

    it("denies when project owner organizations lack the requested capability", () => {
        expect(
            hasCapabilityForProject({
                capabilityGrants,
                projectOwnerships,
                projectId: 2,
                capability: "conversation_update",
            }),
        ).toBe(false);
    });
});

describe("getProjectIdsWithCapabilityFromGrants", () => {
    it("returns unique project IDs where the requested capability is effective", () => {
        expect(
            getProjectIdsWithCapabilityFromGrants({
                capabilityGrants: [
                    {
                        organizationId: 10,
                        capability: "conversation_update",
                    },
                    {
                        organizationId: 11,
                        capability: "conversation_update",
                    },
                    {
                        organizationId: 12,
                        capability: "conversation_delete",
                    },
                    {
                        organizationId: 13,
                        capability: "conversation_update",
                    },
                    {
                        organizationId: 14,
                        capability: "conversation_update",
                    },
                ],
                projectOwnerships: [
                    { projectId: 1, organizationId: 10 },
                    { projectId: 1, organizationId: 11 },
                    { projectId: 2, organizationId: 12 },
                    { projectId: 3, organizationId: 13 },
                ],
                capability: "conversation_update",
            }),
        ).toEqual([1, 3]);
    });
});

describe("hasActivePremiumFeatureEntitlement", () => {
    const now = new Date("2026-06-10T12:00:00Z");

    it("allows a non-expiring matching entitlement", () => {
        expect(
            hasActivePremiumFeatureEntitlement({
                grants: [
                    {
                        organizationId: 1,
                        feature: "analysis_variants",
                        expiresAt: null,
                    },
                ],
                feature: "analysis_variants",
                now,
            }),
        ).toBe(true);
    });

    it("allows a matching entitlement that expires in the future", () => {
        expect(
            hasActivePremiumFeatureEntitlement({
                grants: [
                    {
                        organizationId: 1,
                        feature: "survey",
                        expiresAt: new Date("2026-06-11T12:00:00Z"),
                    },
                ],
                feature: "survey",
                now,
            }),
        ).toBe(true);
    });

    it("denies expired or different-feature entitlements", () => {
        expect(
            hasActivePremiumFeatureEntitlement({
                grants: [
                    {
                        organizationId: 1,
                        feature: "survey",
                        expiresAt: new Date("2026-06-09T12:00:00Z"),
                    },
                    {
                        organizationId: 1,
                        feature: "event_ticket",
                        expiresAt: null,
                    },
                ],
                feature: "survey",
                now,
            }),
        ).toBe(false);
    });
});
