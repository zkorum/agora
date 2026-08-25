import { describe, expect, it } from "vitest";
import {
    resolveConversationEmailPreference,
    resolveConversationEmailPreferenceChoice,
} from "./conversationEmailUpdatePreferencePolicy.js";

describe("resolveConversationEmailPreferenceChoice", () => {
    it.each([
        [undefined, undefined, "project", undefined],
        [true, undefined, "project", true],
        [false, undefined, "project", false],
        [false, true, "project", true],
        [true, false, "project", false],
        [true, undefined, "no_project", undefined],
        [false, true, "no_project", true],
        [true, false, "no_project", false],
    ] as const)(
        "resolves project=%s conversation=%s scope=%s to %s",
        (projectEnabled, conversationEnabled, scopeKind, expected) => {
            expect(
                resolveConversationEmailPreferenceChoice({
                    projectEnabled,
                    conversationEnabled,
                    scopeKind,
                }),
            ).toBe(expected);
        },
    );

    it("keeps lower-level choices while applying a global pause", () => {
        expect(
            resolveConversationEmailPreference({
                globalPaused: true,
                projectEnabled: false,
                conversationEnabled: true,
                scopeKind: "project",
            }),
        ).toBe(false);
        expect(
            resolveConversationEmailPreferenceChoice({
                projectEnabled: false,
                conversationEnabled: true,
                scopeKind: "project",
            }),
        ).toBe(true);
    });
});
