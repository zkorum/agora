import { describe, expect, it } from "vitest";
import { decideSnsInboxPersistenceOutcome } from "./sns.js";

const durableOutcomes: ("applied" | "dead_letter" | "retry_wait")[] = [
    "applied",
    "retry_wait",
    "dead_letter",
];

describe("SNS inbox persistence outcomes", () => {
    it.each(durableOutcomes)(
        "reports %s only after exactly one row changes",
        (intendedOutcome) => {
            expect(
                decideSnsInboxPersistenceOutcome({
                    affectedRowCount: 1,
                    intendedOutcome,
                }),
            ).toBe(intendedOutcome);
        },
    );

    it("reports lease loss when the owned row was not changed", () => {
        expect(
            decideSnsInboxPersistenceOutcome({
                affectedRowCount: 0,
                intendedOutcome: "applied",
            }),
        ).toBe("lease_lost");
    });

    it("fails closed when a fenced update changes multiple rows", () => {
        expect(() =>
            decideSnsInboxPersistenceOutcome({
                affectedRowCount: 2,
                intendedOutcome: "retry_wait",
            }),
        ).toThrow("did not affect exactly one inbox row");
    });
});
