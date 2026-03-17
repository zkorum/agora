export const DEFAULT_MAXDIFF_ALLOWED_ORGS = "";
export const DEFAULT_MAXDIFF_GITHUB_ALLOWED_ORGS = "";

interface CheckMaxDiffAllowedParams {
    maxdiffEnabled: boolean;
    isMaxdiffOrgOnly: boolean;
    maxdiffAllowedOrgs: string; // comma-separated, "" = all orgs
    postAsOrganization: boolean;
    organizationName: string;
}

type MaxDiffDenialReason = "disabled" | "org_required" | "org_not_in_whitelist";

type CheckMaxDiffAllowedResult =
    | { allowed: true }
    | { allowed: false; reason: MaxDiffDenialReason };

export function checkMaxDiffAllowed({
    maxdiffEnabled,
    isMaxdiffOrgOnly,
    maxdiffAllowedOrgs,
    postAsOrganization,
    organizationName,
}: CheckMaxDiffAllowedParams): CheckMaxDiffAllowedResult {
    if (!maxdiffEnabled) return { allowed: false, reason: "disabled" };

    // If not restricted to orgs, everyone can create maxdiff
    if (!isMaxdiffOrgOnly) return { allowed: true };

    // Org-only mode: must be posting as org
    if (!postAsOrganization)
        return { allowed: false, reason: "org_required" };

    // Check allowed orgs whitelist (empty = all orgs)
    const trimmed = maxdiffAllowedOrgs.trim();
    if (trimmed === "") return { allowed: true };

    const orgList = trimmed.split(",").map((s) => s.trim());
    if (!orgList.includes(organizationName)) {
        return { allowed: false, reason: "org_not_in_whitelist" };
    }

    return { allowed: true };
}

type MaxDiffGitHubDenialReason =
    | MaxDiffDenialReason
    | "github_disabled"
    | "github_org_required"
    | "github_org_not_in_whitelist";

type CheckMaxDiffGitHubAllowedResult =
    | { allowed: true }
    | { allowed: false; reason: MaxDiffGitHubDenialReason };

interface CheckMaxDiffGitHubAllowedParams {
    maxdiffEnabled: boolean;
    isMaxdiffOrgOnly: boolean;
    maxdiffAllowedOrgs: string;
    maxdiffGitHubEnabled: boolean;
    isMaxdiffGitHubOrgOnly: boolean;
    maxdiffGitHubAllowedOrgs: string;
    postAsOrganization: boolean;
    organizationName: string;
}

export function checkMaxDiffGitHubAllowed({
    maxdiffEnabled,
    isMaxdiffOrgOnly,
    maxdiffAllowedOrgs,
    maxdiffGitHubEnabled,
    isMaxdiffGitHubOrgOnly,
    maxdiffGitHubAllowedOrgs,
    postAsOrganization,
    organizationName,
}: CheckMaxDiffGitHubAllowedParams): CheckMaxDiffGitHubAllowedResult {
    // Base MaxDiff must be allowed first
    const baseCheck = checkMaxDiffAllowed({
        maxdiffEnabled,
        isMaxdiffOrgOnly,
        maxdiffAllowedOrgs,
        postAsOrganization,
        organizationName,
    });
    if (!baseCheck.allowed) return baseCheck;

    // GitHub feature must be enabled globally
    if (!maxdiffGitHubEnabled)
        return { allowed: false, reason: "github_disabled" };

    // If not restricted to orgs, all MaxDiff-allowed orgs get GitHub
    if (!isMaxdiffGitHubOrgOnly) return { allowed: true };

    // GitHub org-only mode: must be posting as org
    if (!postAsOrganization)
        return { allowed: false, reason: "github_org_required" };

    // Check GitHub-specific org whitelist (empty = all MaxDiff-allowed orgs)
    const trimmed = maxdiffGitHubAllowedOrgs.trim();
    if (trimmed === "") return { allowed: true };

    const orgList = trimmed.split(",").map((s) => s.trim());
    if (!orgList.includes(organizationName)) {
        return { allowed: false, reason: "github_org_not_in_whitelist" };
    }

    return { allowed: true };
}
