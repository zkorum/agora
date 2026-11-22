import { z } from "zod";

export const comparisonShortcutItemSchema = z.enum([
  "Summary",
  "Me",
  "Results",
  "Survey",
  "Completed",
  "Canceled",
]);

export type ComparisonShortcutItem = z.infer<
  typeof comparisonShortcutItemSchema
>;
