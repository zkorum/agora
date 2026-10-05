import { z } from "zod";

export const PENDING_REVIEW_REASON =
    "Twilio incident 2026-07-28 (pending review)";

const evidenceSchema = z.strictObject({
    phoneHash: z.string().regex(/^[A-Za-z0-9+/]{43}=?$/),
    pepperVersion: z.number().int().nonnegative(),
    countryCode: z.string().regex(/^[A-Z]{2}$/),
    firstSeenAt: z.iso.datetime(),
    firstAttemptLogLine: z.number().int().positive(),
    attemptCount: z.number().int().positive(),
    approved: z.boolean(),
    restrictAccount: z.boolean(),
    reason: z.string().trim().min(1).max(250),
});

export const incidentManifestEntrySchema = z
    .discriminatedUnion("classification", [
        evidenceSchema.extend({
            classification: z.literal("attempt_candidate"),
        }),
        evidenceSchema.extend({
            classification: z.literal("registered_during_incident"),
            associatedUserId: z.uuid(),
            registrationLogLine: z.number().int().positive(),
        }),
    ])
    .refine(
        (entry) =>
            !entry.restrictAccount ||
            (entry.approved &&
                entry.classification === "registered_during_incident"),
        {
            message:
                "Account restriction requires an approved exact registration",
        },
    );

export const incidentManifestSchema = z.strictObject({
    incidentId: z.literal("twilio-2026-07-28"),
    reviewedBy: z.string().trim(),
    entries: z.array(incidentManifestEntrySchema),
});

export type IncidentManifest = z.infer<typeof incidentManifestSchema>;
export type IncidentManifestEntry = IncidentManifest["entries"][number];
