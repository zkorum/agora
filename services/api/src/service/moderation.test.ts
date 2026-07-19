import { describe, expect, it } from "vitest";

import {
    createCommentModerationPropertyObject,
    createPostModerationPropertyObject,
} from "./moderation.js";

const moderatedAt = new Date("2026-01-01T00:00:00.000Z");

describe("moderation property mapping", () => {
    it("preserves imported opinion moderation without an explanation", () => {
        expect(
            createCommentModerationPropertyObject(
                "hide",
                null,
                "illegal",
                moderatedAt,
                moderatedAt,
            ),
        ).toEqual({
            status: "moderated",
            action: "hide",
            explanation: "",
            reason: "illegal",
            createdAt: moderatedAt,
            updatedAt: moderatedAt,
        });
    });

    it("preserves imported conversation moderation without an explanation", () => {
        expect(
            createPostModerationPropertyObject(
                "lock",
                null,
                "illegal",
                moderatedAt,
                moderatedAt,
            ),
        ).toEqual({
            status: "moderated",
            action: "lock",
            explanation: "",
            reason: "illegal",
            createdAt: moderatedAt,
            updatedAt: moderatedAt,
        });
    });
});
