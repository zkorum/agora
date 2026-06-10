import { organizationMembershipAllProjectCapabilityEnum } from "@/shared-backend/schema.js";
import type { PremiumFeature } from "@/shared/types/zod.js";

export type AllProjectCapability =
    (typeof organizationMembershipAllProjectCapabilityEnum.enumValues)[number];

export interface OrganizationCapabilityGrant {
    organizationId: number;
    capability: AllProjectCapability;
}

export interface ProjectOrganizationOwnershipGrant {
    projectId: number;
    organizationId: number;
}

export interface PremiumEntitlementGrant {
    organizationId: number;
    feature: PremiumFeature;
    expiresAt: Date | null;
}

export function hasCapabilityForProject({
    capabilityGrants,
    projectOwnerships,
    projectId,
    capability,
}: {
    capabilityGrants: readonly OrganizationCapabilityGrant[];
    projectOwnerships: readonly ProjectOrganizationOwnershipGrant[];
    projectId: number;
    capability: AllProjectCapability;
}): boolean {
    const ownerOrganizationIds = new Set<number>();
    for (const ownership of projectOwnerships) {
        if (ownership.projectId === projectId) {
            ownerOrganizationIds.add(ownership.organizationId);
        }
    }

    for (const grant of capabilityGrants) {
        if (
            grant.capability === capability &&
            ownerOrganizationIds.has(grant.organizationId)
        ) {
            return true;
        }
    }

    return false;
}

export function getProjectIdsWithCapabilityFromGrants({
    capabilityGrants,
    projectOwnerships,
    capability,
}: {
    capabilityGrants: readonly OrganizationCapabilityGrant[];
    projectOwnerships: readonly ProjectOrganizationOwnershipGrant[];
    capability: AllProjectCapability;
}): number[] {
    const organizationIdsWithCapability = new Set<number>();
    for (const grant of capabilityGrants) {
        if (grant.capability === capability) {
            organizationIdsWithCapability.add(grant.organizationId);
        }
    }

    const projectIds = new Set<number>();
    for (const ownership of projectOwnerships) {
        if (organizationIdsWithCapability.has(ownership.organizationId)) {
            projectIds.add(ownership.projectId);
        }
    }

    return Array.from(projectIds);
}

export function hasActivePremiumFeatureEntitlement({
    grants,
    feature,
    now,
}: {
    grants: readonly PremiumEntitlementGrant[];
    feature: PremiumFeature;
    now: Date;
}): boolean {
    for (const grant of grants) {
        if (
            grant.feature === feature &&
            (grant.expiresAt === null || grant.expiresAt.getTime() > now.getTime())
        ) {
            return true;
        }
    }

    return false;
}
