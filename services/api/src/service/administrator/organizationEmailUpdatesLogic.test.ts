import { describe, expect, it } from "vitest";
import { canDeleteConversationEmailUpdateContact } from "./organizationEmailUpdatesLogic.js";

describe("canDeleteConversationEmailUpdateContact", () => {
    it.each([
        {
            defaultEnabled: false,
            hasExplicitlyEnabledConversation: false,
            expected: true,
        },
        {
            defaultEnabled: true,
            hasExplicitlyEnabledConversation: false,
            expected: false,
        },
        {
            defaultEnabled: false,
            hasExplicitlyEnabledConversation: true,
            expected: false,
        },
    ])(
        "returns $expected for default=$defaultEnabled explicit=$hasExplicitlyEnabledConversation",
        ({ defaultEnabled, hasExplicitlyEnabledConversation, expected }) => {
            expect(
                canDeleteConversationEmailUpdateContact({
                    defaultEnabled,
                    hasExplicitlyEnabledConversation,
                }),
            ).toBe(expected);
        },
    );
});
