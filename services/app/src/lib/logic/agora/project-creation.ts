import { z } from "zod";

import { ZodSupportedDisplayLanguageCodes } from "../../../../../shared/src/languages.js";
import { participationModeValues } from "../../../../../shared/src/participationMode.js";
import {
  MAX_LENGTH_NAME_CREATOR,
  MAX_LENGTH_TITLE,
  validateRichTextHtmlByteCount,
} from "../../../../../shared/src/shared.js";
import { projectAttributionSchema } from "./project-attribution.js";
import { projectParticipantContactSchema } from "./project-contact.js";
import { projectOrganizationSlugSchema } from "./project-fields.js";
import { projectHeaderBackgroundImageSrcSchema } from "./project-header-background.js";
import { getProjectBodyStatus } from "./project-rich-text.js";

export const projectSlugSchema = projectOrganizationSlugSchema;

export const projectAuthenticationSchema = z.enum(participationModeValues);
export const projectEmailUpdatesSchema = z.enum(["off", "ask"]);
export const projectLanguageSchema = z.enum(
  ZodSupportedDisplayLanguageCodes.options,
);
// The backend combines the detected original with at most two manual targets.
export const projectTargetLanguageLimit = 2;
export const projectLanguageSettingsSchema = z
  .object({
    dynamicTranslationEnabled: z.boolean(),
    targetLanguageCodes: z
      .array(projectLanguageSchema)
      .max(projectTargetLanguageLimit)
      .refine((codes) => new Set(codes).size === codes.length),
  })
  .strict();
const projectBodySchema = z.string().transform((value, context) => {
  // Reject oversized input before parsing it at the persistence boundary.
  const rawSize = validateRichTextHtmlByteCount({
    htmlString: value,
    mode: "conversation",
  });
  if (!rawSize.success) {
    context.addIssue({ code: "custom", message: rawSize.reason });
    return z.NEVER;
  }
  const { failure, html } = getProjectBodyStatus(value);
  if (failure !== undefined) {
    context.addIssue({ code: "custom", message: failure });
    return z.NEVER;
  }
  return html;
});
export const projectContentLocalizationSchema = z
  .object({
    languageCode: projectLanguageSchema,
    projectTitle: z.string().trim().min(1).max(MAX_LENGTH_TITLE),
    body: projectBodySchema,
  })
  .strict();
export type ProjectLanguageCode = z.infer<typeof projectLanguageSchema>;

export function getProjectEmailUpdateDefaultEnabled(
  setting: z.infer<typeof projectEmailUpdatesSchema>,
): boolean {
  return setting === "ask";
}

const projectLogoSourceSchema = z
  .string()
  .min(1)
  .refine((source) => {
    // Local bundled artwork may be inlined by Vite. Other image locations must
    // stay on this origin or use HTTPS without embedded credentials.
    if (/^data:image\/(?:svg\+xml|png|jpeg|webp)(?:;base64)?,/i.test(source))
      return true;
    try {
      if (source.startsWith("/")) {
        const base = "https://agora.invalid";
        return (
          !source.startsWith("//") &&
          !Array.from(source).some(
            (character) =>
              character === "\\" ||
              character.charCodeAt(0) < 32 ||
              character.charCodeAt(0) === 127,
          ) &&
          new URL(source, base).origin === base
        );
      }
      const url = new URL(source);
      return (
        url.protocol === "https:" && url.username === "" && url.password === ""
      );
    } catch {
      return false;
    }
  }, "Project logos must use a safe image source");

// Form/use-case contract, not a second copy of the backend's administrator DTO.
// A real adapter still needs atomic email-default configuration alongside project
// creation. See api/agora/README.md.
export const createProjectInputSchema = z
  .object({
    projectSlug: projectSlugSchema,
    projectTitle: z.string().trim().min(1).max(MAX_LENGTH_TITLE),
    body: projectBodySchema,
    ownerOrganizationSlugs: z
      .array(projectSlugSchema)
      .min(1)
      .refine((slugs) => new Set(slugs).size === slugs.length),
    authentication: projectAuthenticationSchema,
    emailUpdates: projectEmailUpdatesSchema,
    contact: projectParticipantContactSchema.optional(),
    attributions: z.array(projectAttributionSchema).default([]),
    languageSettings: projectLanguageSettingsSchema,
    contentLocalizations: z.array(projectContentLocalizationSchema),
  })
  .strict()
  .superRefine((input, context) => {
    if (
      getProjectEmailUpdateDefaultEnabled(input.emailUpdates) &&
      input.contact?.email === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["contact"],
        message: "Email Updates require a monitored participant contact email",
      });
    }
    const creditKeys = new Set<string>();
    for (const [index, attribution] of input.attributions.entries()) {
      if (attribution.source !== "organization") continue;
      const key = `${attribution.role}:${attribution.organizationSlug}`;
      if (creditKeys.has(key)) {
        context.addIssue({
          code: "custom",
          path: ["attributions", index],
          message: "An organization can have each public credit role only once",
        });
      }
      creditKeys.add(key);
    }
    const targets = new Set(input.languageSettings.targetLanguageCodes);
    const localizations = new Map<
      ProjectLanguageCode,
      z.infer<typeof projectContentLocalizationSchema>
    >();
    for (const [index, localization] of input.contentLocalizations.entries()) {
      if (
        !targets.has(localization.languageCode) ||
        localizations.has(localization.languageCode)
      ) {
        context.addIssue({
          code: "custom",
          path: ["contentLocalizations", index, "languageCode"],
          message: "Translations must use unique configured target languages",
        });
      }
      if (input.body !== "" && localization.body === "") {
        context.addIssue({
          code: "custom",
          path: ["contentLocalizations", index, "body"],
          message: "Translate the description when the project has one",
        });
      }
      localizations.set(localization.languageCode, localization);
    }
    if (!input.languageSettings.dynamicTranslationEnabled) {
      for (const languageCode of targets) {
        if (!localizations.has(languageCode)) {
          context.addIssue({
            code: "custom",
            path: ["contentLocalizations"],
            message:
              "Manual project translations are required when dynamic translation is off",
          });
        }
      }
    }
  });

export const projectOrganizationSchema = z
  .object({
    organizationSlug: projectSlugSchema,
    name: z.string().min(1),
    initials: z.string().min(1),
    logo: z
      .object({
        src: projectLogoSourceSchema,
        compactSrc: projectLogoSourceSchema.optional(),
        tone: z.enum(["coral", "primary"]),
      })
      .strict()
      .optional(),
  })
  .strict();

export const projectDirectoryVisibilitySchema = z.enum(["listed", "unlisted"]);

export const workspaceProjectSchema = createProjectInputSchema
  .safeExtend({
    projectId: z.number().int().positive(),
    createdAt: z.iso.datetime(),
    directoryVisibility: projectDirectoryVisibilitySchema.default("unlisted"),
    headerBackgroundImageSrc: projectHeaderBackgroundImageSrcSchema.optional(),
    ownerOrganizations: z.array(projectOrganizationSchema).min(1),
    referencedOrganizations: z.array(projectOrganizationSchema).default([]),
  })
  .strict()
  .superRefine((project, context) => {
    const owners = new Set(
      project.ownerOrganizations.map((owner) => owner.organizationSlug),
    );
    if (
      owners.size !== project.ownerOrganizations.length ||
      owners.size !== project.ownerOrganizationSlugs.length ||
      project.ownerOrganizationSlugs.some((slug) => !owners.has(slug))
    ) {
      context.addIssue({
        code: "custom",
        path: ["ownerOrganizations"],
        message:
          "Project owner identities must match the selected organizations",
      });
    }
    const references = new Set(
      project.referencedOrganizations.map(
        (organization) => organization.organizationSlug,
      ),
    );
    if (references.size !== project.referencedOrganizations.length) {
      context.addIssue({
        code: "custom",
        path: ["referencedOrganizations"],
        message: "Referenced organization identities must be unique",
      });
    }
    const publicReferences = [
      ...(project.contact?.organizationSlug === undefined
        ? []
        : [project.contact.organizationSlug]),
      ...project.attributions.flatMap((attribution) =>
        attribution.source === "organization"
          ? [attribution.organizationSlug]
          : [],
      ),
    ];
    if (
      publicReferences.some(
        (slug) => !owners.has(slug) && !references.has(slug),
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["referencedOrganizations"],
        message: "Contact and credit organizations must have saved identities",
      });
    }
  });

export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;
export type ProjectOrganization = z.infer<typeof projectOrganizationSchema>;
export type WorkspaceProject = z.infer<typeof workspaceProjectSchema>;

export function createProjectSlug({
  title,
  uniquePart,
}: {
  title: string;
  uniquePart: string;
}): string {
  const suffix = uniquePart
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 12);
  const prefix = title
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const available = MAX_LENGTH_NAME_CREATOR - suffix.length - 1;
  const base = (prefix || "project").slice(0, available).replace(/-$/g, "");
  return projectSlugSchema.parse(`${base}-${suffix}`);
}
