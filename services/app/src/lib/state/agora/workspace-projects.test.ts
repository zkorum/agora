import { describe, expect, test } from "vitest";

import type {
  CreateProjectResult,
  ProjectConversationDraft,
  ProjectsApi,
} from "#lib/api/agora/projects.js";
import { workspaceProjectSchema } from "$logic/agora/project-creation.js";

import { createWorkspaceProjects } from "./workspace-projects.svelte.js";

const project = workspaceProjectSchema.parse({
  projectId: 1,
  projectSlug: "riverside",
  projectTitle: "Riverside",
  body: "",
  ownerOrganizationSlugs: ["civic-tomorrow"],
  ownerOrganizations: [
    {
      organizationSlug: "civic-tomorrow",
      name: "Civic Tomorrow",
      initials: "CT",
    },
  ],
  authentication: "guest",
  emailUpdates: "off",
  languageSettings: {
    targetLanguageCodes: [],
    dynamicTranslationEnabled: false,
  },
  contentLocalizations: [],
  createdAt: "2026-11-17T12:00:00.000Z",
});

const emptyWorkspace = { projects: [], drafts: [], conversations: [] };

function fixtureApi(overrides: Partial<ProjectsApi> = {}): ProjectsApi {
  return {
    loadWorkspace: () => Promise.resolve(emptyWorkspace),
    getCreationOptions: () =>
      Promise.resolve({
        defaultOwnerOrganizationSlug: project.ownerOrganizationSlugs.at(0),
        organizations: project.ownerOrganizations,
        publicOrganizations: project.ownerOrganizations,
      }),
    create: () => Promise.resolve({ success: true, project }),
    updateProjectSettings: (settings) =>
      Promise.resolve({ ...project, ...settings }),
    setProjectDirectoryVisibility: ({ directoryVisibility }) =>
      Promise.resolve({ ...project, directoryVisibility }),
    createConversationDraft: () => Promise.resolve(undefined),
    publishConversationDraft: () => Promise.resolve(undefined),
    updateCreatedConversation: () => Promise.resolve(undefined),
    ...overrides,
  };
}

describe("workspace-scoped projects", () => {
  test("a pending draft cannot be started twice or race a mock reset", async () => {
    const pending = Promise.withResolvers<ProjectConversationDraft>();
    const workspace = createWorkspaceProjects();
    await workspace.initialize(() =>
      Promise.resolve({
        api: fixtureApi({ createConversationDraft: () => pending.promise }),
        resetMock: () => emptyWorkspace,
      }),
    );
    const draft: ProjectConversationDraft = {
      projectSlug: "riverside",
      conversationType: "polis",
      id: "9d5ffc83-ab18-42ee-bc21-686f95af3550",
      createdAt: "2026-11-17T12:00:00.000Z",
    };
    const input = {
      projectSlug: draft.projectSlug,
      conversationType: draft.conversationType,
    };
    const submission = workspace.createConversationDraft(input);
    expect(workspace.isCreatingConversationDraft).toBe(true);
    expect(workspace.reset()).toBe(false);
    await expect(
      workspace.createConversationDraft(input),
    ).resolves.toBeUndefined();
    pending.resolve(draft);
    await expect(submission).resolves.toBe(draft);
    expect(workspace.isCreatingConversationDraft).toBe(false);
    expect(workspace.getConversationDrafts("riverside")).toEqual([draft]);
    expect(workspace.getConversationDrafts("another-project")).toEqual([]);
  });

  test("does not start browser initialization during SSR construction", () => {
    const workspace = createWorkspaceProjects();
    expect(workspace.status.kind).toBe("idle");
    expect(workspace.projects).toEqual([]);
    expect(workspace.canReset).toBe(false);
  });

  test("directory visibility replaces the project without racing settings edits or a mock reset", async () => {
    const pending = Promise.withResolvers<typeof project>();
    const workspace = createWorkspaceProjects();
    await workspace.initialize(() =>
      Promise.resolve({
        api: fixtureApi({
          loadWorkspace: () =>
            Promise.resolve({ ...emptyWorkspace, projects: [project] }),
          setProjectDirectoryVisibility: () => pending.promise,
        }),
        resetMock: () => emptyWorkspace,
      }),
    );
    const originalProjects = workspace.projects;
    const submission = workspace.setProjectDirectoryVisibility({
      projectSlug: project.projectSlug,
      directoryVisibility: "listed",
    });
    expect(workspace.isUpdatingProject).toBe(true);
    expect(workspace.reset()).toBe(false);
    await expect(workspace.updateProject(project)).resolves.toBeUndefined();

    const listedProject = {
      ...project,
      directoryVisibility: "listed",
    } satisfies typeof project;
    pending.resolve(listedProject);
    await expect(submission).resolves.toBe(listedProject);
    expect(workspace.projects).toEqual([listedProject]);
    expect(originalProjects).toEqual([project]);
    expect(workspace.isUpdatingProject).toBe(false);
    expect(workspace.canReset).toBe(true);
  });

  test("successful creation seeds the list without a follow-up API read", async () => {
    let reads = 0;
    const api = fixtureApi({
      loadWorkspace: () => {
        reads++;
        return Promise.resolve(emptyWorkspace);
      },
    });
    const workspace = createWorkspaceProjects();
    await workspace.initialize(() =>
      Promise.resolve({ api, resetMock: undefined }),
    );
    if (workspace.status.kind !== "ready")
      throw new Error("Expected ready state");
    await workspace.status.api.create(project);
    expect(workspace.projects).toEqual([project]);
    expect(reads).toBe(1);
  });

  test("refuses resetting a real provider without the mock capability", async () => {
    const workspace = createWorkspaceProjects();
    await workspace.initialize(() =>
      Promise.resolve({
        api: fixtureApi({
          loadWorkspace: () =>
            Promise.resolve({ ...emptyWorkspace, projects: [project] }),
        }),
        resetMock: undefined,
      }),
    );
    expect(workspace.canReset).toBe(false);
    expect(workspace.reset()).toBe(false);
    expect(workspace.projects).toEqual([project]);
  });

  test("keeps reset available after corrupt data fails initialization", async () => {
    let corrupted = true;
    const api = fixtureApi({
      loadWorkspace: () =>
        corrupted
          ? Promise.reject(new Error("Invalid stored data"))
          : Promise.resolve(emptyWorkspace),
    });
    const runtime = {
      api,
      resetMock: () => {
        corrupted = false;
        return emptyWorkspace;
      },
    };
    const workspace = createWorkspaceProjects();
    await workspace.initialize(() => Promise.resolve(runtime));
    expect(workspace.status.kind).toBe("error");
    expect(workspace.canReset).toBe(true);
    expect(workspace.reset()).toBe(true);
    await workspace.initialize(() => Promise.resolve(runtime));
    expect(workspace.status.kind).toBe("ready");
    expect(workspace.projects).toEqual([]);
  });

  test("failed mutations never populate the sidebar/list", async () => {
    const workspace = createWorkspaceProjects();
    await workspace.initialize(() =>
      Promise.resolve({
        api: fixtureApi({
          create: () => Promise.reject(new Error("Unavailable")),
        }),
        resetMock: undefined,
      }),
    );
    if (workspace.status.kind !== "ready")
      throw new Error("Expected ready state");
    await expect(workspace.status.api.create(project)).rejects.toThrow();
    expect(workspace.projects).toEqual([]);
  });

  test("state is isolated between workspace instances", async () => {
    const first = createWorkspaceProjects();
    const second = createWorkspaceProjects();
    const runtime = { api: fixtureApi(), resetMock: undefined };
    await first.initialize(() => Promise.resolve(runtime));
    if (first.status.kind !== "ready") throw new Error("Expected ready state");
    await first.status.api.create(project);
    expect(first.projects).toEqual([project]);
    expect(second.projects).toEqual([]);
  });

  test("reset waits for pending creation and immediately applies its returned snapshot", async () => {
    const pending = Promise.withResolvers<CreateProjectResult>();
    const defaultProject = {
      ...project,
      projectId: 2,
      projectSlug: "default-project",
      projectTitle: "Default project",
    };
    const defaultDraft: ProjectConversationDraft = {
      projectSlug: defaultProject.projectSlug,
      conversationType: "polis",
      id: "9d5ffc83-ab18-42ee-bc21-686f95af3550",
      createdAt: defaultProject.createdAt,
    };
    let resets = 0;
    const workspace = createWorkspaceProjects();
    await workspace.initialize(() =>
      Promise.resolve({
        api: fixtureApi({ create: () => pending.promise }),
        resetMock: () => {
          resets++;
          return {
            ...emptyWorkspace,
            projects: [defaultProject],
            drafts: [defaultDraft],
          };
        },
      }),
    );
    if (workspace.status.kind !== "ready")
      throw new Error("Expected ready state");
    const mutation = workspace.status.api.create(project);
    expect(workspace.hasMockControls).toBe(true);
    expect(workspace.canReset).toBe(false);
    expect(workspace.reset()).toBe(false);
    expect(resets).toBe(0);
    pending.resolve({ success: true, project });
    await mutation;
    expect(workspace.canReset).toBe(true);
    expect(workspace.reset()).toBe(true);
    expect(workspace.projects).toEqual([defaultProject]);
    expect(workspace.getConversationDrafts(defaultProject.projectSlug)).toEqual(
      [defaultDraft],
    );
    expect(resets).toBe(1);
  });

  test("a rejected pending creation restores the reset capability", async () => {
    const pending = Promise.withResolvers<CreateProjectResult>();
    const workspace = createWorkspaceProjects();
    await workspace.initialize(() =>
      Promise.resolve({
        api: fixtureApi({ create: () => pending.promise }),
        resetMock: () => emptyWorkspace,
      }),
    );
    if (workspace.status.kind !== "ready")
      throw new Error("Expected ready state");
    const mutation = workspace.status.api.create(project);
    const rejected = expect(mutation).rejects.toThrow("Unavailable");
    expect(workspace.hasMockControls).toBe(true);
    expect(workspace.canReset).toBe(false);
    pending.reject(new Error("Unavailable"));
    await rejected;
    expect(workspace.canReset).toBe(true);
    expect(workspace.projects).toEqual([]);
  });

  test("idempotent creation responses update, rather than duplicate, keyed entries", async () => {
    const workspace = createWorkspaceProjects();
    await workspace.initialize(() =>
      Promise.resolve({
        api: fixtureApi({
          loadWorkspace: () =>
            Promise.resolve({ ...emptyWorkspace, projects: [project] }),
          create: () =>
            Promise.resolve({
              success: true,
              project: { ...project, projectTitle: "Updated title" },
            }),
        }),
        resetMock: undefined,
      }),
    );
    if (workspace.status.kind !== "ready")
      throw new Error("Expected ready state");
    await workspace.status.api.create(project);
    expect(workspace.projects).toHaveLength(1);
    expect(workspace.projects.at(0)?.projectTitle).toBe("Updated title");
  });
});
