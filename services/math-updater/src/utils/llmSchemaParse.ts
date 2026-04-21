import {
    zodGenLabelSummaryOutputLoose,
    zodGenLabelSummaryOutputStrict,
    type GenLabelSummaryOutputLoose,
    type GenLabelSummaryOutputStrict,
} from "@/shared-backend/llmSchemas.js";
import type { JSONObject } from "extract-first-json";
import type { ZodError } from "zod";

export const parsedGenLabelSummaryOutputModes = {
    strict: "strict",
    loose: "loose",
} as const;

export type ParsedGenLabelSummaryOutputMode =
    (typeof parsedGenLabelSummaryOutputModes)[keyof typeof parsedGenLabelSummaryOutputModes];

export type ParsedGenLabelSummaryOutput =
    | {
          mode: typeof parsedGenLabelSummaryOutputModes.strict;
          data: GenLabelSummaryOutputStrict;
      }
    | {
          mode: typeof parsedGenLabelSummaryOutputModes.loose;
          data: GenLabelSummaryOutputLoose;
          strictError: ZodError;
      };

export function parseGenLabelSummaryOutput(
    modelResponse: JSONObject,
): ParsedGenLabelSummaryOutput {
    const resultStrict = zodGenLabelSummaryOutputStrict.safeParse(modelResponse);
    if (resultStrict.success) {
        return {
            mode: parsedGenLabelSummaryOutputModes.strict,
            data: resultStrict.data,
        };
    }

    const resultLoose = zodGenLabelSummaryOutputLoose.safeParse(modelResponse);
    if (resultLoose.success) {
        return {
            mode: parsedGenLabelSummaryOutputModes.loose,
            data: resultLoose.data,
            strictError: resultStrict.error,
        };
    }

    throw new Error(
        `[LLM]: Unable to parse AI Label and Summary output object using loose mode:\n'${JSON.stringify(
            modelResponse,
        )}'`,
        { cause: resultLoose.error },
    );
}
