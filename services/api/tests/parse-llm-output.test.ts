import { expect, test } from "vitest";
import { parseLlmOutputJson } from "../src/utils/llmParse.js";

test("extracts a fenced JSON object surrounded by provider prose", () => {
    const reply = [
        "Here is the result:",
        "```json",
        '{"summary":"Improve bus service","clusters":{"0":{"label":"More routes"}}}',
        "```",
        "This summarizes the discussion.",
    ].join("\n");

    expect(parseLlmOutputJson(reply)).toStrictEqual({
        summary: "Improve bus service",
        clusters: { "0": { label: "More routes" } },
    });
});
