/** **** WARNING: GENERATED FROM SHARED-BACKEND DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import {
    integer,
    pgTable,
    PgAsyncPreparedQuery,
    PgDialect,
    withReplicas,
} from "drizzle-orm/pg-core";
import {
    PostgresJsDatabase,
    PostgresJsSession,
    PostgresJsTransaction,
} from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
    getPrimaryDatabase,
    getReplicaDatabase,
    type ReplicaDatabase,
} from "./db.js";

const table = pgTable("routing_test", { id: integer().primaryKey() });
const clients: ReturnType<typeof postgres>[] = [];

// Real builders and sessions; replace only execution so no database is needed.
function database() {
    const client = postgres("postgres://unused@127.0.0.1:1/unused");
    clients.push(client);
    const dialect = new PgDialect();
    const transactionClient = Object.assign(client, {
        savepoint: () => Promise.reject(new Error("Unexpected savepoint")),
        prepare: () => Promise.reject(new Error("Unexpected prepare")),
    });
    const session = new PostgresJsSession(transactionClient, dialect, {});
    const executed = vi.fn(async () => await Promise.resolve([]));
    vi.spyOn(session, "prepareQuery").mockImplementation(
        (query, mode, _name, mapper) =>
            new PgAsyncPreparedQuery(
                executed,
                query,
                mapper,
                mode,
                { logQuery: vi.fn() },
                undefined,
                undefined,
                undefined,
                undefined,
            ),
    );
    return {
        db: new PostgresJsDatabase(dialect, session, {}),
        tx: new PostgresJsTransaction(dialect, session, {}),
        executed,
    };
}

afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(
        clients.splice(0).map(async (client) => {
            await client.end();
        }),
    );
});

describe("explicit database routing", () => {
    it("uses the replica only for opted-in reads", async () => {
        const primary = database();
        const replica = database();
        const db = withReplicas(primary.db, [replica.db]);

        await getReplicaDatabase(db).select().from(table);
        expect(replica.executed).toHaveBeenCalledOnce();
        expect(primary.executed).not.toHaveBeenCalled();

        await db.select().from(table);
        await getPrimaryDatabase(db).select().from(table);
        await db.insert(table).values({ id: 1 });
        await db.update(table).set({ id: 2 }).where(eq(table.id, 1));
        expect(primary.executed).toHaveBeenCalledTimes(4);
        expect(replica.executed).toHaveBeenCalledOnce();
    });

    it("keeps primary-only deployments and explicit primary handles unchanged", () => {
        const primary = database();
        const replica = database();
        const db = withReplicas(primary.db, [replica.db]);

        expect(getReplicaDatabase(primary.db)).toBe(primary.db);
        expect(getPrimaryDatabase(primary.db)).toBe(primary.db);
        expect(getReplicaDatabase(getPrimaryDatabase(db))).toBe(primary.db);
    });

    it("preserves transactions even in replica-eligible helpers", async () => {
        const primary = database();
        const replica = database();
        const db = withReplicas(primary.db, [replica.db]);
        const transaction = vi
            .spyOn(primary.db, "transaction")
            .mockImplementation(async (callback) => await callback(primary.tx));

        await db.transaction(async (tx) => {
            expect(getPrimaryDatabase(tx)).toBe(tx);
            expect(getReplicaDatabase(tx)).toBe(tx);
            await getReplicaDatabase(tx).select().from(table);
        });

        expect(transaction).toHaveBeenCalledOnce();
        expect(primary.executed).toHaveBeenCalledOnce();
        expect(replica.executed).not.toHaveBeenCalled();
    });

    it("runs locking reads and SELECTs with writable CTEs on primary", async () => {
        const primary = database();
        const replica = database();
        const db = withReplicas(primary.db, [replica.db]);
        const writer = getPrimaryDatabase(db);

        await writer.select().from(table).for("update");
        const changed = writer
            .$with("changed")
            .as(writer.update(table).set({ id: 2 }).returning());
        await writer.with(changed).select().from(changed);

        expect(primary.executed).toHaveBeenCalledTimes(2);
        expect(replica.executed).not.toHaveBeenCalled();
    });

    it("does not expose writes, raw execution, transactions, or CTEs to readers", () => {
        expectTypeOf<ReplicaDatabase>().toEqualTypeOf<
            Readonly<
                Pick<
                    PostgresJsDatabase,
                    "select" | "selectDistinct" | "selectDistinctOn" | "$count"
                >
            >
        >();
        expectTypeOf<ReplicaDatabase>().toHaveProperty("select");
        expectTypeOf<ReplicaDatabase>().not.toHaveProperty("insert");
        expectTypeOf<ReplicaDatabase>().not.toHaveProperty("update");
        expectTypeOf<ReplicaDatabase>().not.toHaveProperty("delete");
        expectTypeOf<ReplicaDatabase>().not.toHaveProperty("execute");
        expectTypeOf<ReplicaDatabase>().not.toHaveProperty("transaction");
        expectTypeOf<ReplicaDatabase>().not.toHaveProperty("$with");
        expectTypeOf<ReplicaDatabase>().not.toHaveProperty("with");
    });
});
