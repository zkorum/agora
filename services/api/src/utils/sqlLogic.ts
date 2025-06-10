import { DEFAULT_MIN_VOTERS } from "@/shared/conversationLogic.js";
import { SQL, and, asc, desc, gt, lt, or, sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

interface IsSqlClassifyProps {
    numAgreesColumn: PgColumn;
    numDisagreesColumn: PgColumn;
    memberCountColumn: PgColumn;
    threshold?: number;
}

interface IsSqlOrderByProps {
    numAgreesColumn: PgColumn;
    numDisagreesColumn: PgColumn;
}

export function isSqlWhereMajority({
    numAgreesColumn,
    numDisagreesColumn,
    memberCountColumn,
    threshold,
}: IsSqlClassifyProps): SQL | undefined {
    return or(
        isSqlWhereMajorityAgree({
            numAgreesColumn: numAgreesColumn,
            memberCountColumn: memberCountColumn,
            threshold,
        }),
        isSqlWhereMajorityDisagree({
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

export function isSqlWhereMajorityDisagree({
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

export function isSqlWhereMajorityAgree({
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

export function isSqlWhereControversial({
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

export function isSqlOrderByControversial({
    numAgreesColumn,
    numDisagreesColumn,
}: IsSqlOrderByProps): SQL[] {
    const orderByClause = [
        asc(
            sql`
                        CASE 
                          WHEN (COALESCE(${numDisagreesColumn}, 0) + COALESCE(${numAgreesColumn}, 0)) = 0 
                          THEN 'Infinity'::float -- Assign a large value when no interactions so it will be picked last
                          ELSE ABS(COALESCE(${numAgreesColumn}, 0) - COALESCE(${numDisagreesColumn}, 0)) 
                               / (COALESCE(${numDisagreesColumn}, 0) + COALESCE(${numAgreesColumn}, 0))
                        END
              `,
        ),
    ];
    return orderByClause;
}

export function isSqlOrderByMajority({
    numAgreesColumn,
    numDisagreesColumn,
}: IsSqlOrderByProps): SQL[] {
    const orderByClause = [
        desc(
            // we ponderate by the number of votes (if just 1-0 then it's not interesting....)
            sql`(COALESCE(${numDisagreesColumn}, 0) + COALESCE(${numAgreesColumn}, 0)) * 
                    ABS(COALESCE(${numAgreesColumn}, 0) - COALESCE(${numDisagreesColumn}, 0))`,
        ),
    ];
    return orderByClause;
}
