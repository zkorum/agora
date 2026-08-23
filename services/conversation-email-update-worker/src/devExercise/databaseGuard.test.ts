import { drizzle } from "drizzle-orm/postgres-js";
import { describe, expect, it, vi } from "vitest";
import {
    acquireExerciseTargetReservation,
    assertExerciseTargetReservation,
    releaseExerciseTargetReservation,
} from "./databaseGuard.js";

function reservation(namespace = "reservation-test") {
    return {
        conversationId: 42,
        namespace,
        fixtureId: "00000000-0000-4000-8000-000000000042",
        markerValue: "m".repeat(32),
        state: "preparing",
        fixture: null,
    };
}

function queryResult(rows: Record<string, unknown>[]) {
    return Object.assign(rows, {
        columns: [],
        count: rows.length,
        command: "SELECT",
        statement: {
            name: "test",
            string: "",
            types: [],
            columns: [],
        },
        state: { status: "idle", pid: 1, secret: 1 },
    });
}

describe("development exercise target reservation", () => {
    it("accepts acquisition only when the persisted owner is exact", async () => {
        const db = drizzle.mock();
        const expected = reservation();
        vi.spyOn(db, "execute")
            .mockResolvedValueOnce(queryResult([]))
            .mockResolvedValueOnce(queryResult([expected]));

        await expect(
            acquireExerciseTargetReservation({ db, ...expected }),
        ).resolves.toBeUndefined();
    });

    it("rejects a competing namespace for an already reserved target", async () => {
        const db = drizzle.mock();
        const expected = reservation("competing-namespace");
        vi.spyOn(db, "execute")
            .mockResolvedValueOnce(queryResult([]))
            .mockResolvedValueOnce(queryResult([reservation("current-owner")]));

        await expect(
            acquireExerciseTargetReservation({ db, ...expected }),
        ).rejects.toThrow("reserved by another development exercise");
    });

    it("fails closed when reservation ownership changes or release matches nothing", async () => {
        const db = drizzle.mock();
        const expected = reservation();
        vi.spyOn(db, "execute").mockResolvedValueOnce(
            queryResult([reservation("different-owner")]),
        );
        await expect(
            assertExerciseTargetReservation({ db, ...expected }),
        ).rejects.toThrow("does not match");

        vi.spyOn(db, "execute").mockResolvedValueOnce(queryResult([]));
        await expect(
            releaseExerciseTargetReservation({ db, ...expected }),
        ).rejects.toThrow("not owned by this fixture");
    });
});
