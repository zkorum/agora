import { describe, expect, it } from "vitest";
import { Dto } from "../src/shared/types/dto.js";

describe("user profile response schema", () => {
    it("accepts organizations without image or website URLs", () => {
        expect(() =>
            Dto.getUserProfileResponse.parse({
                activePostCount: 0,
                createdAt: new Date("2026-01-01T00:00:00.000Z"),
                username: "alice",
                isSiteModerator: false,
                isSiteOrgAdmin: false,
                organizationList: [
                    {
                        name: "Agora",
                        description: "",
                    },
                ],
                verifiedEventTickets: [],
            }),
        ).not.toThrow();
    });
});
