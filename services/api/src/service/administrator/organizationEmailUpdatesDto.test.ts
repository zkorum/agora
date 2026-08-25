import { describe, expect, it } from "vitest";
import { Dto } from "@/shared/types/dto.js";

describe("No Project organization Email Updates DTO", () => {
    it("requires a participant contact when the default is enabled", () => {
        expect(
            Dto.updateAdminNoProjectEmailUpdatesRequest.safeParse({
                organizationSlug: "test-org",
                defaultEnabled: true,
            }).success,
        ).toBe(false);
        expect(
            Dto.updateAdminNoProjectEmailUpdatesRequest.safeParse({
                organizationSlug: "test-org",
                defaultEnabled: true,
                contact: { name: "Test team", email: "team@example.com" },
            }).success,
        ).toBe(true);
    });

    it("allows an absent contact only while the default is disabled", () => {
        expect(
            Dto.updateAdminNoProjectEmailUpdatesRequest.parse({
                organizationSlug: "test-org",
                defaultEnabled: false,
            }),
        ).toEqual({
            organizationSlug: "test-org",
            defaultEnabled: false,
        });
    });
});
