import { describe, expect, it } from "vitest";
import { extractIncidentManifest } from "./twilio-incident-manifest.js";
import { incidentManifestSchema } from "./twilioIncidentManifestSchema.js";

function* logLines(messages: string[]): Iterable<string> {
    for (const msg of messages) {
        yield JSON.stringify({ time: 1785250000000, msg });
    }
}

function attempt({
    phoneHash,
    userId,
}: {
    phoneHash: string;
    userId: string;
}): string {
    return `insert into "auth_attempt_phone" (...) values (...) -- did:test:source,register,52,380,UA,${phoneHash},0,${userId},test-agent`;
}

function registration({
    phoneHash,
    userId,
}: {
    phoneHash: string;
    userId: string;
}): string {
    return `insert into "phone" (...) values (...) -- ${userId},52,380,UA,${phoneHash},0`;
}

describe("Twilio incident evidence extraction", () => {
    const userId = "10000000-0000-4000-8000-000000000001";
    const otherUserId = "10000000-0000-4000-8000-000000000002";
    const registeredHash = Buffer.alloc(32, 1).toString("base64");
    const requestedHash = Buffer.alloc(32, 2).toString("base64");

    it("keeps attempt-only numbers separate from an exactly matched registration", async () => {
        const manifest = await extractIncidentManifest(
            logLines([
                attempt({ phoneHash: registeredHash, userId }),
                attempt({ phoneHash: requestedHash, userId: otherUserId }),
                registration({ phoneHash: registeredHash, userId }),
            ]),
        );

        expect(incidentManifestSchema.safeParse(manifest).success).toBe(true);
        expect(manifest.entries).toMatchObject([
            {
                classification: "registered_during_incident",
                associatedUserId: userId,
                firstAttemptLogLine: 1,
                registrationLogLine: 3,
                approved: false,
                restrictAccount: false,
            },
            {
                classification: "attempt_candidate",
                firstAttemptLogLine: 2,
                approved: false,
                restrictAccount: false,
            },
        ]);
    });

    it("rejects a registration for a different account instead of marking it exact", async () => {
        await expect(
            extractIncidentManifest(
                logLines([
                    attempt({ phoneHash: registeredHash, userId }),
                    registration({
                        phoneHash: registeredHash,
                        userId: otherUserId,
                    }),
                ]),
            ),
        ).rejects.toThrow("does not match a registered attempt user");
    });

    it("rejects incomplete evidence instead of producing a partial manifest", async () => {
        function* damagedLog(): Iterable<string> {
            yield JSON.stringify({
                time: 1785250000000,
                msg: attempt({ phoneHash: registeredHash, userId }),
            });
            yield "{broken";
        }
        await expect(extractIncidentManifest(damagedLog())).rejects.toThrow(
            "Malformed JSON at log line 2",
        );
    });

    it("refuses phone evidence from outside July 28", async () => {
        await expect(
            extractIncidentManifest([
                JSON.stringify({
                    time: 1785283200000,
                    msg: attempt({ phoneHash: registeredHash, userId }),
                }),
            ]),
        ).rejects.toThrow("Phone evidence outside the incident date");
    });

    it("rejects account restrictions on attempt-only evidence", () => {
        expect(
            incidentManifestSchema.safeParse({
                incidentId: "twilio-2026-07-28",
                reviewedBy: "reviewer",
                entries: [
                    {
                        phoneHash: requestedHash,
                        pepperVersion: 0,
                        countryCode: "UA",
                        firstSeenAt: "2026-07-28T14:00:00.000Z",
                        firstAttemptLogLine: 2,
                        attemptCount: 1,
                        classification: "attempt_candidate",
                        approved: true,
                        restrictAccount: true,
                        reason: "reviewed",
                    },
                ],
            }).success,
        ).toBe(false);
    });
});
