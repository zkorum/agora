import { opinionTable } from "@/shared-backend/schema.js";
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

export function isSqlOrderByGroupAwareConsensus(): SQL[] {
    const orderByClause = [
        desc(
            // WARN: postgresql-specific
            sql`GREATEST(${opinionTable.polisGroupAwareConsensusProbabilityAgree}, ${opinionTable.polisGroupAwareConsensusProbabilityDisagree})`,
        ),
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
