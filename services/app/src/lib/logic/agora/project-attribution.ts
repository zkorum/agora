import { z } from "zod";

import { ZodSupportedDisplayLanguageCodes } from "../../../../../shared/src/languages.js";
import {
  MAX_LENGTH_DESCRIPTION_CREATOR,
  MAX_LENGTH_NAME_CREATOR,
} from "../../../../../shared/src/shared.js";
import { projectOrganizationAttributionRoleValues } from "../../../../../shared/src/types/project.js";
import {
  optionalProjectText,
  projectHttpsUrlSchema,
  projectOrganizationSlugSchema,
} from "./project-fields.js";

export const projectAttributionRoleSchema = z.enum(
  projectOrganizationAttributionRoleValues,
);
const languageSchema = z.enum(ZodSupportedDisplayLanguageCodes.options);
export const projectAttributionSchema = z.discriminatedUnion("source", [
  z
    .object({
      source: z.literal("organization"),
      role: projectAttributionRoleSchema,
      organizationSlug: projectOrganizationSlugSchema,
    })
    .strict(),
  z
    .object({
      source: z.literal("external"),
      role: projectAttributionRoleSchema,
      defaultLanguageCode: languageSchema,
      displayName: z.string().trim().min(1).max(MAX_LENGTH_NAME_CREATOR),
      description: z
        .string()
        .trim()
        .min(1)
        .max(MAX_LENGTH_DESCRIPTION_CREATOR)
        .optional(),
      websiteUrl: projectHttpsUrlSchema.optional(),
      imagePath: projectHttpsUrlSchema.optional(),
      isFullImagePath: z.literal(true).default(true),
      additionalLocalizations: z.tuple([]).default([]),
    })
    .strict(),
]);

export type ProjectAttribution = z.infer<typeof projectAttributionSchema>;
interface DraftBase {
  id: number;
  role: ProjectAttribution["role"];
}
export type ProjectAttributionDraft = DraftBase &
  (
    | { source: "organization"; organizationSlug: string }
    | {
        source: "external";
        displayName: string;
        description: string;
        websiteUrl: string;
        imagePath: string;
        defaultLanguageCode: z.infer<typeof languageSchema>;
      }
  );

export function createProjectAttributionDraft(
  id: number,
): ProjectAttributionDraft {
  return {
    id,
    source: "external",
    role: "partner",
    displayName: "",
    description: "",
    websiteUrl: "",
    imagePath: "",
    defaultLanguageCode: "en",
  };
}

export function getProjectAttributionInput(
  draft: ProjectAttributionDraft,
): z.input<typeof projectAttributionSchema> {
  return draft.source === "organization"
    ? {
        source: draft.source,
        role: draft.role,
        organizationSlug: draft.organizationSlug,
      }
    : {
        source: draft.source,
        role: draft.role,
        defaultLanguageCode: draft.defaultLanguageCode,
        displayName: draft.displayName,
        description: optionalProjectText(draft.description),
        websiteUrl: optionalProjectText(draft.websiteUrl),
        imagePath: optionalProjectText(draft.imagePath),
        isFullImagePath: true,
        additionalLocalizations: [],
      };
}
