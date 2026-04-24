import { describe, expect, test } from "@jest/globals";
import {
    checkFeatureAccess,
    checkFeatureManagementAccess,
} from "../../src/featureAccess.js";

const baseParams = {
    featureEnabled: true,
    isOrgOnly: false,
    allowedOrgs: "",
    allowedUsers: "",
    postAsOrganization: false,
    organizationName: "",
    userId: "user-123",
};

describe("checkFeatureAccess", () => {
    test("returns disabled when feature is disabled", () => {
        const result = checkFeatureAccess({
            ...baseParams,
            featureEnabled: false,
        });

        expect(result).toEqual({ allowed: false, reason: "disabled" });
    });

    test("allows personal access when users are allowed and no user whitelist is set", () => {
        const result = checkFeatureAccess(baseParams);

        expect(result).toEqual({ allowed: true });
    });

    test("returns org_required when personal access is disabled", () => {
        const result = checkFeatureAccess({
            ...baseParams,
            isOrgOnly: true,
        });

        expect(result).toEqual({ allowed: false, reason: "org_required" });
    });

    test("returns user_not_in_whitelist when personal user is not allowed", () => {
        const result = checkFeatureAccess({
            ...baseParams,
            allowedUsers: "user-999",
        });

        expect(result).toEqual({
            allowed: false,
            reason: "user_not_in_whitelist",
        });
    });

    test("allows personal user when user whitelist matches", () => {
        const result = checkFeatureAccess({
            ...baseParams,
            allowedUsers: "user-999, user-123",
        });

        expect(result).toEqual({ allowed: true });
    });

    test("allows organization access when org whitelist is empty", () => {
        const result = checkFeatureAccess({
            ...baseParams,
            postAsOrganization: true,
            organizationName: "Agora",
        });

        expect(result).toEqual({ allowed: true });
    });

    test("returns org_not_in_whitelist when organization is not allowed", () => {
        const result = checkFeatureAccess({
            ...baseParams,
            postAsOrganization: true,
            organizationName: "Other",
            allowedOrgs: "Agora",
        });

        expect(result).toEqual({
            allowed: false,
            reason: "org_not_in_whitelist",
        });
    });

    test("ignores empty allowlist entries", () => {
        const result = checkFeatureAccess({
            ...baseParams,
            allowedUsers: " , user-123 , ",
        });

        expect(result).toEqual({ allowed: true });
    });
});

describe("checkFeatureManagementAccess", () => {
    test("allows managing an existing feature even when the default gate would block it", () => {
        const result = checkFeatureManagementAccess({
            ...baseParams,
            featureEnabled: false,
            hasExistingFeature: true,
        });

        expect(result).toEqual({ allowed: true });
    });

    test("falls back to the default gate when no feature exists yet", () => {
        const result = checkFeatureManagementAccess({
            ...baseParams,
            featureEnabled: false,
            hasExistingFeature: false,
        });

        expect(result).toEqual({ allowed: false, reason: "disabled" });
    });
});
