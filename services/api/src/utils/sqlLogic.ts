import {
    DEFAULT_DIFFERENCE_THRESHOLD,
    DEFAULT_MAJORITY_THRESHOLD,
    DEFAULT_MIN_VOTERS,
} from "@/shared/conversationLogic.js";
import { SQL, and, asc, desc, gt, lt, or, sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

interface IsSqlMajorityProps {
    numAgreesColumn: PgColumn;
    numDisagreesColumn: PgColumn;
    memberCountColumn: PgColumn;
    threshold?: number;
}

interface IsSqlMajorityDisagreeProps {
    numDisagreesColumn: PgColumn;
    memberCountColumn: PgColumn;
    threshold?: number;
}

interface IsSqlMajorityAgreeProps {
    numAgreesColumn: PgColumn;
    memberCountColumn: PgColumn;
    threshold?: number;
}

interface IsSqlControversialProps {
    numAgreesColumn: PgColumn;
    numDisagreesColumn: PgColumn;
    memberCountColumn: PgColumn;
    minVoters?: number;
    differenceThreshold?: number;
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
}: IsSqlMajorityProps): SQL | undefined {
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

export function isSqlWhereMajorityDisagree({
    numDisagreesColumn,
    memberCountColumn,
    threshold,
}: IsSqlMajorityDisagreeProps): SQL {
    let actualThreshold = threshold;
    actualThreshold ??= DEFAULT_MAJORITY_THRESHOLD;
    return gt(
        sql`CASE WHEN COALESCE(${memberCountColumn}, 0) = 0 THEN 0 ELSE COALESCE(${numDisagreesColumn}, 0) / ${memberCountColumn}::float END`,
        actualThreshold,
    );
}
export function isSqlWhereMajorityAgree({
    numAgreesColumn,
    memberCountColumn,
    threshold,
}: IsSqlMajorityAgreeProps): SQL {
    let actualThreshold = threshold;
    actualThreshold ??= DEFAULT_MAJORITY_THRESHOLD;
    return gt(
        sql`CASE WHEN COALESCE(${memberCountColumn}, 0) = 0 THEN 0 ELSE COALESCE(${numAgreesColumn}, 0) / ${memberCountColumn}::float END`,
        actualThreshold,
    );
}

export function isSqlWhereControversial({
    numAgreesColumn,
    numDisagreesColumn,
    memberCountColumn,
    minVoters,
    differenceThreshold,
}: IsSqlControversialProps): SQL | undefined {
    let actualMinVoters = minVoters;
    actualMinVoters ??= DEFAULT_MIN_VOTERS;
    let actualDifferenceThreshold = differenceThreshold;
    actualDifferenceThreshold ??= DEFAULT_DIFFERENCE_THRESHOLD;
    return and(
        lt(
            sql`CASE WHEN COALESCE(${memberCountColumn}, 0) = 0 THEN 'Infinity'::float ELSE ABS(COALESCE(${numAgreesColumn}, 0) - COALESCE(${numDisagreesColumn}, 0)) / ${memberCountColumn}::float END`,
            actualDifferenceThreshold,
        ),
        gt(
            sql`CASE WHEN COALESCE(${memberCountColumn}, 0) = 0 THEN 0 ELSE (COALESCE(${numAgreesColumn}, 0) + COALESCE(${numDisagreesColumn}, 0)) / ${memberCountColumn}::float END`,
            actualMinVoters,
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
