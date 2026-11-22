import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
    gatheringCreation,
    createGatheringAnswerParser,
    gatheringResponseFormat,
    parseGatheringAnswers,
} from "@/shared/gathering.js";
import { Dto } from "@/shared/types/dto.js";

describe("Gathering contracts", () => {
    const field = {
        fieldId: randomUUID(),
        label: "Proposal",
        required: true,
        characterLimit: 10,
    };
    it("defaults participant admission by mode, independently of seeds", () => {
        expect(
            gatheringCreation.parse({
                gatheringMode: "new",
                responseVisibility: "everyone",
                responseFormat: [field],
            }).allowNewResponses,
        ).toBe(true);
        expect(
            gatheringCreation.parse({
                gatheringMode: "amend",
                responseVisibility: "everyone",
                sourceConversationSlugId: "abcdefgh",
                selectedResponses: [],
            }).allowNewResponses,
        ).toBe(false);
    });
    it("limits fields and rejects duplicate identities, not repeated labels", () => {
        expect(
            gatheringResponseFormat.safeParse(
                Array.from({ length: 7 }, () => ({
                    ...field,
                    fieldId: randomUUID(),
                })),
            ).success,
        ).toBe(false);
        expect(gatheringResponseFormat.safeParse([field, field]).success).toBe(
            false,
        );
        expect(
            gatheringResponseFormat.parse([
                field,
                { ...field, fieldId: randomUUID() },
            ]),
        ).toHaveLength(2);
    });
    it("parses a complete version in field order with explicit empty optional answers", () => {
        const optional = { ...field, fieldId: randomUUID(), required: false };
        expect(
            parseGatheringAnswers({
                format: [optional, field],
                answers: [{ fieldId: field.fieldId, value: "Hello" }],
            }),
        ).toEqual([
            { fieldId: optional.fieldId, value: "" },
            { fieldId: field.fieldId, value: "Hello" },
        ]);
    });
    it("rejects unknown, repeated, missing, blank and oversized answers", () => {
        for (const answers of [
            [],
            [{ fieldId: field.fieldId, value: " " }],
            [{ fieldId: field.fieldId, value: "12345678901" }],
            [{ fieldId: randomUUID(), value: "Hello" }],
            [
                { fieldId: field.fieldId, value: "Hi" },
                { fieldId: field.fieldId, value: "Hello" },
            ],
        ])
            expect(() =>
                parseGatheringAnswers({ format: [field], answers }),
            ).toThrow();
    });
    it("counts Unicode code points consistently with PostgreSQL character length", () => {
        expect(
            parseGatheringAnswers({
                format: [{ ...field, characterLimit: 2 }],
                answers: [{ fieldId: field.fieldId, value: "😀😀" }],
            }),
        ).toEqual([{ fieldId: field.fieldId, value: "😀😀" }]);
    });
    it("reuses an independently frozen format when parsing a response batch", () => {
        const rule = { ...field, characterLimit: 2 };
        const parseAnswers = createGatheringAnswerParser([rule]);
        rule.characterLimit = 100;
        expect(parseAnswers([{ fieldId: field.fieldId, value: "Hi" }])).toEqual(
            [{ fieldId: field.fieldId, value: "Hi" }],
        );
        expect(() =>
            parseAnswers([{ fieldId: field.fieldId, value: "Long" }]),
        ).toThrow();
        expect(() =>
            parseAnswers([{ fieldId: randomUUID(), value: "Hi" }]),
        ).toThrow();
    });
    it("allows a large seed batch while bounding each creation request", () => {
        const request = {
            gatheringMode: "new",
            responseVisibility: "everyone",
            responseFormat: [field],
            seedGatheringResponses: Array.from({ length: 1_000 }, () => [
                { fieldId: field.fieldId, value: "Seed" },
            ]),
        };
        expect(gatheringCreation.safeParse(request).success).toBe(true);
        expect(
            gatheringCreation.safeParse({
                ...request,
                seedGatheringResponses: [...request.seedGatheringResponses, []],
            }).success,
        ).toBe(false);
    });
    it("rejects text PostgreSQL cannot preserve without corrupting Unicode", () => {
        for (const value of ["NUL\u0000text", "\uD800", "\uDC00"]) {
            expect(() =>
                parseGatheringAnswers({
                    format: [field],
                    answers: [{ fieldId: field.fieldId, value }],
                }),
            ).toThrow();
            expect(
                gatheringResponseFormat.safeParse([{ ...field, label: value }])
                    .success,
            ).toBe(false);
            expect(
                Dto.gatheringModerateRequest.safeParse({
                    conversationSlugId: "abcdefgh",
                    responseSlugId: "ijklmnop",
                    action: "hide",
                    reason: value,
                }).success,
            ).toBe(false);
        }
    });
    it("does not accept rewritten amendment text or a mutable format in settings", () => {
        expect(
            gatheringCreation.safeParse({
                gatheringMode: "amend",
                responseVisibility: "everyone",
                sourceConversationSlugId: "abcdefgh",
                selectedResponses: [
                    {
                        responseSlugId: "ijklmnop",
                        sourceVersion: randomUUID(),
                        answers: [],
                    },
                ],
            }).success,
        ).toBe(false);
        expect(
            Dto.gatheringSettingsRequest.safeParse({
                conversationSlugId: "abcdefgh",
                allowNewResponses: true,
                responseFormat: [field],
            }).success,
        ).toBe(false);
    });
});
