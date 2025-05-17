import { log } from "@/app.js";
import { extractJSONObject } from "extract-first-json";
import { parseJSONObject, type JSONObject } from "parse-json-object";

export function parseLlmOutputJson(rawLlmOutput: string): JSONObject {
    const parsedJSON = parseJSONObject(rawLlmOutput);
    if (parsedJSON !== undefined) {
        return parsedJSON;
    }
    log.warn(
        `[LLM]: Unable to parse model reponse to JSON--attempting to extract first JSON:\n${rawLlmOutput}`,
    );
    const extractedJSON = extractJSONObject(rawLlmOutput);
    if (extractedJSON === undefined) {
        throw new Error(
            `[LLM]: Unable to extract first JSON object from llm output:\n${rawLlmOutput}`,
        );
    }
    return extractedJSON;
}
