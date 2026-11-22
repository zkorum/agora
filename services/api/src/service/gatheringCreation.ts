import { randomUUID } from "node:crypto";
import { httpErrors } from "@fastify/sensible";
import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import type { z } from "zod";
import type { PostgresTransaction } from "@/shared-backend/db.js";
import {
    conversationTable,
    userTable,
    gatheringConfigTable,
    gatheringFieldTable,
    gatheringResponseTable,
    gatheringResponseContentTable,
} from "@/shared-backend/schema.js";
import {
    createGatheringAnswerParser,
    type gatheringAnswers,
    type gatheringCreation,
} from "@/shared/gathering.js";
import {
    getGatheringPermissions,
    lockGatheringConversation,
    readGatheringFormat,
} from "./gatheringAccess.js";
import {
    gatheringProjectCapabilityCondition,
    gatheringResponseEligibility,
} from "./gatheringEligibility.js";
import {
    insertInitialGatheringResponses,
    readGatheringAnswersByContentId,
    type GatheringResponseOwner,
} from "./gatheringPersistence.js";

type Answers = z.infer<typeof gatheringAnswers>;

/** Copying creates account-owned roots, so take the account locks before project/conversation locks. */
export async function lockGatheringCopyAuthors({
    tx,
    input,
    userId,
}: {
    tx: PostgresTransaction;
    input: z.infer<typeof gatheringCreation>;
    userId: string;
}): Promise<ReadonlySet<string>> {
    if (input.gatheringMode !== "amend") return new Set<string>();
    const source = (
        await tx
            .select({
                id: conversationTable.id,
                projectId: conversationTable.projectId,
            })
            .from(conversationTable)
            .where(
                and(
                    eq(
                        conversationTable.slugId,
                        input.sourceConversationSlugId,
                    ),
                    eq(conversationTable.conversationType, "gathering"),
                    isNotNull(conversationTable.currentContentId),
                ),
            )
    ).at(0);
    if (source === undefined)
        throw httpErrors.notFound("Source Gathering not found");
    const access = await getGatheringPermissions({
        tx,
        userId,
        projectId: source.projectId,
    });
    if (!access.canEdit)
        throw httpErrors.forbidden("Source Gathering management required");
    const roots = await tx
        .select({ authorId: gatheringResponseTable.authorId })
        .from(gatheringResponseTable)
        .where(
            and(
                eq(gatheringResponseTable.conversationId, source.id),
                inArray(
                    gatheringResponseTable.slugId,
                    input.selectedResponses.map(
                        (response) => response.responseSlugId,
                    ),
                ),
            ),
        );
    const userIds = [
        ...new Set([
            userId,
            ...roots.flatMap((root) =>
                root.authorId === null ? [] : [root.authorId],
            ),
        ]),
    ].sort();
    const accounts = await tx
        .select({ id: userTable.id })
        .from(userTable)
        .where(
            and(
                inArray(userTable.id, userIds),
                eq(userTable.isDeleted, false),
                isNull(userTable.authRestrictedAt),
            ),
        )
        .orderBy(userTable.id)
        .for("no key update");
    if (accounts.length !== userIds.length)
        throw httpErrors.conflict("Source author unavailable");
    return new Set(accounts.map((account) => account.id));
}

/** Runs inside conversation creation; selected text is resolved from source versions, not the client. */
export async function prepareGatheringCreation({
    tx,
    input,
    userId,
    lockedSourceUserIds,
}: {
    tx: PostgresTransaction;
    input: z.infer<typeof gatheringCreation>;
    userId: string;
    lockedSourceUserIds: ReadonlySet<string>;
}) {
    async function resolveSource() {
        if (input.gatheringMode === "new")
            return {
                source: undefined,
                format: input.responseFormat,
                selectedResponses: [],
            };
        const source = await lockGatheringConversation({
            tx,
            conversationSlugId: input.sourceConversationSlugId,
            accessMode: "write",
        });
        const access = await getGatheringPermissions({
            tx,
            userId,
            projectId: source.projectId,
        });
        if (!access.canEdit)
            throw httpErrors.forbidden("Source Gathering management required");
        if (
            source.config.responseVisibility === "facilitators" &&
            input.responseVisibility === "everyone"
        ) {
            throw httpErrors.forbidden(
                "Private source responses cannot become public copies",
            );
        }
        return {
            source,
            format: await readGatheringFormat({
                tx,
                configId: source.config.id,
            }),
            selectedResponses: input.selectedResponses,
        };
    }
    const { source, format, selectedResponses } = await resolveSource();
    const fieldCopies = format.map((field) => ({
        sourceFieldId: field.fieldId,
        targetField: { ...field, fieldId: randomUUID() },
    }));
    const parseAnswers = createGatheringAnswerParser(format);
    const mapAnswers = (answers: Answers) => {
        const bySourceField = new Map(
            parseAnswers(answers).map((answer) => [
                answer.fieldId,
                answer.value,
            ]),
        );
        return fieldCopies.map((copy) => ({
            fieldId: copy.targetField.fieldId,
            value: bySourceField.get(copy.sourceFieldId) ?? "",
        }));
    };
    const copied: {
        owner: GatheringResponseOwner;
        source: {
            conversationId: number;
            conversationSlugId: string;
            contentId: number;
        };
        answers: Answers;
    }[] = [];
    if (source !== undefined && selectedResponses.length > 0) {
        const rows = await tx
            .select({
                response: gatheringResponseTable,
                contentId: gatheringResponseContentTable.id,
                sourceVersion: gatheringResponseContentTable.publicId,
            })
            .from(gatheringResponseTable)
            .innerJoin(
                gatheringResponseContentTable,
                eq(
                    gatheringResponseContentTable.id,
                    gatheringResponseTable.currentContentId,
                ),
            )
            .where(
                and(
                    eq(gatheringResponseTable.conversationId, source.id),
                    inArray(
                        gatheringResponseTable.slugId,
                        selectedResponses.map(
                            (selected) => selected.responseSlugId,
                        ),
                    ),
                    gatheringResponseEligibility(tx),
                    gatheringProjectCapabilityCondition({
                        db: tx,
                        userId,
                        projectId: source.projectId,
                        capabilities: ["conversation_edit"],
                    }),
                    isNull(gatheringResponseTable.moderation),
                ),
            );
        const bySlug = new Map(rows.map((row) => [row.response.slugId, row]));
        const answersByContent = await readGatheringAnswersByContentId({
            tx,
            contentIds: rows.map((row) => row.contentId),
        });
        for (const selected of selectedResponses) {
            const row = bySlug.get(selected.responseSlugId);
            if (row === undefined)
                throw httpErrors.conflict("Source response unavailable");
            if (row.sourceVersion !== selected.sourceVersion)
                throw httpErrors.conflict("Source response changed");
            const { response } = row;
            let owner: GatheringResponseOwner;
            if (response.isSeed) {
                owner = { isSeed: true, authorId: null };
            } else {
                if (
                    response.authorId === null ||
                    !lockedSourceUserIds.has(response.authorId)
                )
                    throw httpErrors.conflict("Source author changed");
                owner = { isSeed: false, authorId: response.authorId };
            }
            copied.push({
                owner,
                source: {
                    conversationId: source.id,
                    conversationSlugId: source.slugId,
                    contentId: row.contentId,
                },
                answers: mapAnswers(answersByContent.get(row.contentId) ?? []),
            });
        }
    }
    const seeds = input.seedGatheringResponses.map((answers) => {
        try {
            return mapAnswers(answers);
        } catch {
            throw httpErrors.badRequest("Invalid seed Gathering answers");
        }
    });
    const config = (
        await tx
            .insert(gatheringConfigTable)
            .values({
                gatheringMode: input.gatheringMode,
                responseVisibility: input.responseVisibility,
                allowNewResponses: input.allowNewResponses,
            })
            .returning()
    ).at(0);
    if (config === undefined)
        throw httpErrors.internalServerError("Gathering creation failed");
    await tx.insert(gatheringFieldTable).values(
        fieldCopies.map(({ targetField }, index) => ({
            id: targetField.fieldId,
            configId: config.id,
            position: index + 1,
            label: targetField.label,
            required: targetField.required,
            characterLimit: targetField.characterLimit,
        })),
    );
    return {
        configId: config.id,
        populate: async (conversationId: number) => {
            await insertInitialGatheringResponses({
                tx,
                conversationId,
                configId: config.id,
                responses: [
                    ...copied,
                    ...seeds.map((answers) => ({
                        owner: {
                            isSeed: true,
                            authorId: null,
                        } satisfies GatheringResponseOwner,
                        answers,
                        source: undefined,
                    })),
                ],
            });
        },
    };
}
