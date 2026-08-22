/** **** WARNING: GENERATED FROM SHARED-BACKEND DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
import { z } from "zod";

/**
 * Zod schemas for LLM label and summary generation output.
 * Used by math-updater and api services only.
 */

const zodGenLabelSummaryOutputClusterValue = z.object({
    reasoning: z.string().max(2000),
    label: z
        .string()
        .max(100)
        .regex(/^\S+(?:\s\S+)?$/, "Label must be exactly 1 or 2 words"),
    summary: z.string().max(1000),
});

const zodGenLabelSummaryOutputClusterKey = z.enum([
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
]);

export const zodGenLabelSummaryOutputClusterStrict = z.partialRecord(
    zodGenLabelSummaryOutputClusterKey,
    zodGenLabelSummaryOutputClusterValue,
);

export const zodGenLabelSummaryOutputClusterLoose = z.partialRecord(
    zodGenLabelSummaryOutputClusterKey,
    z.object({
        reasoning: z.string().optional(),
        label: z.string(),
        summary: z.string(),
    }),
);

export const zodGenLabelSummaryOutputStrict = z.object({
    clusters: zodGenLabelSummaryOutputClusterStrict,
});

export const zodGenLabelSummaryOutputLoose = z.object({
    clusters: zodGenLabelSummaryOutputClusterLoose,
});

// Type exports
export type GenLabelSummaryOutputClusterStrict = z.infer<
    typeof zodGenLabelSummaryOutputClusterStrict
>;
export type GenLabelSummaryOutputClusterLoose = z.infer<
    typeof zodGenLabelSummaryOutputClusterLoose
>;
export type GenLabelSummaryOutputStrict = z.infer<
    typeof zodGenLabelSummaryOutputStrict
>;
export type GenLabelSummaryOutputLoose = z.infer<
    typeof zodGenLabelSummaryOutputLoose
>;
