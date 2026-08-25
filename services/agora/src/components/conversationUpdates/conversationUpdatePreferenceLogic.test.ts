import { describe, expect, it } from "vitest";

import {
  applyPreferenceOverrides,
  AUTO_EXPAND_PROJECT_CONVERSATION_LIMIT,
  getAutoExpandedProjectSlugs,
  getPreferenceOverridesFromResult,
  setPreferenceOverrides,
} from "./conversationUpdatePreferenceLogic";
import type { ProjectEmailUpdatePreferenceGroup } from "./conversationUpdatePreferenceTypes";

describe("conversationUpdatePreferenceLogic", () => {
  it("auto-expands projects at the configured conversation limit", () => {
    const projectAtLimit = createProjectGroup(
      AUTO_EXPAND_PROJECT_CONVERSATION_LIMIT
    );
    const projectOverLimit = {
      ...createProjectGroup(AUTO_EXPAND_PROJECT_CONVERSATION_LIMIT + 1),
      projectSlug: "project-over-limit",
    } satisfies ProjectEmailUpdatePreferenceGroup;

    const expandedProjectSlugs = getAutoExpandedProjectSlugs({
      groups: [projectAtLimit, projectOverLimit],
      expandAll: false,
    });

    expect(expandedProjectSlugs).toEqual(new Set([projectAtLimit.projectSlug]));
  });

  it("expands every project for search results", () => {
    const project = createProjectGroup(
      AUTO_EXPAND_PROJECT_CONVERSATION_LIMIT + 1
    );

    expect(
      getAutoExpandedProjectSlugs({ groups: [project], expandAll: true })
    ).toEqual(new Set([project.projectSlug]));
  });

  it("applies every authoritative change from a conversation result", () => {
    const project = createProjectGroup(2);
    const overrides = setPreferenceOverrides({
      overrides: new Map(),
      preferences: getPreferenceOverridesFromResult({
        operation: "set_conversation_preference",
        globalResumed: true,
        projectPreference: {
          projectSlug: project.projectSlug,
          state: "enabled",
        },
        conversationPreferences: [
          {
            conversationSlugId: "conversation-1",
            state: "enabled",
            resolvedEnabled: true,
          },
          {
            conversationSlugId: "conversation-2",
            state: "disabled",
            resolvedEnabled: false,
          },
        ],
      }),
    });

    const state = applyPreferenceOverrides({
      globalPaused: true,
      groups: [project],
      overrides,
    });

    expect(state.globalPaused).toBe(false);
    expect(state.groups[0]).toMatchObject({
      state: "enabled",
      conversations: [
        { state: "enabled", resolvedEnabled: true },
        { state: "disabled", resolvedEnabled: false },
      ],
    });
  });
});

function createProjectGroup(
  conversationCount: number
): ProjectEmailUpdatePreferenceGroup {
  return {
    kind: "project",
    projectSlug: "project-one",
    projectTitle: "Project One",
    state: "disabled",
    resolvedEnabled: false,
    availability: "available",
    conversations: Array.from({ length: conversationCount }, (_, index) => ({
      conversationSlugId: `conversation-${String(index + 1)}`,
      conversationTitle: `Conversation ${String(index + 1)}`,
      state: "disabled",
      resolvedEnabled: false,
      availability: "available",
    })),
  };
}
