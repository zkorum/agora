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
    return and(isNull(rankingItemTable.moderation), readableRankingItemSourceCondition());
}

/** A moderation history reader must additionally restrict the action by viewer. */
export function readableRankingItemSourceCondition() {
    return and(
        isNotNull(rankingItemTable.currentContentId),
        isNull(rankingItemTable.deletedAt),
        isNull(rankingItemTable.accountHiddenAt),
        or(eq(rankingItemTable.isSeed, true), eq(userTable.isDeleted, false)),
    );
}

/** Retained results may display account-hidden text, never explicitly erased text.
 * This is not a live participation, export or provider-source permission.
 */
export function historicalRankingItemSourceCondition() {
    return and(
        isNull(rankingItemTable.moderation),
        isNotNull(rankingItemTable.currentContentId),
        isNull(rankingItemTable.deletedAt),
        or(
            eq(rankingItemTable.accountHiddenContentRetained, true),
            and(
                isNull(rankingItemTable.accountHiddenAt),
                or(
                    eq(rankingItemTable.isSeed, true),
                    eq(userTable.isDeleted, false),
                ),
            ),
        ),
    );
}
