import { httpErrors } from "@fastify/sensible";
import { and, asc, eq, exists, inArray, isNull, or } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    getPrimaryDatabase,
    type PostgresTransaction,
} from "@/shared-backend/db.js";
import {
    organizationTable,
    projectOrganizationOwnershipTable,
} from "@/shared-backend/schema.js";

// Drizzle transactions expose rollback(). A savepoint cannot establish
// SERIALIZABLE isolation for an existing outer transaction.
export type ProjectOwnershipDatabase = PostgresJsDatabase & {
    readonly rollback?: never;
};

export async function withProjectOwnershipTransaction<T>({
    db,
    operation,
}: {
    db: ProjectOwnershipDatabase;
    operation: (transaction: PostgresTransaction) => Promise<T>;
}): Promise<T> {
    try {
        // Ownership spans rows and organizations. SERIALIZABLE prevents concurrent
        // removals from each seeing the other owner as the surviving owner.
        return await getPrimaryDatabase(db).transaction(operation, {
            isolationLevel: "serializable",
        });
    } catch (error) {
        const cause = error instanceof Error ? error.cause : undefined;
        const databaseError = cause ?? error;
        if (
            typeof databaseError === "object" &&
            databaseError !== null &&
            "code" in databaseError &&
            (databaseError.code === "40001" || databaseError.code === "40P01")
        ) {
            throw httpErrors.conflict(
                "Project ownership changed; retry the request",
            );
        }
        throw error;
    }
}

export async function lockListedProjectOrganizations({
    db,
    organizationIds,
    projectId,
}: {
    db: PostgresTransaction;
    organizationIds: readonly number[];
    projectId?: number;
}): Promise<boolean> {
    const uniqueIds = [...new Set(organizationIds)];
    if (uniqueIds.length === 0 && projectId === undefined) return true;
    const existingOwner =
        projectId === undefined
            ? undefined
            : exists(
                  db
                      .select({ id: projectOrganizationOwnershipTable.id })
                      .from(projectOrganizationOwnershipTable)
                      .where(
                          and(
                              eq(
                                  projectOrganizationOwnershipTable.organizationId,
                                  organizationTable.id,
                              ),
                              eq(
                                  projectOrganizationOwnershipTable.projectId,
                                  projectId,
                              ),
                              isNull(
                                  projectOrganizationOwnershipTable.deletedAt,
                              ),
                          ),
                      ),
              );
    const organizations = await db
        .select({
            id: organizationTable.id,
            deletedAt: organizationTable.deletedAt,
            visibility: organizationTable.directoryVisibility,
        })
        .from(organizationTable)
        .where(or(inArray(organizationTable.id, uniqueIds), existingOwner))
        .orderBy(asc(organizationTable.id))
        // Ownership fences write both removed and added parents. Lock their
        // union in final write mode before taking any project/ownership locks.
        .for("update");
    const byId = new Map(
        organizations.map((organization) => [organization.id, organization]),
    );
    return uniqueIds.every((id) => {
        const organization = byId.get(id);
        return (
            organization?.deletedAt === null &&
            organization.visibility === "listed"
        );
    });
}
