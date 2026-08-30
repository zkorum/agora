/** **** WARNING: GENERATED FROM SHARED-BACKEND DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
import { describe, expect, it, vi } from "vitest";
import { DrizzleFastifyLogger, safeDependencyError } from "./logger.js";

describe("DrizzleFastifyLogger", () => {
    it("never logs parameter values", () => {
        const info = vi.fn();
        const logger = new DrizzleFastifyLogger({
            fastifyLogger: { info },
        });

        logger.logQuery("insert into auth_attempt_email values ($1)", [123456]);

        expect(info).toHaveBeenCalledWith(
            "%s -- parameterCount=%d",
            "insert into auth_attempt_email values ($1)",
            1,
        );
        expect(JSON.stringify(info.mock.calls)).not.toContain("123456");
    });
});

describe("safeDependencyError", () => {
    it("omits dependency messages while retaining safe identifiers", () => {
        const error = Object.assign(
            new Error("postgresql://user:database-password@example.invalid/db"),
            { code: "08006" },
        );

        const safeError = safeDependencyError(error);
        expect(safeError).toEqual({
            errorType: "Error",
            errorCode: "PostgresSqlState",
        });
        expect(JSON.stringify(safeError)).not.toContain("database-password");
    });
});
