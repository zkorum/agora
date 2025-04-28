import { DEFAULT_MIN_VOTERS } from "@/shared/conversationLogic.js";
import { SQL, and, gt, lt, or, sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

interface IsSqlClassifyProps {
    numAgreesColumn: PgColumn;
    numDisagreesColumn: PgColumn;
    memberCountColumn: PgColumn;
    threshold?: number;
}

export function isSqlMajority({
    numAgreesColumn,
    numDisagreesColumn,
    memberCountColumn,
    threshold,
}: IsSqlClassifyProps): SQL | undefined {
    return or(
        isSqlPopular({
            numAgreesColumn: numAgreesColumn,
            memberCountColumn: memberCountColumn,
            threshold,
        }),
        isSqlUnpopular({
            numDisagreesColumn: numDisagreesColumn,
            memberCountColumn: memberCountColumn,
            threshold,
        }),
    );
}

interface IsSqlUnpopularProps {
    numDisagreesColumn: PgColumn;
    memberCountColumn: PgColumn;
    threshold?: number;
}

export function isSqlUnpopular({
    numDisagreesColumn,
    memberCountColumn,
    threshold,
}: IsSqlUnpopularProps): SQL {
    let actualThreshold = threshold;
    if (threshold === undefined) {
        actualThreshold = DEFAULT_MIN_VOTERS;
    }
    return gt(
        sql`CASE WHEN COALESCE(${memberCountColumn}, 0) = 0 THEN 0 ELSE COALESCE(${numDisagreesColumn}, 0) / ${memberCountColumn}::float END`,
        actualThreshold,
    );
}

interface IsSqlPopularProps {
    numAgreesColumn: PgColumn;
    memberCountColumn: PgColumn;
    threshold?: number;
}

export function isSqlPopular({
    numAgreesColumn,
    memberCountColumn,
    threshold,
}: IsSqlPopularProps): SQL {
    let actualThreshold = threshold;
    if (threshold === undefined) {
        actualThreshold = DEFAULT_MIN_VOTERS;
    }
    return gt(
        sql`CASE WHEN COALESCE(${memberCountColumn}, 0) = 0 THEN 0 ELSE COALESCE(${numAgreesColumn}, 0) / ${memberCountColumn}::float END`,
        actualThreshold,
    );
}

export function isSqlControversial({
    numAgreesColumn,
    numDisagreesColumn,
    memberCountColumn,
    threshold,
}: IsSqlClassifyProps): SQL | undefined {
    let actualThreshold = threshold;
    if (threshold === undefined) {
        actualThreshold = DEFAULT_MIN_VOTERS;
    }
    return and(
        lt(
            sql`CASE WHEN COALESCE(${memberCountColumn}, 0) = 0 THEN 'Infinity'::float ELSE ABS(COALESCE(${numAgreesColumn}, 0) - COALESCE(${numDisagreesColumn}, 0)) / ${memberCountColumn}::float END`,
            actualThreshold,
        ),
        gt(
            sql`CASE WHEN COALESCE(${memberCountColumn}, 0) = 0 THEN 0 ELSE (COALESCE(${numAgreesColumn}, 0) + COALESCE(${numDisagreesColumn}, 0)) / ${memberCountColumn}::float END`,
            actualThreshold,
        ),
    );
}
