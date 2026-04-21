import { deepEqual, equal, throws } from "node:assert/strict";
import test from "node:test";
import { parseGenLabelSummaryOutput } from "./llmSchemaParse.js";

void test("parseGenLabelSummaryOutput returns strict mode for fully valid output", () => {
    const parsed = parseGenLabelSummaryOutput({
        clusters: {
            0: {
                reasoning: "r",
                label: "Humanists",
                summary: "s",
            },
        },
    });

    equal(parsed.mode, "strict");
    deepEqual(parsed.data, {
        clusters: {
            0: {
                reasoning: "r",
                label: "Humanists",
                summary: "s",
            },
        },
    });
});

void test("parseGenLabelSummaryOutput returns strict mode for empty clusters", () => {
    const parsed = parseGenLabelSummaryOutput({
        clusters: {},
    });

    equal(parsed.mode, "strict");
    deepEqual(parsed.data, {
        clusters: {},
    });
});

void test(
    "parseGenLabelSummaryOutput strips unexpected top-level and cluster fields in strict mode",
    () => {
        const parsed = parseGenLabelSummaryOutput({
            clusters: {
                0: {
                    reasoning: "r",
                    label: "Humanists",
                    summary: "s",
                    confidence: 0.9,
                },
            },
            notes: "ignore me",
        });

        equal(parsed.mode, "strict");
        deepEqual(parsed.data, {
            clusters: {
                0: {
                    reasoning: "r",
                    label: "Humanists",
                    summary: "s",
                },
            },
        });
    },
);

void test("parseGenLabelSummaryOutput accepts exactly two-word labels in strict mode", () => {
    const parsed = parseGenLabelSummaryOutput({
        clusters: {
            0: {
                reasoning: "r",
                label: "Peace Builders",
                summary: "s",
            },
        },
    });

    equal(parsed.mode, "strict");
    deepEqual(parsed.data, {
        clusters: {
            0: {
                reasoning: "r",
                label: "Peace Builders",
                summary: "s",
            },
        },
    });
});

void test("parseGenLabelSummaryOutput accepts strict boundary lengths", () => {
    const parsed = parseGenLabelSummaryOutput({
        clusters: {
            0: {
                reasoning: "r".repeat(2000),
                label: "L".repeat(100),
                summary: "s".repeat(1000),
            },
        },
    });

    equal(parsed.mode, "strict");
    deepEqual(parsed.data, {
        clusters: {
            0: {
                reasoning: "r".repeat(2000),
                label: "L".repeat(100),
                summary: "s".repeat(1000),
            },
        },
    });
});

void test("parseGenLabelSummaryOutput returns loose mode when reasoning is missing", () => {
    const parsed = parseGenLabelSummaryOutput({
        clusters: {
            0: {
                label: "Humanists",
                summary: "s",
            },
        },
    });

    equal(parsed.mode, "loose");
    deepEqual(parsed.data, {
        clusters: {
            0: {
                label: "Humanists",
                summary: "s",
            },
        },
    });
});

void test("parseGenLabelSummaryOutput returns loose mode when strict label rules fail", () => {
    const parsed = parseGenLabelSummaryOutput({
        clusters: {
            0: {
                reasoning: "r",
                label: "Very Curious Thinkers",
                summary: "s",
            },
        },
    });

    equal(parsed.mode, "loose");
    deepEqual(parsed.data, {
        clusters: {
            0: {
                reasoning: "r",
                label: "Very Curious Thinkers",
                summary: "s",
            },
        },
    });
});

void test(
    "parseGenLabelSummaryOutput returns loose mode when strict length limits fail",
    () => {
        const parsed = parseGenLabelSummaryOutput({
            clusters: {
                0: {
                    reasoning: "r".repeat(2001),
                    label: "Humanists",
                    summary: "s".repeat(1001),
                },
            },
        });

        equal(parsed.mode, "loose");
        deepEqual(parsed.data, {
            clusters: {
                0: {
                    reasoning: "r".repeat(2001),
                    label: "Humanists",
                    summary: "s".repeat(1001),
                },
            },
        });
    },
);

void test(
    "parseGenLabelSummaryOutput returns loose mode when the label exceeds the strict max length",
    () => {
        const parsed = parseGenLabelSummaryOutput({
            clusters: {
                0: {
                    reasoning: "r",
                    label: "L".repeat(101),
                    summary: "s",
                },
            },
        });

        equal(parsed.mode, "loose");
        deepEqual(parsed.data, {
            clusters: {
                0: {
                    reasoning: "r",
                    label: "L".repeat(101),
                    summary: "s",
                },
            },
        });
    },
);

void test("parseGenLabelSummaryOutput throws when both strict and loose parsing fail", () => {
    throws(
        () =>
            parseGenLabelSummaryOutput({
                clusters: {
                    0: {
                        label: "Humanists",
                    },
                },
            }),
        /Unable to parse AI Label and Summary output object using loose mode/,
    );
});

void test("parseGenLabelSummaryOutput throws for unsupported cluster keys", () => {
    throws(
        () =>
            parseGenLabelSummaryOutput({
                clusters: {
                    6: {
                        reasoning: "r",
                        label: "Humanists",
                        summary: "s",
                    },
                },
            }),
        /Unable to parse AI Label and Summary output object using loose mode/,
    );
});

void test("parseGenLabelSummaryOutput throws when clusters is not an object", () => {
    throws(
        () => parseGenLabelSummaryOutput({ clusters: "invalid" }),
        /Unable to parse AI Label and Summary output object using loose mode/,
    );
});
