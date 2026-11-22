import { createContext } from "svelte";

import type {
  CreatedProjectConversation,
  PublishConversationDraftInput,
  UpdateCreatedConversationInput,
} from "#lib/api/agora/conversation-setup.js";
import {
  createProjectsRuntime,
  type ProjectsRuntime,
} from "#lib/api/agora/create-projects-api.js";
import type {
  CreateProjectConversationDraftInput,
  ProjectConversationDraft,
  ProjectsApi,
  ProjectSettingsTarget,
  SetProjectDirectoryVisibilityInput,
  UpdateProjectSettingsInput,
} from "#lib/api/agora/projects.js";
import type { WorkspaceProject } from "$logic/agora/project-creation.js";

type WorkspaceProjectsStatus =
  | { kind: "idle" | "loading" | "unavailable" | "error" }
  | { kind: "ready"; api: ProjectsApi };

export function createWorkspaceProjects() {
  let status = $state.raw<WorkspaceProjectsStatus>({ kind: "idle" });
  let projects = $state.raw<readonly WorkspaceProject[]>([]);
  let drafts = $state.raw<readonly ProjectConversationDraft[]>([]);
  let conversations = $state.raw<readonly CreatedProjectConversation[]>([]);
  let resetMock = $state.raw<ProjectsRuntime["resetMock"]>();
  let resetError = $state(false);
  let pendingWrites = $state(0);
  let isUpdatingProject = $state(false);
  let isCreatingConversationDraft = $state(false);
  let isPublishingConversationDraft = $state(false);
  let isUpdatingCreatedConversation = $state(false);

  function upsertProject(project: WorkspaceProject): void {
    const existing = projects.findIndex(
      (item) =>
        item.projectId === project.projectId ||
        item.projectSlug === project.projectSlug,
    );
    if (existing < 0) {
      projects = [...projects, project];
      return;
    }
    projects = [
      ...projects.slice(0, existing),
      project,
      ...projects
        .slice(existing + 1)
        .filter(
          (item) =>
            item.projectId !== project.projectId &&
            item.projectSlug !== project.projectSlug,
        ),
    ];
  }

  async function writeProject(
    write: (api: ProjectsApi) => Promise<WorkspaceProject | undefined>,
  ): Promise<WorkspaceProject | undefined> {
    if (status.kind !== "ready" || isUpdatingProject) return undefined;
    isUpdatingProject = true;
    pendingWrites += 1;
    try {
      const saved = await write(status.api);
      if (saved !== undefined) upsertProject(saved);
      return saved;
    } finally {
      pendingWrites -= 1;
      isUpdatingProject = false;
    }
  }

  function updateProject(
    input: UpdateProjectSettingsInput,
  ): Promise<WorkspaceProject | undefined> {
    return writeProject((api) => api.updateProjectSettings(input));
  }

  function setProjectDirectoryVisibility(
    input: SetProjectDirectoryVisibilityInput,
  ): Promise<WorkspaceProject | undefined> {
    return writeProject((api) => api.setProjectDirectoryVisibility(input));
  }

  async function createConversationDraft(
    input: CreateProjectConversationDraftInput,
  ): Promise<ProjectConversationDraft | undefined> {
    if (status.kind !== "ready" || isCreatingConversationDraft)
      return undefined;
    isCreatingConversationDraft = true;
    pendingWrites += 1;
    try {
      const draft = await status.api.createConversationDraft(input);
      if (draft !== undefined) {
        drafts = [draft, ...drafts.filter(({ id }) => id !== draft.id)];
      }
      return draft;
    } finally {
      pendingWrites -= 1;
      isCreatingConversationDraft = false;
    }
  }

  async function publishConversationDraft(
    input: PublishConversationDraftInput,
  ): Promise<CreatedProjectConversation | undefined> {
    if (status.kind !== "ready" || isPublishingConversationDraft)
      return undefined;
    isPublishingConversationDraft = true;
    pendingWrites += 1;
    try {
      const created = await status.api.publishConversationDraft(input);
      if (created !== undefined) {
        conversations = [created, ...conversations];
        drafts = drafts.filter(({ id }) => id !== created.id);
      }
      return created;
    } finally {
      pendingWrites -= 1;
      isPublishingConversationDraft = false;
    }
  }

  async function updateCreatedConversation(
    input: UpdateCreatedConversationInput,
  ): Promise<CreatedProjectConversation | undefined> {
    if (status.kind !== "ready" || isUpdatingCreatedConversation)
      return undefined;
    isUpdatingCreatedConversation = true;
    pendingWrites++;
    try {
      const saved = await status.api.updateCreatedConversation(input);
      if (saved)
        conversations = conversations.map((item) =>
          item.id === saved.id ? saved : item,
        );
      return saved;
    } finally {
      pendingWrites--;
      isUpdatingCreatedConversation = false;
    }
  }

  async function initialize(
    createRuntime: typeof createProjectsRuntime = createProjectsRuntime,
  ): Promise<void> {
    if (status.kind === "loading" || status.kind === "ready") return;
    status = { kind: "loading" };
    try {
      const runtime = await createRuntime();
      if (!runtime) {
        resetMock = undefined;
        status = { kind: "unavailable" };
        return;
      }
      resetMock = runtime.resetMock;
      ({ projects, drafts, conversations } = await runtime.api.loadWorkspace());
      status = {
        kind: "ready",
        api: {
          ...runtime.api,
          async create(input) {
            pendingWrites += 1;
            try {
              const result = await runtime.api.create(input);
              if (result.success) {
                upsertProject(result.project);
              }
              return result;
            } finally {
              pendingWrites -= 1;
            }
          },
        },
      };
    } catch {
      status = { kind: "error" };
    }
  }

  function reset(): boolean {
    resetError = false;
    if (
      (status.kind !== "ready" && status.kind !== "error") ||
      resetMock === undefined ||
      pendingWrites > 0
    ) {
      return false;
    }
    try {
      ({ projects, drafts, conversations } = resetMock());
      return true;
    } catch {
      resetError = true;
      return false;
    }
  }

  return {
    get status() {
      return status;
    },
    get projects() {
      return projects;
    },
    get isUpdatingProject() {
      return isUpdatingProject;
    },
    get isCreatingConversationDraft() {
      return isCreatingConversationDraft;
    },
    get isPublishingConversationDraft() {
      return isPublishingConversationDraft;
    },
    get isUpdatingCreatedConversation() {
      return isUpdatingCreatedConversation;
    },
    get resetError() {
      return resetError;
    },
    get canReset() {
      return (
        (status.kind === "ready" || status.kind === "error") &&
        resetMock !== undefined &&
        pendingWrites === 0
      );
    },
    get hasMockControls() {
      return resetMock !== undefined;
    },
    initialize,
    updateProject,
    setProjectDirectoryVisibility,
    createConversationDraft,
    publishConversationDraft,
    updateCreatedConversation,
    getCreatedConversations: (projectSlug: string) =>
      conversations.filter((item) => item.projectSlug === projectSlug),
    getConversationDrafts: (
      projectSlug: string,
    ): readonly ProjectConversationDraft[] =>
      drafts.filter((draft) => draft.projectSlug === projectSlug),
    reset,
  };
}

export type WorkspaceProjects = ReturnType<typeof createWorkspaceProjects>;

export const [getWorkspaceProjects, setWorkspaceProjects] = createContext<{
  projects: WorkspaceProjects;
  openCreateProject: () => void;
  openProjectSettings: (target: ProjectSettingsTarget) => void;
}>();
