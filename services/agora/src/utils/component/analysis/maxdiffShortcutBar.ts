import { z } from "zod";

export const maxdiffShortcutItemSchema = z.enum([
    "Summary",
    "Results",
    "Active",
    "Completed",
    "Canceled",
]);

export type MaxDiffShortcutItem = z.infer<typeof maxdiffShortcutItemSchema>;
