import { describe, expect, it } from "vitest";
import { normalizeError, safeErrorSchema } from "./observability.js";

describe("safe error causes", () => {
    it.each([
        { code: "CONNECT_TIMEOUT", category: "retryable" },
        { code: "CONNECTION_CLOSED", category: "ambiguous" },
        { code: "CONNECTION_DESTROYED", category: "ambiguous" },
        { code: "CONNECTION_ENDED", category: "ambiguous" },
        { code: "EAI_AGAIN", category: "retryable" },
        { code: "ENOTFOUND", category: "retryable" },
        { code: "ECONNREFUSED", category: "retryable" },
        { code: "ECONNRESET", category: "retryable" },
        { code: "EPIPE", category: "retryable" },
        { code: "ETIMEDOUT", category: "ambiguous" },
    ])("classifies direct and wrapped $code", ({ code, category }) => {
        const driverError = Object.assign(new Error("private host"), { code });
        const expected = { name: "DatabaseError", code, category };
        expect(normalizeError(driverError)).toEqual(expected);
        const wrapped = new Error("private query", { cause: driverError });
        expect(normalizeError(wrapped)).toEqual({
            name: "ApplicationError",
            code: "UnknownError",
            category: "application",
            causes: [expected],
        });
    });

    it("keeps nested SQLSTATEs generic and unknown names and codes private", () => {
        const error = Object.assign(new Error("private message"), {
            name: "private-name@example.com",
            code: "private-code@example.com",
            cause: {
                code: "23505",
                detail: "private constraint data",
                cause: { code: "private-nested-code@example.com" },
            },
        });
        expect(normalizeError(error)).toEqual({
            name: "ApplicationError",
            code: "UnknownError",
            category: "application",
            causes: [
                {
                    name: "DatabaseError",
                    code: "PostgresSqlState",
                    category: "database",
                },
                {
                    name: "ApplicationError",
                    code: "UnknownError",
                    category: "application",
                },
            ],
        });
    });

    it("bounds deep chains and stops at cycles", () => {
        let deep = new Error("private leaf");
        for (let depth = 0; depth < 20; depth += 1) {
            deep = new Error("private wrapper", { cause: deep });
        }
        const summary = normalizeError(deep);
        expect(summary.causes).toHaveLength(4);
        expect(safeErrorSchema.safeParse(summary).success).toBe(true);
        expect(
            safeErrorSchema.safeParse({
                ...summary,
                causes: Array.from({ length: 5 }, () =>
                    normalizeError(undefined),
                ),
            }).success,
        ).toBe(false);

        const first = new Error("private first");
        const second = Object.assign(new Error("private second"), {
            code: "CONNECT_TIMEOUT",
            cause: first,
        });
        first.cause = second;
        expect(normalizeError(first).causes).toEqual([
            {
                name: "DatabaseError",
                code: "CONNECT_TIMEOUT",
                category: "retryable",
            },
        ]);
        first.cause = first;
        expect(normalizeError(first).causes).toBeUndefined();
    });

    it.each([undefined, null, "private thrown string", 42])(
        "handles non-error thrown values without exposing them",
        (error) => {
            expect(normalizeError(error)).toEqual({
                name: "ApplicationError",
                code: "UnknownError",
                category: "application",
            });
        },
    );
});
