import { describe, expect, it } from "vitest";
import { isPersonalNonSeedOpinionByViewer } from "./comment.js";

describe("opinion translation visibility", () => {
    it("detects personal non-seed opinions written by the viewer", () => {
        expect(
            isPersonalNonSeedOpinionByViewer({
                opinionAuthorId: "user-1",
                viewerUserId: "user-1",
                isSeed: false,
            }),
        ).toBe(true);
    });

    it("does not treat seed opinions as personal viewer opinions", () => {
        expect(
            isPersonalNonSeedOpinionByViewer({
                opinionAuthorId: "user-1",
                viewerUserId: "user-1",
                isSeed: true,
            }),
        ).toBe(false);
    });

    it("does not match opinions from other viewers", () => {
        expect(
            isPersonalNonSeedOpinionByViewer({
                opinionAuthorId: "user-1",
                viewerUserId: "user-2",
                isSeed: false,
            }),
        ).toBe(false);
    });

    it("does not match anonymous viewers", () => {
        expect(
            isPersonalNonSeedOpinionByViewer({
                opinionAuthorId: "user-1",
                viewerUserId: undefined,
                isSeed: false,
            }),
        ).toBe(false);
    });
});
