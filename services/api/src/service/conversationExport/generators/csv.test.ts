import { describe, expect, it } from "vitest";
import { buildCsvBuffer } from "./csv.js";
import {
    surveyAggregateHeaders,
    surveyParticipantResponseHeaders,
} from "./surveyHeaders.js";

describe("buildCsvBuffer", () => {
    it("writes survey participant response headers even when there are no rows", async () => {
        const csvBuffer = await buildCsvBuffer({
            headers: surveyParticipantResponseHeaders,
            rows: [],
        });

        expect(csvBuffer.toString("utf8").trimEnd()).toBe(
            surveyParticipantResponseHeaders.join(","),
        );
    });

    it("writes survey aggregate headers even when there are no rows", async () => {
        const csvBuffer = await buildCsvBuffer({
            headers: surveyAggregateHeaders,
            rows: [],
        });

        expect(csvBuffer.toString("utf8").trimEnd()).toBe(
            surveyAggregateHeaders.join(","),
        );
    });
});
