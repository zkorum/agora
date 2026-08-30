/** **** WARNING: GENERATED FROM SHARED-BACKEND DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sharedConfigSchema } from "./config.js";

const mocks = vi.hoisted(() => {
    const firstUnlisten = vi.fn(async () => {
        await Promise.resolve();
    });
    const secondUnlisten = vi.fn(async () => {
        await Promise.resolve();
    });
    const firstListener = { unlisten: firstUnlisten };
    const secondListener = { unlisten: secondUnlisten };
    const listen = vi.fn(async () => await Promise.resolve(firstListener));
    const end = vi.fn(async () => {
        await Promise.resolve();
    });
    const query = vi.fn(async () => await Promise.resolve([]));
    const client = Object.assign(query, { listen, end });
    const postgres = vi.fn(() => client);
    const db = { kind: "drizzle-database" };
    const drizzle = vi.fn(() => db);

    return {
        client,
        db,
        drizzle,
        end,
        firstListener,
        firstUnlisten,
        listen,
        postgres,
        query,
        secondListener,
        secondUnlisten,
    };
});

vi.mock("postgres", () => ({ default: mocks.postgres }));
vi.mock("drizzle-orm/postgres-js", () => ({ drizzle: mocks.drizzle }));

import { createManagedPostgresDatabase } from "./db.js";

const config = sharedConfigSchema.parse({
    NODE_ENV: "test",
    CONNECTION_STRING: "postgres://database.example/agora",
});

describe("createManagedPostgresDatabase", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.listen.mockReset().mockResolvedValue(mocks.firstListener);
    });

    it("owns its primary database, listeners, and client", async () => {
        const log = { info: vi.fn(), error: vi.fn() };
        const onFirstNotification = vi.fn();
        const onSecondNotification = vi.fn();
        mocks.listen
            .mockResolvedValueOnce(mocks.firstListener)
            .mockResolvedValueOnce(mocks.secondListener);
        const managedDatabase = await createManagedPostgresDatabase({
            config,
            log,
        });

        expect(managedDatabase.db).toBe(mocks.db);
        expect(mocks.query).toHaveBeenCalledOnce();

        await managedDatabase.listen({
            channel: "first_channel",
            onNotification: onFirstNotification,
        });
        await managedDatabase.listen({
            channel: "second_channel",
            onNotification: onSecondNotification,
        });
        expect(mocks.listen).toHaveBeenNthCalledWith(
            1,
            "first_channel",
            onFirstNotification,
            undefined,
        );
        expect(mocks.listen).toHaveBeenNthCalledWith(
            2,
            "second_channel",
            onSecondNotification,
            undefined,
        );

        await Promise.all([managedDatabase.close(), managedDatabase.close()]);

        expect(mocks.firstUnlisten).toHaveBeenCalledOnce();
        expect(mocks.secondUnlisten).toHaveBeenCalledOnce();
        expect(mocks.end).toHaveBeenCalledOnce();
        expect(mocks.end).toHaveBeenCalledWith({ timeout: 5 });
        await expect(
            managedDatabase.listen({
                channel: "closed_channel",
                onNotification: vi.fn(),
            }),
        ).rejects.toThrow("Managed PostgreSQL database is closing");
    });

    it("unsubscribes a listener that finishes while close is pending", async () => {
        let resolveListener:
            ((listener: typeof mocks.firstListener) => void) | undefined;
        mocks.listen.mockImplementationOnce(
            async () =>
                await new Promise((resolve) => {
                    resolveListener = resolve;
                }),
        );
        const managedDatabase = await createManagedPostgresDatabase({
            config,
            log: { info: vi.fn(), error: vi.fn() },
        });

        const listenPromise = managedDatabase.listen({
            channel: "pending_channel",
            onNotification: vi.fn(),
        });
        const closePromise = managedDatabase.close();
        await Promise.resolve();
        expect(mocks.end).not.toHaveBeenCalled();

        if (resolveListener === undefined) {
            throw new Error("Expected listener registration to be pending");
        }
        resolveListener(mocks.firstListener);

        await expect(listenPromise).rejects.toThrow(
            "Managed PostgreSQL database is closing",
        );
        await closePromise;
        expect(mocks.firstUnlisten).toHaveBeenCalledOnce();
        expect(mocks.end).toHaveBeenCalledOnce();
    });
});
