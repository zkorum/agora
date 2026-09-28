#!/usr/bin/env npx tsx

import { createReadStream } from "node:fs";
import { writeFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import {
    PENDING_REVIEW_REASON,
    type IncidentManifest,
    type IncidentManifestEntry,
} from "./twilioIncidentManifestSchema.js";

const logEntrySchema = z.object({
    time: z.number().int().nonnegative(),
    msg: z.string(),
});
const attemptParamsSchema = z.tuple([
    z.string().min(1),
    z.enum(["register", "login_known_device", "login_new_device", "merge"]),
    z.string(),
    z.string(),
    z.string().regex(/^[A-Z]{2}$/),
    z.string().regex(/^[A-Za-z0-9+/]{43}=?$/),
    z.coerce.number().int().nonnegative(),
    z.uuid(),
]);
const registrationParamsSchema = z.tuple([
    z.uuid(),
    z.string(),
    z.string(),
    z.string(),
    z.string().regex(/^[A-Za-z0-9+/]{43}=?$/),
    z.coerce.number().int().nonnegative(),
]);
const INCIDENT_START_MS = Date.parse("2026-07-28T00:00:00.000Z");
const INCIDENT_END_MS = Date.parse("2026-07-29T00:00:00.000Z");

interface AttemptEvidence {
    phoneHash: string;
    pepperVersion: number;
    countryCode: string;
    firstSeenAt: string;
    firstAttemptLogLine: number;
    attemptCount: number;
}

interface RegistrationEvidence {
    phoneHash: string;
    pepperVersion: number;
    userId: string;
    registrationLogLine: number;
}

function key({
    phoneHash,
    pepperVersion,
}: {
    phoneHash: string;
    pepperVersion: number;
}): string {
    return `${String(pepperVersion)}:${phoneHash}`;
}

export async function extractIncidentManifest(
    lines: AsyncIterable<string> | Iterable<string>,
): Promise<IncidentManifest> {
    const attempts = new Map<string, AttemptEvidence>();
    const registrations = new Map<string, RegistrationEvidence>();
    const registrationAttemptUsers = new Map<string, Set<string>>();
    let lineNumber = 0;

    for await (const line of lines) {
        lineNumber += 1;
        let raw: unknown;
        try {
            raw = JSON.parse(line);
        } catch {
            throw new Error(`Malformed JSON at log line ${String(lineNumber)}`);
        }
        const parsed = logEntrySchema.safeParse(raw);
        if (!parsed.success) continue;
        const { msg, time } = parsed.data;
        const paramsStart = msg.indexOf(" -- ");
        if (paramsStart < 0) continue;
        const params = msg.slice(paramsStart + 4);

        if (
            (msg.startsWith('insert into "auth_attempt_phone" ') ||
                msg.startsWith('insert into "phone" ')) &&
            (time < INCIDENT_START_MS || time >= INCIDENT_END_MS)
        ) {
            throw new Error(
                `Phone evidence outside the incident date at log line ${String(lineNumber)}`,
            );
        }

        if (msg.startsWith('insert into "auth_attempt_phone" ')) {
            const values = attemptParamsSchema.safeParse(params.split(",", 8));
            if (!values.success) {
                throw new Error(
                    `Unrecognized phone attempt at log line ${String(lineNumber)}`,
                );
            }
            const [, type, , , countryCode, phoneHash, pepperVersion, userId] =
                values.data;
            const identifier = key({ phoneHash, pepperVersion });
            const existing = attempts.get(identifier);
            if (existing !== undefined) {
                if (existing.countryCode !== countryCode) {
                    throw new Error(
                        `Conflicting destination country at log line ${String(lineNumber)}`,
                    );
                }
                existing.attemptCount += 1;
            } else {
                attempts.set(identifier, {
                    phoneHash,
                    pepperVersion,
                    countryCode,
                    firstSeenAt: new Date(time).toISOString(),
                    firstAttemptLogLine: lineNumber,
                    attemptCount: 1,
                });
            }
            if (type === "register") {
                const users =
                    registrationAttemptUsers.get(identifier) ?? new Set();
                users.add(userId);
                registrationAttemptUsers.set(identifier, users);
            }
        } else if (msg.startsWith('insert into "phone" ')) {
            const values = registrationParamsSchema.safeParse(
                params.split(",", 6),
            );
            if (!values.success) {
                throw new Error(
                    `Unrecognized phone registration at log line ${String(lineNumber)}`,
                );
            }
            const [userId, , , , phoneHash, pepperVersion] = values.data;
            const registration = {
                phoneHash,
                pepperVersion,
                userId,
                registrationLogLine: lineNumber,
            };
            const identifier = key(registration);
            const previous = registrations.get(identifier);
            if (previous !== undefined && previous.userId !== userId) {
                throw new Error(
                    `Conflicting registration accounts at log line ${String(lineNumber)}`,
                );
            }
            registrations.set(identifier, registration);
        }
    }

    const entries: IncidentManifestEntry[] = [...attempts.values()].map(
        (attempt) => {
            const registration = registrations.get(key(attempt));
            const common = {
                ...attempt,
                approved: false,
                restrictAccount: false,
                reason: PENDING_REVIEW_REASON,
            };
            if (registration === undefined) {
                return { ...common, classification: "attempt_candidate" };
            }
            if (
                registrationAttemptUsers
                    .get(key(attempt))
                    ?.has(registration.userId) !== true
            ) {
                throw new Error(
                    `Registration at log line ${String(registration.registrationLogLine)} does not match a registered attempt user`,
                );
            }
            return {
                ...common,
                classification: "registered_during_incident",
                associatedUserId: registration.userId,
                registrationLogLine: registration.registrationLogLine,
            };
        },
    );
    entries.sort((a, b) => a.firstAttemptLogLine - b.firstAttemptLogLine);
    return {
        incidentId: "twilio-2026-07-28",
        reviewedBy: "",
        entries,
    };
}

if (pathToFileURL(process.argv[1]).href === import.meta.url) {
    const args = z
        .tuple([z.string().min(1), z.string().min(1)])
        .safeParse(process.argv.slice(2));
    if (!args.success) {
        throw new Error(
            "Usage: pnpm exec tsx scripts/twilio-incident-manifest.ts <api.log> <private-output.json>",
        );
    }
    const [apiLogPath, outputPath] = args.data;
    const lines = createInterface({
        input: createReadStream(apiLogPath, { encoding: "utf8" }),
        crlfDelay: Infinity,
    });
    const manifest = await extractIncidentManifest(lines);
    await writeFile(outputPath, JSON.stringify(manifest, null, 2) + "\n", {
        mode: 0o600,
        flag: "wx",
    });
    console.info(
        `Generated ${String(manifest.entries.length)} candidates, ` +
            `${String(manifest.entries.filter((entry) => entry.classification === "registered_during_incident").length)} matched registrations; none approved`,
    );
}
