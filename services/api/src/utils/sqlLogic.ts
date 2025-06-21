import { opinionTable } from "@/schema.js";
import {
    DEFAULT_DIFFERENCE_THRESHOLD,
    DEFAULT_GROUP_AWARE_CONSENSUS_THRESHOLD_BASE,
    DEFAULT_MAJORITY_THRESHOLD,
    DEFAULT_MIN_VOTERS,
} from "@/shared/conversationLogic.js";
import {
    SQL,
    and,
    asc,
    desc,
    gt,
    isNotNull,
    isNull,
    lt,
    or,
    sql,
} from "drizzle-orm";
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

export function isSqlWhereGroupAwareConsensusAgree({
    thresholdBase,
    cluster0NumUsersColumn,
    cluster1NumUsersColumn,
    cluster2NumUsersColumn,
    cluster3NumUsersColumn,
    cluster4NumUsersColumn,
    cluster5NumUsersColumn,
}: {
    thresholdBase?: number;
    cluster0NumUsersColumn: PgColumn;
    cluster1NumUsersColumn: PgColumn;
    cluster2NumUsersColumn: PgColumn;
    cluster3NumUsersColumn: PgColumn;
    cluster4NumUsersColumn: PgColumn;
    cluster5NumUsersColumn: PgColumn;
}): SQL | undefined {
    const actualThresholdBase =
        thresholdBase ?? DEFAULT_GROUP_AWARE_CONSENSUS_THRESHOLD_BASE;
    return or(
        // 6 clusters => multiply base by 6
        and(
            isNotNull(cluster5NumUsersColumn),
            isNotNull(cluster4NumUsersColumn),
            isNotNull(cluster3NumUsersColumn),
            isNotNull(cluster2NumUsersColumn),
            isNotNull(cluster1NumUsersColumn),
            isNotNull(cluster0NumUsersColumn),
            gt(
                sql`COALESCE(${opinionTable.polisGroupAwareConsensusProbabilityAgree}, 0)`,
                actualThresholdBase * 6,
            ),
        ),
        // 5 clusters => multiply base by 5
        and(
            isNull(cluster5NumUsersColumn),
            isNotNull(cluster4NumUsersColumn),
            isNotNull(cluster3NumUsersColumn),
            isNotNull(cluster2NumUsersColumn),
            isNotNull(cluster1NumUsersColumn),
            isNotNull(cluster0NumUsersColumn),
            gt(
                sql`COALESCE(${opinionTable.polisGroupAwareConsensusProbabilityAgree}, 0)`,
                actualThresholdBase * 5,
            ),
        ),
        // 4 clusters => multiply base by 4
        and(
            isNull(cluster5NumUsersColumn),
            isNull(cluster4NumUsersColumn),
            isNotNull(cluster3NumUsersColumn),
            isNotNull(cluster2NumUsersColumn),
            isNotNull(cluster1NumUsersColumn),
            isNotNull(cluster0NumUsersColumn),
            gt(
                sql`COALESCE(${opinionTable.polisGroupAwareConsensusProbabilityAgree}, 0)`,
                actualThresholdBase * 4,
            ),
        ),
        // 3 clusters => multiply base by 3
        and(
            isNull(cluster5NumUsersColumn),
            isNull(cluster4NumUsersColumn),
            isNull(cluster3NumUsersColumn),
            isNotNull(cluster2NumUsersColumn),
            isNotNull(cluster1NumUsersColumn),
            isNotNull(cluster0NumUsersColumn),
            gt(
                sql`COALESCE(${opinionTable.polisGroupAwareConsensusProbabilityAgree}, 0)`,
                actualThresholdBase * 3,
            ),
        ),
        // 2 clusters => multiply base by 2
        and(
            isNull(cluster5NumUsersColumn),
            isNull(cluster4NumUsersColumn),
            isNull(cluster3NumUsersColumn),
            isNull(cluster2NumUsersColumn),
            isNotNull(cluster1NumUsersColumn),
            isNotNull(cluster0NumUsersColumn),
            gt(
                sql`COALESCE(${opinionTable.polisGroupAwareConsensusProbabilityAgree}, 0)`,
                actualThresholdBase * 2,
            ),
        ),
        // 1 or 0 clusters => multiply base by 1
        and(
            isNull(cluster5NumUsersColumn),
            isNull(cluster4NumUsersColumn),
            isNull(cluster3NumUsersColumn),
            isNull(cluster2NumUsersColumn),
            isNull(cluster1NumUsersColumn),
            // isNotNull(cluster0NumUsersColumn), // or Null -- 0 cluster is the same
            gt(
                sql`COALESCE(${opinionTable.polisGroupAwareConsensusProbabilityAgree}, 0)`,
                actualThresholdBase,
            ),
        ),
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

export function isSqlOrderByGroupAwareConsensusAgree(): SQL[] {
    const orderByClause = [
        desc(opinionTable.polisGroupAwareConsensusProbabilityAgree),
        // TODO: add disagree when it is implemented on the algorithm side
    ];

    return orderByClause;
}

export function isSqlOrderByPolisPriority(): SQL[] {
    const orderByClause = [desc(opinionTable.polisPriority)];

    return orderByClause;
}

export function isSqlWhereRepresentative({
    polisClusterOpinionIdColumn,
}: {
    polisClusterOpinionIdColumn: PgColumn;
}): SQL | undefined {
    return isNotNull(polisClusterOpinionIdColumn);
}

export function isSqlOrderByRepresentative({
    probabilityAgreementColumn,
}: {
    probabilityAgreementColumn: PgColumn;
}): SQL[] {
    const orderByClause = [desc(probabilityAgreementColumn)];

    return orderByClause;
}
