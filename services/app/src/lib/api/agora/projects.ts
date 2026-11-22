import { z } from "zod";

import {
  type CreateProjectInput,
  projectDirectoryVisibilitySchema,
  type ProjectOrganization,
  projectSlugSchema,
  type WorkspaceProject,
} from "$logic/agora/project-creation.js";
import type { projectHeaderBackgroundChangeSchema } from "$logic/agora/project-header-background.js";

import type {
  CreatedProjectConversation,
  PublishConversationDraftInput,
  UpdateCreatedConversationInput,
} from "./conversation-setup.js";

export const projectConversationTypeSchema = z.enum([
  "gathering",
  "polis",
  "prioritizing",
]);
export type ProjectConversationType = z.infer<
  typeof projectConversationTypeSchema
>;

export const projectConversationDraftInputSchema = z
  .object({
    projectSlug: projectSlugSchema,
    conversationType: projectConversationTypeSchema,
  })
  .strict();
export type CreateProjectConversationDraftInput = z.infer<
  typeof projectConversationDraftInputSchema
>;

export const projectConversationDraftSchema =
  projectConversationDraftInputSchema
    .extend({ id: z.uuid(), createdAt: z.iso.datetime() })
    .strict();
export type ProjectConversationDraft = z.infer<
  typeof projectConversationDraftSchema
>;

export interface ProjectCreationOptions {
  /** Owner selected by workspace context; creation does not edit ownership. */
  defaultOwnerOrganizationSlug: string | undefined;
  /** Organizations the current user may select as administrative owners. */
  organizations: readonly ProjectOrganization[];
  /** Listed identities available for public credit and contact affiliation. */
  publicOrganizations: readonly ProjectOrganization[];
}

export type CreateProjectResult =
  | { success: true; project: WorkspaceProject }
  | {
      success: false;
      reason: "project_slug_already_exists" | "organization_not_allowed";
    };

export interface ProjectWorkspaceSnapshot {
  projects: readonly WorkspaceProject[];
  drafts: readonly ProjectConversationDraft[];
  conversations: readonly CreatedProjectConversation[];
}

export type ProjectSettingsSection =
  | "details"
  | "name"
  | "description"
  | "organizations"
  | "access"
  | "languages";

export interface ProjectSettingsTarget {
  projectSlug: string;
  section: ProjectSettingsSection;
}

export const setProjectDirectoryVisibilityInputSchema = z.strictObject({
  projectSlug: projectSlugSchema,
  directoryVisibility: projectDirectoryVisibilitySchema,
});
export type SetProjectDirectoryVisibilityInput = z.infer<
  typeof setProjectDirectoryVisibilityInputSchema
>;

/** Writable settings only; directory visibility and record identity are separate. */
export type UpdateProjectSettingsInput = CreateProjectInput & {
  /** Omission preserves the current background. */
  headerBackgroundChange?: z.infer<typeof projectHeaderBackgroundChangeSchema>;
};

/** Feature-facing API; components never import a particular implementation. */
export interface ProjectsApi {
  getCreationOptions: () => Promise<ProjectCreationOptions>;
  loadWorkspace: () => Promise<ProjectWorkspaceSnapshot>;
  create: (input: CreateProjectInput) => Promise<CreateProjectResult>;
  updateProjectSettings: (
    settings: UpdateProjectSettingsInput,
  ) => Promise<WorkspaceProject | undefined>;
  setProjectDirectoryVisibility: (
    input: SetProjectDirectoryVisibilityInput,
  ) => Promise<WorkspaceProject | undefined>;
  createConversationDraft: (
    input: CreateProjectConversationDraftInput,
  ) => Promise<ProjectConversationDraft | undefined>;
  publishConversationDraft: (
    input: PublishConversationDraftInput,
  ) => Promise<CreatedProjectConversation | undefined>;
  updateCreatedConversation: (
    input: UpdateCreatedConversationInput,
  ) => Promise<CreatedProjectConversation | undefined>;
}
