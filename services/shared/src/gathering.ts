import { z } from "zod";
import { zodSlugId } from "./types/zod-slug-id.js";

import {
    MAX_GATHERING_FIELDS,
    MAX_GATHERING_TEXT_LENGTH,
    MAX_SEED_GATHERING_RESPONSES_PER_CREATION,
} from "./gatheringLimits.js";

// PostgreSQL text cannot store NUL. Reject lone surrogates too, rather than
// silently replacing user text when the driver encodes it as UTF-8.
export const gatheringText = z
    .string()
    .refine(
        (value) => !value.includes("\u0000") && !/[\uD800-\uDFFF]/u.test(value),
        "Gathering text must contain valid Unicode without NUL",
    );

export const gatheringFieldInput = z
    .object({
        fieldId: z.uuid(),
        label: gatheringText.trim().min(1).max(200),
        required: z.boolean(),
        characterLimit: z.number().int().min(1).max(MAX_GATHERING_TEXT_LENGTH),
    })
    .strict();
export const gatheringResponseFormat = z
    .array(gatheringFieldInput)
    .min(1)
    .max(MAX_GATHERING_FIELDS)
    .refine(
        (fields) =>
            new Set(fields.map((field) => field.fieldId)).size ===
            fields.length,
        "Duplicate field identity",
    );
export const gatheringAnswerInput = z
    .object({
        fieldId: z.uuid(),
        value: gatheringText
            .max(MAX_GATHERING_TEXT_LENGTH * 2)
            .refine(
                (value) =>
                    Array.from(value).length <= MAX_GATHERING_TEXT_LENGTH,
                "Gathering answer exceeds character limit",
            ),
    })
    .strict();
export const gatheringAnswers = z
    .array(gatheringAnswerInput)
    .max(MAX_GATHERING_FIELDS)
    .refine(
        (answers) =>
            new Set(answers.map((answer) => answer.fieldId)).size ===
            answers.length,
        "Duplicate answer field",
    );
export const gatheringVisibility = z.enum(["everyone", "facilitators"]);
export const gatheringCreation = z.discriminatedUnion("gatheringMode", [
    z
        .object({
            gatheringMode: z.literal("new"),
            allowNewResponses: z.boolean().default(true),
            responseVisibility: gatheringVisibility,
            responseFormat: gatheringResponseFormat,
            seedGatheringResponses: z
                .array(gatheringAnswers)
                .max(MAX_SEED_GATHERING_RESPONSES_PER_CREATION)
                .default([]),
        })
        .strict(),
    z
        .object({
            gatheringMode: z.literal("amend"),
            allowNewResponses: z.boolean().default(false),
            responseVisibility: gatheringVisibility,
            sourceConversationSlugId: zodSlugId,
            selectedResponses: z
                .array(
                    z
                        .object({
                            responseSlugId: zodSlugId,
                            sourceVersion: z.uuid(),
                        })
                        .strict(),
                )
                .max(1000)
                .refine(
                    (responses) =>
                        new Set(
                            responses.map(
                                (response) => response.responseSlugId,
                            ),
                        ).size === responses.length,
                    "Duplicate source response",
                ),
            // Seeds in an amendment use the source field identities, mapped by the server.
            seedGatheringResponses: z
                .array(gatheringAnswers)
                .max(MAX_SEED_GATHERING_RESPONSES_PER_CREATION)
                .default([]),
        })
        .strict(),
]);

/** Compile one frozen format once for a batch of complete response versions. */
export function createGatheringAnswerParser(
    format: z.infer<typeof gatheringResponseFormat>,
) {
    const fields = gatheringResponseFormat.parse(format);
    const knownFields = new Set(fields.map((field) => field.fieldId));
    return (answers: z.infer<typeof gatheringAnswers>) => {
        const parsed = gatheringAnswers.parse(answers);
        const byField = new Map(
            parsed.map((answer) => [answer.fieldId, answer.value]),
        );
        if (parsed.some((answer) => !knownFields.has(answer.fieldId))) {
            throw new Error("Unknown Gathering field");
        }
        return fields.map((field) => {
            const value = byField.get(field.fieldId) ?? "";
            if (field.required && value.trim().length === 0) {
                throw new Error("Required Gathering answer missing");
            }
            if (Array.from(value).length > field.characterLimit) {
                throw new Error("Gathering answer exceeds character limit");
            }
            return { fieldId: field.fieldId, value };
        });
    };
}

/** Parse one complete response against its frozen format, including omitted optional fields. */
export function parseGatheringAnswers({
    format,
    answers,
}: {
    format: z.infer<typeof gatheringResponseFormat>;
    answers: z.infer<typeof gatheringAnswers>;
}) {
    return createGatheringAnswerParser(format)(answers);
}
