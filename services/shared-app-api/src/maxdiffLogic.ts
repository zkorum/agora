import {
    checkFeatureAccess,
    DEFAULT_FEATURE_ALLOWED_ORGS,
    DEFAULT_FEATURE_ALLOWED_USERS,
    type FeatureAccessDenialReason,
} from "./featureAccess.js";

export const DEFAULT_MAXDIFF_ALLOWED_ORGS = DEFAULT_FEATURE_ALLOWED_ORGS;
export const DEFAULT_MAXDIFF_ALLOWED_USERS = DEFAULT_FEATURE_ALLOWED_USERS;
export const DEFAULT_MAXDIFF_GITHUB_ALLOWED_ORGS = DEFAULT_FEATURE_ALLOWED_ORGS;
export const DEFAULT_MAXDIFF_GITHUB_ALLOWED_USERS = DEFAULT_FEATURE_ALLOWED_USERS;

interface CheckMaxDiffAllowedParams {
    maxdiffEnabled: boolean;
    isMaxdiffOrgOnly: boolean;
    maxdiffAllowedOrgs: string; // comma-separated, "" = all orgs
    maxdiffAllowedUsers: string; // comma-separated, "" = all users
    postAsOrganization: boolean;
    organizationName: string;
    userId: string;
}

type MaxDiffDenialReason = FeatureAccessDenialReason;

type CheckMaxDiffAllowedResult =
    | { allowed: true }
    | { allowed: false; reason: MaxDiffDenialReason };

export function checkMaxDiffAllowed({
    maxdiffEnabled,
    isMaxdiffOrgOnly,
    maxdiffAllowedOrgs,
    maxdiffAllowedUsers,
    postAsOrganization,
    organizationName,
    userId,
}: CheckMaxDiffAllowedParams): CheckMaxDiffAllowedResult {
    return checkFeatureAccess({
        featureEnabled: maxdiffEnabled,
        isOrgOnly: isMaxdiffOrgOnly,
        allowedOrgs: maxdiffAllowedOrgs,
        allowedUsers: maxdiffAllowedUsers,
        postAsOrganization,
        organizationName,
        userId,
    });
}

type MaxDiffGitHubDenialReason =
    | MaxDiffDenialReason
    | "github_disabled"
    | "github_org_required"
    | "github_org_not_in_whitelist"
    | "github_user_not_in_whitelist";

type CheckMaxDiffGitHubAllowedResult =
    | { allowed: true }
    | { allowed: false; reason: MaxDiffGitHubDenialReason };

interface CheckMaxDiffGitHubAllowedParams {
    maxdiffEnabled: boolean;
    isMaxdiffOrgOnly: boolean;
    maxdiffAllowedOrgs: string;
    maxdiffAllowedUsers: string;
    maxdiffGitHubEnabled: boolean;
    isMaxdiffGitHubOrgOnly: boolean;
    maxdiffGitHubAllowedOrgs: string;
    maxdiffGitHubAllowedUsers: string;
    postAsOrganization: boolean;
    organizationName: string;
    userId: string;
}

export function checkMaxDiffGitHubAllowed({
    maxdiffEnabled,
    isMaxdiffOrgOnly,
    maxdiffAllowedOrgs,
    maxdiffAllowedUsers,
    maxdiffGitHubEnabled,
    isMaxdiffGitHubOrgOnly,
    maxdiffGitHubAllowedOrgs,
    maxdiffGitHubAllowedUsers,
    postAsOrganization,
    organizationName,
    userId,
}: CheckMaxDiffGitHubAllowedParams): CheckMaxDiffGitHubAllowedResult {
    // Base MaxDiff must be allowed first
    const baseCheck = checkMaxDiffAllowed({
        maxdiffEnabled,
        isMaxdiffOrgOnly,
        maxdiffAllowedOrgs,
        maxdiffAllowedUsers,
        postAsOrganization,
        organizationName,
        userId,
    });
    if (!baseCheck.allowed) return baseCheck;

    // GitHub feature must be enabled globally
    if (!maxdiffGitHubEnabled)
        return { allowed: false, reason: "github_disabled" };

    const githubCheck = checkFeatureAccess({
        featureEnabled: maxdiffGitHubEnabled,
        isOrgOnly: isMaxdiffGitHubOrgOnly,
        allowedOrgs: maxdiffGitHubAllowedOrgs,
        allowedUsers: maxdiffGitHubAllowedUsers,
        postAsOrganization,
        organizationName,
        userId,
    });
    if (!githubCheck.allowed) {
        switch (githubCheck.reason) {
            case "disabled":
                return { allowed: false, reason: "github_disabled" };
            case "org_required":
                return { allowed: false, reason: "github_org_required" };
            case "org_not_in_whitelist":
                return {
                    allowed: false,
                    reason: "github_org_not_in_whitelist",
                };
            case "user_not_in_whitelist":
                return {
                    allowed: false,
                    reason: "github_user_not_in_whitelist",
                };
        }
    }

    return { allowed: true };
}
