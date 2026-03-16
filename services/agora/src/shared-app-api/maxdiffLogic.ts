/** **** WARNING: GENERATED FROM SHARED-APP-API DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
export const DEFAULT_MAXDIFF_ALLOWED_ORGS = "Agora";

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
