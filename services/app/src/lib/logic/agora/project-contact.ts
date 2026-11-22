import { z } from "zod";

import {
  MAX_LENGTH_NAME_CREATOR,
  MAX_LENGTH_TITLE,
} from "../../../../../shared/src/shared.js";
import {
  normalizeEmail,
  zodEmail,
} from "../../../../../shared/src/types/zod-email.js";
import {
  projectHttpsUrlSchema,
  projectOrganizationSlugSchema,
} from "./project-fields.js";

const nameSchema = z.string().trim().min(1).max(MAX_LENGTH_NAME_CREATOR);
// Parse with the shared boundary without composing different Zod versions.
const emailSchema = z
  .string()
  .transform(normalizeEmail)
  .refine((value) => zodEmail.safeParse(value).success);
export const projectParticipantContactSchema = z
  .object({
    firstName: nameSchema.optional(),
    lastName: nameSchema.optional(),
    roleLabel: z.string().trim().min(1).max(MAX_LENGTH_TITLE).optional(),
    email: emailSchema,
    websiteUrl: projectHttpsUrlSchema.optional(),
    imagePath: projectHttpsUrlSchema.optional(),
    isFullImagePath: z.literal(true).default(true),
    organizationSlug: projectOrganizationSlugSchema.optional(),
  })
  .strict();
