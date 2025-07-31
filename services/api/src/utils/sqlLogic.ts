import { opinionTable } from "@/schema.js";
import { DEFAULT_GROUP_AWARE_CONSENSUS_THRESHOLD_BASE } from "@/shared/conversationLogic.js";
import {
    SQL,
    and,
    desc,
    eq,
    gt,
    isNotNull,
    isNull,
    or,
    sql,
} from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

export function isSqlWhereMajority(): SQL | undefined {
    return and(
        isNotNull(opinionTable.polisMajorityType),
        isNotNull(opinionTable.polisMajorityProbabilitySuccess),
    );
}

export function isSqlWhereMajorityAgree(): SQL | undefined {
    return and(
        eq(opinionTable.polisMajorityType, "agree"),
        isNotNull(opinionTable.polisMajorityProbabilitySuccess),
    );
}

export function isSqlWhereMajorityDisagree(): SQL | undefined {
    return and(
        eq(opinionTable.polisMajorityType, "disagree"),
        isNotNull(opinionTable.polisMajorityProbabilitySuccess),
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

export function isSqlOrderByMajority(): SQL[] {
    const orderByClause = [desc(opinionTable.polisMajorityProbabilitySuccess)];
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
    idColumn,
    repfulColumn,
}: {
    idColumn: PgColumn;
    repfulColumn: PgColumn;
}): SQL | undefined {
    return and(isNotNull(idColumn), isNotNull(repfulColumn));
}

export function isSqlOrderByRepresentative({
    probabilityAgreementColumn,
}: {
    probabilityAgreementColumn: PgColumn;
}): SQL[] {
    const orderByClause = [desc(probabilityAgreementColumn)];

    return orderByClause;
}
