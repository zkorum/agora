import type { DestinationStream } from "pino";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createStructuredLogger } from "./logger.js";
import { normalizeError } from "./observability.js";

describe("privacy-safe structured logging", () => {
    it("serializes allowlisted fields without PII or secrets", () => {
        const lines: string[] = [];
        const destination: DestinationStream = {
            write: (chunk) => {
                lines.push(chunk);
            },
        };
        const log = createStructuredLogger({
            environment: "production",
            workerId: "worker-01",
            level: "info",
            destination,
        });
        const forbidden = [
            "destination@example.com",
            "private-username",
            "9ad53fe4-bc87-471d-bc22-d12f207de7c4",
            "Private subject",
            "Private body",
            "eyJhbGciOiJIUzI1NiJ9.private.signature",
            "https://example.com/unsubscribe?token=secret-token",
            "Bearer authorization-secret",
            "postgresql://admin:database-secret@db.example.com/agora",
            "aws-secret-access-key-value",
            "OTP 123456",
        ];
        const unsafeError = Object.assign(new Error(forbidden.join(" | ")), {
            code: "ETIMEDOUT",
            destinationEmail: forbidden.at(0),
        });

        log.error(unsafeError, forbidden.join(" "));
        log.info({
            event: "worker_started",
            outcome: "started",
            destinationEmail: forbidden.at(0),
            authorization: forbidden.at(7),
        });
        log.info({
            event: "iteration_failed",
            outcome: "failure",
            durationMs: 12,
            error: normalizeError(unsafeError),
        });
        log.info("%s -- %s", "select * from users where email = $1", [
            forbidden.at(0),
        ]);

        const serialized = lines.join("");
        for (const value of forbidden) expect(serialized).not.toContain(value);
        const records = lines.map((line) => {
            const parsed: unknown = JSON.parse(line);
            return z.record(z.string(), z.unknown()).parse(parsed);
        });
        expect(records).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    service: "conversation-email-update-worker",
                    environment: "production",
                    workerId: "worker-01",
                    event: "unclassified_log",
                    outcome: "failure",
                    severity: "error",
                    error: {
                        name: "DatabaseError",
                        code: "ETIMEDOUT",
                        category: "ambiguous",
                    },
                }),
                expect.objectContaining({
                    event: "iteration_failed",
                    outcome: "failure",
                }),
            ]),
        );
        expect(serialized).not.toContain("select * from users");
    });

    it("keeps the load-test marker without exposing unrelated arguments", () => {
        const lines: string[] = [];
        const log = createStructuredLogger({
            environment: "development",
            workerId: "worker-02",
            level: "info",
            destination: {
                write: (chunk) => {
                    lines.push(chunk);
                },
            },
        });

        log.info(
            'AGORA_LOAD_EVENT {"service":"conversation-email-update-worker","event":"simulator_started","provider":"ses","mode":"success"}',
        );

        expect(lines.join("")).toContain("AGORA_LOAD_EVENT");
    });

    it("maps only known dependency messages to allowlisted context", () => {
        const lines: string[] = [];
        const log = createStructuredLogger({
            environment: "production",
            workerId: "worker-03",
            level: "info",
            destination: {
                write: (chunk) => {
                    lines.push(chunk);
                },
            },
        });
        const postgresError = Object.assign(
            new Error("private SQL constraint details"),
            { code: "23505" },
        );

        log.info("[DB] PostgreSQL read replica connection verified");
        log.error(
            postgresError,
            "[DB] PostgreSQL primary unavailable; retrying in 5000ms",
        );
        log.error("No secret found");
        log.info("unknown private dependency context");

        const records = lines.map((line) => {
            const parsed: unknown = JSON.parse(line);
            return z.record(z.string(), z.unknown()).parse(parsed);
        });
        expect(records).toEqual([
            expect.objectContaining({
                event: "dependency_status",
                outcome: "success",
                dependency: "postgresql",
                operation: "connect",
                role: "read_replica",
                retrying: false,
            }),
            expect.objectContaining({
                event: "dependency_failed",
                outcome: "failure",
                dependency: "postgresql",
                operation: "connect",
                role: "primary",
                retrying: true,
                error: {
                    name: "DatabaseError",
                    code: "PostgresSqlState",
                    category: "database",
                },
            }),
            expect.objectContaining({
                event: "dependency_failed",
                outcome: "failure",
                dependency: "aws_secrets_manager",
                operation: "load_credentials",
                retrying: false,
            }),
            expect.objectContaining({
                event: "unclassified_log",
                outcome: "info",
                severity: "info",
            }),
        ]);
        const serialized = lines.join("");
        expect(serialized).not.toContain("23505");
        expect(serialized).not.toContain("private SQL constraint details");
        expect(serialized).not.toContain("unknown private dependency context");
    });
});
