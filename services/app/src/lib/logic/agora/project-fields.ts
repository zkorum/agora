import { z } from "zod";

import { MAX_LENGTH_NAME_CREATOR } from "../../../../../shared/src/shared.js";
import { zodHttpsUrl } from "../../../../../shared/src/types/zod-url.js";

export const projectOrganizationSlugSchema = z
  .string()
  .max(MAX_LENGTH_NAME_CREATOR)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

// Use the narrow shared boundary without importing server-side rich-text code.
export const projectHttpsUrlSchema = z
  .string()
  .trim()
  .refine((value) => zodHttpsUrl.safeParse(value).success);

export function optionalProjectText(value: string): string | undefined {
  return value.trim() || undefined;
}
