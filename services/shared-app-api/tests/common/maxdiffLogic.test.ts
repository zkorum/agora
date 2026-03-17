import { describe, test, expect } from "@jest/globals";
import { checkMaxDiffAllowed } from "../../src/maxdiffLogic.js";

const baseParams = {
    maxdiffEnabled: true,
    isMaxdiffOrgOnly: false,
    maxdiffAllowedOrgs: "Agora",
    postAsOrganization: false,
    organizationName: "",
};

describe("checkMaxDiffAllowed", () => {
    test("returns disabled when maxdiffEnabled is false", () => {
        const result = checkMaxDiffAllowed({
            ...baseParams,
            maxdiffEnabled: false,
        });
        expect(result).toEqual({ allowed: false, reason: "disabled" });
    });

    test("returns allowed when enabled and not org-only", () => {
        const result = checkMaxDiffAllowed({
            ...baseParams,
            maxdiffEnabled: true,
            isMaxdiffOrgOnly: false,
        });
        expect(result).toEqual({ allowed: true });
    });

    test("returns allowed when not org-only regardless of org params", () => {
        const result = checkMaxDiffAllowed({
            ...baseParams,
            maxdiffEnabled: true,
            isMaxdiffOrgOnly: false,
            postAsOrganization: false,
            organizationName: "",
            maxdiffAllowedOrgs: "Agora",
        });
        expect(result).toEqual({ allowed: true });
    });

    test("returns org_required when org-only and not posting as org", () => {
        const result = checkMaxDiffAllowed({
            ...baseParams,
            isMaxdiffOrgOnly: true,
            postAsOrganization: false,
        });
        expect(result).toEqual({ allowed: false, reason: "org_required" });
    });

    test("returns allowed when org-only, posting as org, empty whitelist", () => {
        const result = checkMaxDiffAllowed({
            ...baseParams,
            isMaxdiffOrgOnly: true,
            postAsOrganization: true,
            organizationName: "AnyOrg",
            maxdiffAllowedOrgs: "",
        });
        expect(result).toEqual({ allowed: true });
    });

    test("returns allowed when org-only, posting as whitelisted org", () => {
        const result = checkMaxDiffAllowed({
            ...baseParams,
            isMaxdiffOrgOnly: true,
            postAsOrganization: true,
            organizationName: "Agora",
            maxdiffAllowedOrgs: "Agora,Foo",
        });
        expect(result).toEqual({ allowed: true });
    });

    test("returns org_not_in_whitelist when org-only, posting as non-whitelisted org", () => {
        const result = checkMaxDiffAllowed({
            ...baseParams,
            isMaxdiffOrgOnly: true,
            postAsOrganization: true,
            organizationName: "Other",
            maxdiffAllowedOrgs: "Agora",
        });
        expect(result).toEqual({
            allowed: false,
            reason: "org_not_in_whitelist",
        });
    });

    test("trims whitespace in allowed orgs list", () => {
        const result = checkMaxDiffAllowed({
            ...baseParams,
            isMaxdiffOrgOnly: true,
            postAsOrganization: true,
            organizationName: "Foo",
            maxdiffAllowedOrgs: " Agora , Foo ",
        });
        expect(result).toEqual({ allowed: true });
    });

    test("treats whitespace-only allowed orgs as empty (all orgs allowed)", () => {
        const result = checkMaxDiffAllowed({
            ...baseParams,
            isMaxdiffOrgOnly: true,
            postAsOrganization: true,
            organizationName: "AnyOrg",
            maxdiffAllowedOrgs: "   ",
        });
        expect(result).toEqual({ allowed: true });
    });
});
