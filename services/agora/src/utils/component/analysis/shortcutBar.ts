import { z } from "zod";

export const shortcutItemSchema = z.enum([
  "Summary",
  "Agreements",
  "Disagreements",
  "Divisive",
  "Groups",
  "Me",
  "Survey",
]);

export type ShortcutItem = z.infer<typeof shortcutItemSchema>;
