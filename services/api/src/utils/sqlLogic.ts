import { conversationTable, opinionTable } from "@/shared-backend/schema.js";
import { SQL, and, desc, eq, isNotNull, sql } from "drizzle-orm";
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

export function isSqlOrderByMajority(): SQL[] {
    const orderByClause = [desc(opinionTable.polisMajorityProbabilitySuccess)];
    return orderByClause;
}

/**
 * Participation dampening weight: totalVotes / (totalVotes + participantCount × 0.1).
 * Penalizes items with few votes relative to the conversation size.
 * Requires conversationTable to be joined in the query.
 */
export function participationWeight(): SQL {
    const totalVotes = sql`(${opinionTable.numAgrees} + ${opinionTable.numDisagrees} + ${opinionTable.numPasses})::real`;
    const dampening = sql`(${conversationTable.participantCount}::real * 0.1)`;
    return sql`(${totalVotes} / GREATEST(${totalVotes} + ${dampening}, 1))`;
}

export function isSqlOrderByGroupAwareConsensusAgree(): SQL[] {
    const weight = participationWeight();
    return [
        desc(
            sql`(${opinionTable.polisGroupAwareConsensusProbabilityAgree} * ${weight})`,
        ),
    ];
}

export function isSqlOrderByGroupAwareConsensusDisagree(): SQL[] {
    const weight = participationWeight();
    return [
        desc(
            sql`(${opinionTable.polisGroupAwareConsensusProbabilityDisagree} * ${weight})`,
        ),
    ];
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
