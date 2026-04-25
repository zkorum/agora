export const DEFAULT_FEATURE_ALLOWED_ORGS = "";
export const DEFAULT_FEATURE_ALLOWED_USERS = "";

export type FeatureAccessDenialReason =
    | "disabled"
    | "org_required"
    | "org_not_in_whitelist"
    | "user_not_in_whitelist";

export type FeatureAccessResult =
    | { allowed: true }
    | { allowed: false; reason: FeatureAccessDenialReason };

interface CheckFeatureAccessParams {
    featureEnabled: boolean;
    isOrgOnly: boolean;
    allowedOrgs: string;
    allowedUsers: string;
    postAsOrganization: boolean;
    organizationName: string;
    userId: string;
}

interface CheckFeatureManagementAccessParams extends CheckFeatureAccessParams {
    hasExistingFeature: boolean;
}

function parseAllowlist(value: string): string[] {
    const trimmed = value.trim();
    if (trimmed === "") {
        return [];
    }

    return trimmed
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item !== "");
}

export function checkFeatureAccess({
    featureEnabled,
    isOrgOnly,
    allowedOrgs,
    allowedUsers,
    postAsOrganization,
    organizationName,
    userId,
}: CheckFeatureAccessParams): FeatureAccessResult {
    if (!featureEnabled) {
        return { allowed: false, reason: "disabled" };
    }

    if (postAsOrganization) {
        const orgList = parseAllowlist(allowedOrgs);
        if (orgList.length === 0) {
            return { allowed: true };
        }

        if (!orgList.includes(organizationName)) {
            return { allowed: false, reason: "org_not_in_whitelist" };
        }

        return { allowed: true };
    }

    if (isOrgOnly) {
        return { allowed: false, reason: "org_required" };
    }

    const userList = parseAllowlist(allowedUsers);
    if (userList.length === 0) {
        return { allowed: true };
    }

    if (!userList.includes(userId)) {
        return { allowed: false, reason: "user_not_in_whitelist" };
    }

    return { allowed: true };
}

export function checkFeatureManagementAccess({
    hasExistingFeature,
    ...featureAccessParams
}: CheckFeatureManagementAccessParams): FeatureAccessResult {
    if (hasExistingFeature) {
        return { allowed: true };
    }

    return checkFeatureAccess(featureAccessParams);
}
