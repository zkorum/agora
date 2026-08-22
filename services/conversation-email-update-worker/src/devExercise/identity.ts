import { createHash } from "node:crypto";
import { z } from "zod";

export const exerciseCohortSchema = z.enum([
    "participant_success",
    "participant_retry",
    "participant_permanent_failure",
]);

export type ExerciseCohort = z.infer<typeof exerciseCohortSchema>;

function deterministicHex({
    namespace,
    purpose,
}: {
    namespace: string;
    purpose: string;
}): string {
    return createHash("sha256")
        .update(
            `agora-conversation-email-update-exercise:${namespace}:${purpose}`,
        )
        .digest("hex");
}

export function deterministicExerciseId({
    namespace,
    purpose,
}: {
    namespace: string;
    purpose: string;
}): string {
    const hex = deterministicHex({ namespace, purpose });
    const variantNibble = ((Number.parseInt(hex[16], 16) & 0x3) | 0x8).toString(
        16,
    );
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${variantNibble}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function deterministicExerciseEmail({
    namespace,
    cohort,
    ordinal,
}: {
    namespace: string;
    cohort: ExerciseCohort;
    ordinal: number;
}): string {
    const suffix = deterministicHex({
        namespace,
        purpose: `${cohort}:${String(ordinal)}`,
    }).slice(0, 16);
    return `agora-participant-${String(ordinal).padStart(5, "0")}+${suffix}@exercise.invalid`;
}

export function deterministicExerciseUsername({
    namespace,
    ordinal,
}: {
    namespace: string;
    ordinal: number;
}): string {
    return `ceu-${deterministicHex({ namespace, purpose: `username:${String(ordinal)}` }).slice(0, 16)}`;
}

export function hashExerciseValue(value: string): string {
    return createHash("sha256").update(value).digest("hex");
}
