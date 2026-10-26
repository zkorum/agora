/** **** WARNING: GENERATED FROM SHARED-BACKEND DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
import { and, eq, isNotNull, or } from "drizzle-orm";
import { opinionTable, userTable } from "./schema.js";

/** Join user through the statement author, never through the voter. */
export function currentOpinionSourceCondition() {
    return and(
        isNotNull(opinionTable.currentContentId),
        or(eq(opinionTable.isSeed, true), eq(userTable.isDeleted, false)),
    );
}
