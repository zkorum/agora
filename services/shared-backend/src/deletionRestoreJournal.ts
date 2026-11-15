import { z } from "zod";

const subjectSchema = z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("account"), id: z.uuid() }).strict(),
    z
        .object({
            kind: z.literal("conversation"),
            id: z.number().int().positive(),
        })
        .strict(),
    z
        .object({ kind: z.literal("project"), id: z.number().int().positive() })
        .strict(),
    z
        .object({
            kind: z.literal("organization"),
            id: z.number().int().positive(),
        })
        .strict(),
    z
        .object({ kind: z.literal("opinion"), id: z.number().int().positive() })
        .strict(),
    z
        .object({
            kind: z.literal("ranking_item"),
            id: z.number().int().positive(),
        })
        .strict(),
]);

/** Restricted, content/credential-free replay evidence, retained beyond the restore horizon. */
export const deletionRestoreJournalEntrySchema = z
    .object({
        id: z.uuid(),
        subject: subjectSchema,
        action: z.enum(["hide", "restore", "begin_purge", "purge_complete"]),
        occurredAt: z.date(),
        purgeEligibleAt: z.date().optional(),
        retainUntil: z.date(),
    })
    .strict()
    .refine((entry) => entry.retainUntil > entry.occurredAt, {
        message: "Journal retention must cover the deletion event",
    });

export type DeletionRestoreJournalEntry = z.infer<
    typeof deletionRestoreJournalEntrySchema
>;

/** The implementation must live outside the database's point-in-time restore domain. */
export interface DeletionRestoreJournal {
    append: (
        entry: DeletionRestoreJournalEntry,
    ) => Promise<{ receiptId: string }>;
    readAfter: (params: {
        cursor: string | undefined;
        limit: number;
    }) => Promise<{
        entries: readonly DeletionRestoreJournalEntry[];
        nextCursor: string | undefined;
    }>;
}
