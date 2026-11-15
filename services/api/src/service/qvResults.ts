import { httpErrors } from "@fastify/sensible";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { getPrimaryDatabase } from "@/shared-backend/db.js";
import {
    conversationTable,
    qvCalculationStateTable,
    qvCalculationTable,
    qvInputSnapshotTable,
    qvInputItemTable,
    qvResultItemTable,
} from "@/shared-backend/schema.js";
import { Dto } from "@/shared/types/dto.js";
import type { z } from "zod";

/** Writer-side lifecycle authorization and result body share one short read boundary. */
export async function fetchQvResults({
    db,
    conversationSlugId,
}: {
    db: PostgresJsDatabase;
    conversationSlugId: string;
}): Promise<z.infer<typeof Dto.qvResultsResponse>> {
    return await getPrimaryDatabase(db).transaction(async (tx) => {
        const conversations = await tx
            .select({
                id: conversationTable.id,
                isClosed: conversationTable.isClosed,
                method: conversationTable.prioritizationType,
            })
            .from(conversationTable)
            .where(
                and(
                    eq(conversationTable.slugId, conversationSlugId),
                    isNotNull(conversationTable.currentContentId),
                    eq(conversationTable.isImporting, false),
                ),
            )
            .for("share");
        const conversation = conversations.at(0);
        if (conversation?.method !== "qv")
            throw httpErrors.notFound("Conversation not found");
        // This statement starts after any lifecycle-lock wait. Joining these
        // references into the locking SELECT could combine its older MVCC snapshot
        // with an updated conversation row after PostgreSQL's lock recheck.
        const references = await tx
            .select({
                state: {
                    generation: qvCalculationStateTable.generation,
                    currentCalculationId:
                        qvCalculationStateTable.currentCalculationId,
                },
                calculation: {
                    id: qvCalculationTable.id,
                    status: qvCalculationTable.status,
                },
                snapshot: {
                    id: qvInputSnapshotTable.id,
                    capturedAt: qvInputSnapshotTable.capturedAt,
                    participantCount: qvInputSnapshotTable.participantCount,
                },
            })
            .from(qvCalculationStateTable)
            .leftJoin(
                qvCalculationTable,
                and(
                    eq(qvCalculationTable.conversationId, conversation.id),
                    eq(
                        qvCalculationTable.generation,
                        qvCalculationStateTable.generation,
                    ),
                ),
            )
            .leftJoin(
                qvInputSnapshotTable,
                eq(qvInputSnapshotTable.calculationId, qvCalculationTable.id),
            )
            .where(eq(qvCalculationStateTable.conversationId, conversation.id));
        const current = references.at(0);
        if (!conversation.isClosed)
            return {
                status: "open",
                generation: current?.state.generation ?? 0,
            };
        if (current === undefined)
            throw httpErrors.serviceUnavailable(
                "Calculation state unavailable",
            );
        const { state, calculation, snapshot } = current;
        if (calculation === null)
            throw httpErrors.serviceUnavailable(
                "Calculation state unavailable",
            );
        if (calculation.status === "failed")
            return { status: "failed", generation: state.generation };
        if (calculation.status !== "ready")
            return { status: "calculating", generation: state.generation };
        if (state.currentCalculationId !== calculation.id)
            throw httpErrors.serviceUnavailable(
                "Calculation publication unavailable",
            );
        if (snapshot === null)
            throw httpErrors.serviceUnavailable(
                "Calculation input unavailable",
            );
        const rows = await tx
            .select({ item: qvInputItemTable, result: qvResultItemTable })
            .from(qvInputItemTable)
            .innerJoin(
                qvResultItemTable,
                and(
                    eq(
                        qvResultItemTable.snapshotId,
                        qvInputItemTable.snapshotId,
                    ),
                    eq(
                        qvResultItemTable.itemSlugId,
                        qvInputItemTable.itemSlugId,
                    ),
                ),
            )
            .where(eq(qvInputItemTable.snapshotId, snapshot.id))
            .orderBy(
                asc(qvResultItemTable.rank),
                asc(qvInputItemTable.position),
                asc(qvInputItemTable.itemSlugId),
            );
        return {
            status: "ready",
            generation: state.generation,
            calculationId: calculation.id,
            capturedAt: snapshot.capturedAt,
            participantCount: snapshot.participantCount,
            items: rows.map(({ item, result }) => ({
                itemSlugId: item.itemSlugId,
                sourceVersion: item.sourceVersion,
                title: item.title,
                body: item.body ?? undefined,
                supportUnits: result.supportUnits,
                oppositionUnits: result.oppositionUnits,
                netUnits: result.netUnits,
                supportingParticipantCount: result.supportingParticipantCount,
                opposingParticipantCount: result.opposingParticipantCount,
                rank: result.rank,
            })),
        };
    });
}
