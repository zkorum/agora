/** **** WARNING: GENERATED FROM SHARED-BACKEND DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
import { and, eq, isNotNull, isNull, or } from "drizzle-orm";
import { opinionTable, rankingItemTable, userTable } from "./schema.js";

/** This condition uses the statement author; check voter eligibility separately. */
export function currentOpinionSourceCondition() {
    return and(
        isNotNull(opinionTable.currentContentId),
        isNull(opinionTable.deletedAt),
        isNull(opinionTable.accountHiddenAt),
        or(eq(opinionTable.isSeed, true), eq(userTable.isDeleted, false)),
    );
}

/** Requires a LEFT JOIN of the item's author to userTable; seeds outlive authors. */
export function currentRankingItemSourceCondition() {
    return and(
        isNotNull(rankingItemTable.currentContentId),
        isNull(rankingItemTable.deletedAt),
        isNull(rankingItemTable.accountHiddenAt),
        or(eq(rankingItemTable.isSeed, true), eq(userTable.isDeleted, false)),
    );
}
