import * as m from "#lib/paraglide/messages.js";

import type { ProjectsApi, ProjectWorkspaceSnapshot } from "./projects.js";

export interface ProjectsRuntime {
  api: ProjectsApi;
  resetMock: (() => ProjectWorkspaceSnapshot) | undefined;
}

/** Call only after hydration. No browser storage or shared mutable SSR state. */
export async function createProjectsRuntime({
  mockDelayMs = 300,
} = {}): Promise<ProjectsRuntime | undefined> {
  // Keep the guard around the import itself. Vite can eliminate this branch
  // before discovering dynamic chunks in builds where mocks are disabled.
  if (
    import.meta.env.DEV ||
    (import.meta.env.VITE_STAGING === "true" &&
      import.meta.env.VITE_PROJECTS_MOCK === "true")
  ) {
    if (typeof window === "undefined") return undefined;
    const { createMockProjectsApi } = await import("./mock/projects.js");
    const { api, reset } = createMockProjectsApi({
      storage: window.sessionStorage,
      delayMs: mockDelayMs,
      personalWorkspace: {
        organizationName: m.project_mock_personal_organization(),
        projectTitle: m.project_mock_default_project(),
      },
    });
    return { api, resetMock: reset };
  }
  return undefined;
}
