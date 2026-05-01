import { deepEqual, throws } from "node:assert/strict";
import test from "node:test";
import { getCandidateLlmOutputs, parseLlmOutputJson } from "./llmParse.js";

void test("getCandidateLlmOutputs includes fenced and unfenced candidates", () => {
    const rawLlmOutput = ["```json", '{"clusters":{}}', "```"].join("\n");

    deepEqual(getCandidateLlmOutputs(rawLlmOutput), [
        '```json\n{"clusters":{}}\n```',
        '{"clusters":{}}',
    ]);
});

void test("getCandidateLlmOutputs trims whitespace for raw JSON", () => {
    deepEqual(getCandidateLlmOutputs('\n  {"clusters":{}}  \n'), [
        '{"clusters":{}}',
    ]);
});

void test("getCandidateLlmOutputs returns no candidates for whitespace-only input", () => {
    deepEqual(getCandidateLlmOutputs(" \n\t "), []);
});

void test("getCandidateLlmOutputs supports fenced JSON without a language tag", () => {
    const rawLlmOutput = ["```", '{"clusters":{}}', "```"].join("\n");

    deepEqual(getCandidateLlmOutputs(rawLlmOutput), [
        '```\n{"clusters":{}}\n```',
        '{"clusters":{}}',
    ]);
});

void test("getCandidateLlmOutputs supports uppercase JSON language tags", () => {
    const rawLlmOutput = ["```JSON", '{"clusters":{}}', "```"].join("\n");

    deepEqual(getCandidateLlmOutputs(rawLlmOutput), [
        '```JSON\n{"clusters":{}}\n```',
        '{"clusters":{}}',
    ]);
});

void test("parseLlmOutputJson parses raw JSON with surrounding whitespace", () => {
    deepEqual(parseLlmOutputJson('\n  {"clusters":{}}\n'), {
        clusters: {},
    });
});

void test("parseLlmOutputJson parses markdown-fenced JSON", () => {
    const rawLlmOutput = [
        "```json",
        "{",
        '  "clusters": {',
        '    "0": {',
        '      "reasoning": "r",',
        '      "label": "Humanists",',
        '      "summary": "s"',
        "    }",
        "  }",
        "}",
        "```",
    ].join("\n");

    deepEqual(parseLlmOutputJson(rawLlmOutput), {
        clusters: {
            0: {
                reasoning: "r",
                label: "Humanists",
                summary: "s",
            },
        },
    });
});

void test("parseLlmOutputJson repairs a missing comma between object properties", () => {
    const rawLlmOutput = [
        "```json",
        "{",
        '  "clusters": {',
        '    "1": {',
        '      "reasoning": "agreesWith includes L\'IA n\'est pas un risque and concrete harms"',
        '      "label": "Institutionalists",',
        '      "summary": "This cluster focuses on near-term risks."',
        "    }",
        "  }",
        "}",
        "```",
    ].join("\n");

    deepEqual(parseLlmOutputJson(rawLlmOutput), {
        clusters: {
            1: {
                reasoning:
                    "agreesWith includes L'IA n'est pas un risque and concrete harms",
                label: "Institutionalists",
                summary: "This cluster focuses on near-term risks.",
            },
        },
    });
});

void test("parseLlmOutputJson extracts JSON from prefixed markdown", () => {
    const rawLlmOutput = [
        "Here is the JSON:",
        "```json",
        "{",
        '  "clusters": {}',
        "}",
        "```",
    ].join("\n");

    deepEqual(parseLlmOutputJson(rawLlmOutput), { clusters: {} });
});

void test("parseLlmOutputJson parses markdown-fenced JSON without a language tag", () => {
    const rawLlmOutput = ["```", '{"clusters":{}}', "```"].join("\n");

    deepEqual(parseLlmOutputJson(rawLlmOutput), { clusters: {} });
});

void test("parseLlmOutputJson throws when no JSON object is present", () => {
    throws(
        () => parseLlmOutputJson("No structured output available."),
        /Unable to extract first JSON object/,
    );
});

void test("parseLlmOutputJson throws for whitespace-only input", () => {
    throws(
        () => parseLlmOutputJson(" \n\t "),
        /Unable to extract first JSON object/,
    );
});

void test("parseLlmOutputJson throws for a lone opening code fence", () => {
    throws(
        () => parseLlmOutputJson("```"),
        /Unable to extract first JSON object/,
    );
});

void test("parseLlmOutputJson extracts JSON from incomplete fenced output", () => {
    const rawLlmOutput = ["```json", '{"clusters":{}}'].join("\n");

    deepEqual(parseLlmOutputJson(rawLlmOutput), { clusters: {} });
});

void test("parseLlmOutputJson extracts JSON from surrounding prose without markdown", () => {
    const rawLlmOutput =
        'Here is the payload: {"clusters":{}}. Use it to continue.';

    deepEqual(parseLlmOutputJson(rawLlmOutput), { clusters: {} });
});
