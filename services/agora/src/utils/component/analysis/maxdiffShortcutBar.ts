import { z } from "zod";

export const maxdiffShortcutItemSchema = z.enum([
    "Summary",
    "Me",
    "Results",
    "Survey",
    "Completed",
    "Canceled",
]);

export type MaxDiffShortcutItem = z.infer<typeof maxdiffShortcutItemSchema>;
