import { deviceTable } from "@/schema.js";
import { and, eq, ne, type TablesRelationalConfig } from "drizzle-orm";
import type { PgTransaction, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { type PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";

interface LogoutAllDevicesButOneProps<
    TQueryResult extends PgQueryResultHKT,
    TFullSchema extends Record<string, unknown>,
    TSchema extends TablesRelationalConfig,
> {
    db: PostgresDatabase | PgTransaction<TQueryResult, TFullSchema, TSchema>;
    didWrite: string;
    userId: string;
    now: Date;
    sessionExpiry: Date;
}

export async function logoutAllDevicesButOne({
    db,
    didWrite,
    userId,
    now,
    sessionExpiry,
}: LogoutAllDevicesButOneProps<
    PgQueryResultHKT,
    Record<string, unknown>,
    TablesRelationalConfig
>): Promise<void> {
    await db
        .update(deviceTable)
        .set({
            sessionExpiry: now,
            updatedAt: now,
        })
        .where(
            and(
                eq(deviceTable.userId, userId),
                ne(deviceTable.didWrite, didWrite),
            ),
        );
    await db
        .update(deviceTable)
        .set({
            sessionExpiry: sessionExpiry,
            updatedAt: now,
        })
        .where(eq(deviceTable.didWrite, didWrite));
}
