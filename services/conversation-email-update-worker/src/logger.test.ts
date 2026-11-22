import type { DestinationStream } from "pino";
import { DrizzleQueryError } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createStructuredLogger } from "./logger.js";
import { normalizeError, structuredEventSchema } from "./observability.js";

describe("privacy-safe structured logging", () => {
    it("recognizes the shared explicit replica-routing message", () => {
        const lines: string[] = [];
        const log = createStructuredLogger({
            environment: "test",
            workerId: "worker-01",
            level: "info",
            destination: {
                write(line) {
                    lines.push(line);
                },
            },
        });
        log.info(
            "Connected to read replica - explicit reads use replica, writes use primary",
        );
        expect(lines).toHaveLength(1);
        const parsed: unknown = JSON.parse(lines.at(0) ?? "{}");
        expect(parsed).toMatchObject({
            event: "dependency_status",
            operation: "route_reads",
            role: "read_replica",
        });
    });
    it("projects late-position event variants and removes unrelated child context", () => {
        const lines: string[] = [];
        const log = createStructuredLogger({
            environment: "test",
            workerId: "worker-01",
            level: "info",
            destination: {
                write(line) {
                    lines.push(line);
                },
            },
        });
        const event = {
            event: "worker_started",
            outcome: "started",
            sendingEnabled: true,
            killSwitch: false,
            provider: "simulated",
            heartbeatIntervalMs: 60_000,
        };
        log.child({ token: "private-capability" }).info(event);
        const parsed: unknown = JSON.parse(lines.at(0) ?? "{}");
        expect(parsed).toMatchObject(event);
        expect(lines.join("")).not.toContain("private-capability");
        log.info("%s -- %s", "select 'private-sql-value'", [
            "private-parameter",
        ]);
        expect(lines.join("")).not.toContain("private-sql-value");
        expect(lines.join("")).not.toContain("private-parameter");
    });
    it("filters persistent child bindings and hostile accessors", () => {
        const lines: string[] = [];
        const log = createStructuredLogger({
            environment: "production",
            workerId: "worker-01",
            level: "info",
            destination: {
                write(chunk) {
                    lines.push(chunk);
                },
            },
        });
        const child = log.child({
            email: "private-recipient@example.invalid",
            token: "private-capability",
            deliveryId: 7,
        });
        child.setBindings({ html: "private-message-content" });
        child.info({ event: "worker_started", outcome: "started" });
        expect(lines.join("")).not.toContain("private-");
        expect(lines.join("")).toContain('"deliveryId":7');
        const hostile = Object.defineProperty({}, "event", {
            get() {
                throw new Error("private-provider-message");
            },
        });
        expect(() => {
            log.error(hostile);
        }).not.toThrow();
        expect(lines.join("")).not.toContain("private-provider-message");
    });
    it("logs a Drizzle cause and lane without query, connection or recipient data", () => {
        const lines: string[] = [];
        const log = createStructuredLogger({
            environment: "production",
            workerId: "worker-01",
            level: "info",
            destination: {
                write: (chunk) => {
                    lines.push(chunk);
                },
            },
        });
        const privateData = {
            query: "select * from private_recipient_table where email = $1",
            email: "private-recipient@example.com",
            address: "private-database.internal",
            connectionString: "postgresql://admin:secret@private-db/agora",
            token: "private-unsubscribe-token",
            body: "Private email body",
        };
        const driverError = Object.assign(
            new Error(Object.values(privateData).join(" | ")),
            privateData,
            { code: "CONNECT_TIMEOUT" },
        );
        const error = new DrizzleQueryError(
            privateData.query,
            [privateData.email, privateData.token],
            driverError,
        );
        log.error({
            event: "iteration_failed",
            outcome: "failure",
            lane: "recipientSends",
            durationMs: 10_002,
            error: normalizeError(error),
        });
        const records = lines.map((line) => {
            const parsed: unknown = JSON.parse(line);
            return z.record(z.string(), z.unknown()).parse(parsed);
        });
        expect(records).toEqual([
            expect.objectContaining({
                event: "iteration_failed",
                lane: "recipientSends",
                error: normalizeError(error),
            }),
        ]);
        for (const value of Object.values(privateData)) {
            expect(lines.join("")).not.toContain(value);
        }
        expect(lines.join("")).toContain(
            "Caused by: Error [CONNECT_TIMEOUT]: Connection timed out",
        );
    });

    it("filters nested error metadata and rejects non-allowlisted lanes and causes", () => {
        const lines: string[] = [];
        const log = createStructuredLogger({
            environment: "production",
            workerId: "worker-01",
            level: "info",
            destination: {
                write: (chunk) => {
                    lines.push(chunk);
                },
            },
        });
        const event = {
            event: "iteration_failed",
            outcome: "failure",
            lane: "sns",
            durationMs: 10,
            error: {
                ...normalizeError(undefined),
                message: "private outer message",
                causes: [
                    {
                        name: "DatabaseError",
                        code: "CONNECT_TIMEOUT",
                        category: "retryable",
                        message: "private nested message",
                        stack: "private nested stack",
                        cause: { token: "private nested token" },
                    },
                ],
            },
        };
        log.error(event);
        log.error({ ...event, lane: "private-recipient@example.com" });
        log.error({
            ...event,
            error: {
                ...event.error,
                causes: [
                    {
                        name: "private name",
                        code: "private code",
                        category: "private category",
                    },
                ],
            },
        });
        const records = lines.map((line) => {
            const parsed: unknown = JSON.parse(line);
            return z.record(z.string(), z.unknown()).parse(parsed);
        });
        expect(records).toEqual([
            expect.objectContaining(structuredEventSchema.parse(event)),
            expect.objectContaining({ event: "unclassified_log" }),
            expect.objectContaining({ event: "unclassified_log" }),
        ]);
        expect(lines.join("")).not.toContain("private");
    });

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
        log.error({ err: unsafeError, body: forbidden }, forbidden.join(" "));
        log.info({
            event: "worker_started",
            outcome: "started",
            destinationEmail: forbidden.at(0),
            authorization: forbidden.at(7),
        });
        log.info({
            event: "iteration_failed",
            outcome: "failure",
            lane: "recovery",
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
                    error: normalizeError(unsafeError),
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
            'AGORA_LOAD_EVENT {"service":"conversation-email-update-worker","event":"simulator_started","provider":"simulated","mode":"success"}',
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
                error: normalizeError(postgresError),
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
        expect(serialized).toContain("23505");
        expect(serialized).not.toContain("private SQL constraint details");
        expect(serialized).not.toContain("unknown private dependency context");
    });
});
