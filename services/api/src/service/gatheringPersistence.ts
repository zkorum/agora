import { httpErrors } from "@fastify/sensible";
import { eq, inArray, sql } from "drizzle-orm";
import type { z } from "zod";
import { generateRandomSlugId } from "@/crypto.js";
import type { PostgresTransaction } from "@/shared-backend/db.js";
import {
    gatheringAnswerTable,
    gatheringFieldTable,
    gatheringResponseContentTable,
    gatheringResponseTable,
} from "@/shared-backend/schema.js";
import type { gatheringAnswers } from "@/shared/gathering.js";

type Answers = z.infer<typeof gatheringAnswers>;
type Response = typeof gatheringResponseTable.$inferSelect;

export type GatheringResponseOwner =
    | { isSeed: true; authorId: null }
    | { isSeed: false; authorId: string };

export async function readGatheringAnswersByContentId({
    tx,
    contentIds,
}: {
    tx: PostgresTransaction;
    contentIds: number[];
}): Promise<ReadonlyMap<number, Answers>> {
    const byContent = new Map<number, Answers>();
    if (contentIds.length === 0) return byContent;
    const answers = await tx
        .select({
            contentId: gatheringAnswerTable.contentId,
            fieldId: gatheringAnswerTable.fieldId,
            value: gatheringAnswerTable.value,
        })
        .from(gatheringAnswerTable)
        .innerJoin(
            gatheringFieldTable,
            eq(gatheringFieldTable.id, gatheringAnswerTable.fieldId),
        )
        .where(inArray(gatheringAnswerTable.contentId, contentIds))
        .orderBy(gatheringFieldTable.position);
    for (const { contentId, fieldId, value } of answers) {
        const values = byContent.get(contentId) ?? [];
        values.push({ fieldId, value });
        byContent.set(contentId, values);
    }
    return byContent;
}

export async function saveGatheringVersion({
    tx,
    response,
    answers,
}: {
    tx: PostgresTransaction;
    response: Pick<Response, "id" | "configId">;
    answers: Answers;
}) {
    const content = (
        await tx
            .insert(gatheringResponseContentTable)
            .values({ responseId: response.id, configId: response.configId })
            .returning()
    ).at(0);
    if (content === undefined)
        throw httpErrors.internalServerError("Response save failed");
    await tx.insert(gatheringAnswerTable).values(
        answers.map((answer) => ({
            ...answer,
            contentId: content.id,
            configId: response.configId,
        })),
    );
    await tx
        .update(gatheringResponseTable)
        .set({ currentContentId: content.id })
        .where(eq(gatheringResponseTable.id, response.id));
    return content;
}

interface InitialResponse {
    owner: GatheringResponseOwner;
    answers: Answers;
    source:
        | {
              conversationId: number;
              conversationSlugId: string;
              contentId: number;
          }
        | undefined;
}

/** Bulk persistence keeps a 1,000-seed creation to four statements, not 4,000. */
export async function insertInitialGatheringResponses({
    tx,
    conversationId,
    configId,
    responses,
}: {
    tx: PostgresTransaction;
    conversationId: number;
    configId: number;
    responses: InitialResponse[];
}): Promise<void> {
    if (responses.length === 0) return;
    const prepared = responses.map((response) => ({
        ...response,
        slugId: generateRandomSlugId(),
    }));
    const bySlug = new Map(
        prepared.map((response) => [response.slugId, response]),
    );
    const roots = await tx
        .insert(gatheringResponseTable)
        .values(
            prepared.map((response) => ({
                ...response.owner,
                slugId: response.slugId,
                conversationId,
                configId,
            })),
        )
        .returning();
    const byRootId = new Map(roots.map((root) => [root.id, root]));
    const contents = await tx
        .insert(gatheringResponseContentTable)
        .values(
            roots.map((root) => ({
                responseId: root.id,
                configId,
            })),
        )
        .returning();
    const versions = contents.map((content) => {
        const root = byRootId.get(content.responseId);
        const input = root === undefined ? undefined : bySlug.get(root.slugId);
        // RETURNING is a database boundary; do not associate records by unspecified row order.
        if (input === undefined)
            throw httpErrors.internalServerError("Response save failed");
        return { content, input };
    });
    await tx.insert(gatheringAnswerTable).values(
        versions.flatMap(({ content, input }) =>
            input.answers.map((answer) => ({
                ...answer,
                contentId: content.id,
                configId,
            })),
        ),
    );
    // Each newly inserted root has exactly one version. Resolve pointers relationally
    // rather than building a raw VALUES source or one UPDATE per seed.
    await tx
        .update(gatheringResponseTable)
        .set({
            currentContentId: sql<number>`(${tx
                .select({ id: gatheringResponseContentTable.id })
                .from(gatheringResponseContentTable)
                .where(
                    eq(
                        gatheringResponseContentTable.responseId,
                        gatheringResponseTable.id,
                    ),
                )})`,
        })
        .where(
            inArray(
                gatheringResponseTable.id,
                roots.map((root) => root.id),
            ),
        );
    const copies = versions.flatMap(({ content, input }) =>
        input.source === undefined
            ? []
            : [{ responseId: content.responseId, source: input.source }],
    );
    if (copies.length > 0) {
        // Drizzle has no CASE helper. Keep batch provenance updates over real roots,
        // with all IDs and values bound as parameters rather than a fabricated VALUES table.
        await tx
            .update(gatheringResponseTable)
            .set({
                baselineContentId: gatheringResponseTable.currentContentId,
                sourceConversationId: sql<number>`case ${sql.join(
                    copies.map(
                        (copy) =>
                            sql`when ${eq(gatheringResponseTable.id, copy.responseId)} then ${copy.source.conversationId}::integer`,
                    ),
                    sql` `,
                )} end`,
                sourceConversationSlugId: sql<string>`case ${sql.join(
                    copies.map(
                        (copy) =>
                            sql`when ${eq(gatheringResponseTable.id, copy.responseId)} then ${copy.source.conversationSlugId}`,
                    ),
                    sql` `,
                )} end`,
                sourceResponseContentId: sql<number>`case ${sql.join(
                    copies.map(
                        (copy) =>
                            sql`when ${eq(gatheringResponseTable.id, copy.responseId)} then ${copy.source.contentId}::integer`,
                    ),
                    sql` `,
                )} end`,
                sourceConversationType: "gathering",
            })
            .where(
                inArray(
                    gatheringResponseTable.id,
                    copies.map((copy) => copy.responseId),
                ),
            );
    }
}

export async function insertGatheringResponse({
    tx,
    conversationId,
    configId,
    owner,
    answers,
}: {
    tx: PostgresTransaction;
    conversationId: number;
    configId: number;
    owner: GatheringResponseOwner;
    answers: Answers;
}) {
    const response = (
        await tx
            .insert(gatheringResponseTable)
            .values({
                conversationId,
                configId,
                ...owner,
                slugId: generateRandomSlugId(),
            })
            .returning()
    ).at(0);
    if (response === undefined)
        throw httpErrors.internalServerError("Response save failed");
    const content = await saveGatheringVersion({ tx, response, answers });
    return { response: { ...response, currentContentId: content.id }, content };
}
