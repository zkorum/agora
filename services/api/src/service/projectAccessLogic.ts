import { projectCapabilityValues } from "@/shared-backend/schema.js";
import type { PremiumFeature } from "@/shared/types/zod.js";

export type AllProjectCapability = (typeof projectCapabilityValues)[number];

export function isAllProjectCapability(
    value: string,
): value is AllProjectCapability {
    return projectCapabilityValues.some((capability) => capability === value);
}

export interface PremiumEntitlementGrant {
    organizationId: number;
    feature: PremiumFeature;
    expiresAt: Date | null;
}

export function getConversationCreateEmailUpdateConfiguration({
    canConfigure,
    participantContactEmail,
    scopeDefaultEnabled,
}: {
    canConfigure: boolean;
    participantContactEmail: string | null | undefined;
    scopeDefaultEnabled: boolean | undefined;
}): {
    canConfigure: boolean;
    hasParticipantContactEmail: boolean;
    scopeDefaultEnabled: boolean;
} {
    return {
        canConfigure,
        hasParticipantContactEmail: participantContactEmail != null,
        scopeDefaultEnabled: scopeDefaultEnabled ?? false,
    };
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
            (grant.expiresAt === null ||
                grant.expiresAt.getTime() > now.getTime())
        ) {
            return true;
        }
    }

    return false;
}
