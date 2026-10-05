import { getPrimaryDatabase } from "@/shared-backend/db.js";
import { blockedPhoneNumberTable } from "@/shared-backend/schema.js";
import { and, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export async function isBlockedPhoneNumber({
    db,
    phoneHash,
    pepperVersion,
}: {
    db: PostgresJsDatabase;
    phoneHash: string;
    pepperVersion: number;
}): Promise<boolean> {
    const blocked = await getPrimaryDatabase(db)
        .select({ phoneHash: blockedPhoneNumberTable.phoneHash })
        .from(blockedPhoneNumberTable)
        .where(
            and(
                eq(blockedPhoneNumberTable.phoneHash, phoneHash),
                eq(blockedPhoneNumberTable.pepperVersion, pepperVersion),
                isNull(blockedPhoneNumberTable.revokedAt),
            ),
        )
        .limit(1);
    return blocked.length !== 0;
}
