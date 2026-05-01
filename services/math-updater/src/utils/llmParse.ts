import { log } from "@/app.js";
import { extractJSONObject } from "extract-first-json";
import { parseJSONObject, type JSONObject } from "parse-json-object";

export function parseLlmOutputJson(rawLlmOutput: string): JSONObject {
    const candidateOutputs = getCandidateLlmOutputs(rawLlmOutput);
    const parsedJSON = parseFirstJSONObject(candidateOutputs);
    if (parsedJSON !== undefined) {
        return parsedJSON;
    }

    const repairedCandidateOutputs =
        getRepairedCandidateLlmOutputs(candidateOutputs);
    const repairedParsedJSON = parseFirstJSONObject(repairedCandidateOutputs);
    if (repairedParsedJSON !== undefined) {
        log.warn(
            "[LLM]: Recovered malformed JSON by inserting missing object-property comma(s)",
        );
        return repairedParsedJSON;
    }

    log.warn(
        `[LLM]: Unable to parse model response to JSON directly--attempting to extract first JSON:\n${rawLlmOutput}`,
    );
    for (const candidateOutput of [
        ...candidateOutputs,
        ...repairedCandidateOutputs,
    ]) {
        const extractedJSON = extractJSONObject(candidateOutput);
        if (extractedJSON !== undefined) {
            return extractedJSON;
        }
    }
    throw new Error(
        `[LLM]: Unable to extract first JSON object from llm output:\n${rawLlmOutput}`,
    );
}

function parseFirstJSONObject(
    candidateOutputs: string[],
): JSONObject | undefined {
    for (const candidateOutput of candidateOutputs) {
        const parsedJSON = parseJSONObject(candidateOutput);
        if (parsedJSON !== undefined) {
            return parsedJSON;
        }
    }
    return undefined;
}

function getRepairedCandidateLlmOutputs(candidateOutputs: string[]): string[] {
    return Array.from(
        new Set(
            candidateOutputs
                .map(repairMissingCommasBetweenObjectProperties)
                .filter(
                    (candidateOutput, index) =>
                        candidateOutput !== candidateOutputs[index],
                ),
        ),
    );
}

function repairMissingCommasBetweenObjectProperties(
    candidateOutput: string,
): string {
    return candidateOutput.replaceAll(
        /("(?:[^"\\]|\\.)*")(\s+)(?="(?:[^"\\]|\\.)*"\s*:)/g,
        "$1,$2",
    );
}

export function getCandidateLlmOutputs(rawLlmOutput: string): string[] {
    const trimmedOutput = rawLlmOutput.trim();
    const markdownCodeFenceRegExp = /^```(?:json)?\s*([\s\S]*?)\s*```$/i;
    const markdownCodeFenceMatch = markdownCodeFenceRegExp.exec(trimmedOutput);
    const unfencedOutput = markdownCodeFenceMatch?.[1]?.trim();
    return Array.from(
        new Set(
            [trimmedOutput, unfencedOutput].filter(
                (candidateOutput): candidateOutput is string =>
                    candidateOutput !== undefined && candidateOutput.length > 0,
            ),
        ),
    );
}
