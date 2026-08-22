/** **** WARNING: GENERATED FROM SHARED-BACKEND DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
import { describe, expect, it, vi } from "vitest";
import { DrizzleFastifyLogger } from "./logger.js";

describe("DrizzleFastifyLogger", () => {
    it("omits parameter values when production redaction is enabled", () => {
        const info = vi.fn();
        const logger = new DrizzleFastifyLogger({
            fastifyLogger: { info, error: vi.fn() },
            includeParams: false,
        });

        logger.logQuery("insert into auth_attempt_email values ($1)", [123456]);

        expect(info).toHaveBeenCalledWith(
            "%s -- parameterCount=%d",
            "insert into auth_attempt_email values ($1)",
            1,
        );
        expect(JSON.stringify(info.mock.calls)).not.toContain("123456");
    });

    it("keeps parameter values in non-production diagnostics", () => {
        const info = vi.fn();
        const logger = new DrizzleFastifyLogger({
            fastifyLogger: { info, error: vi.fn() },
            includeParams: true,
        });

        logger.logQuery("select $1", ["diagnostic-value"]);

        expect(info).toHaveBeenCalledWith("%s -- %s", "select $1", [
            "diagnostic-value",
        ]);
    });
});
