import { describe, expect, it } from "vitest";
import { authorizesGuestRecoveryTarget } from "./guestRecoveryAuthorization.js";

const freshDidWrite = "did:key:z12345";
describe("guest recovery authorization", () => {
    it("requires a signed recovery fact naming the exact new key", () => {
        expect(
            authorizesGuestRecoveryTarget({
                facts: [{ action: "recover_guest_account", freshDidWrite }],
                freshDidWrite,
            }),
        ).toBe(true);
    });
    it.each([
        { facts: [] },
        { facts: [{ freshDidWrite }] },
        { facts: [{ action: "login", freshDidWrite }] },
        {
            facts: [
                {
                    action: "recover_guest_account",
                    freshDidWrite: "did:key:z98765",
                },
            ],
        },
        { facts: [null] },
    ])(
        "rejects absent, malformed or substituted authorization (%j)",
        ({ facts }) => {
            expect(
                authorizesGuestRecoveryTarget({ facts, freshDidWrite }),
            ).toBe(false);
        },
    );
});
