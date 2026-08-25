import { describe, expect, it } from "vitest";

import {
  applyPreferenceOverrides,
  AUTO_EXPAND_PREFERENCE_GROUP_LIMIT,
  getAutoExpandedPreferenceGroupKeys,
  getPreferenceOverridesFromResult,
  setPreferenceOverrides,
} from "./conversationUpdatePreferenceLogic";
import type {
  NoProjectEmailUpdatePreferenceGroup,
  ProjectEmailUpdatePreferenceGroup,
} from "./conversationUpdatePreferenceTypes";

describe("conversationUpdatePreferenceLogic", () => {
  it("auto-expands projects at the configured conversation limit", () => {
    const projectAtLimit = createProjectGroup(
      AUTO_EXPAND_PREFERENCE_GROUP_LIMIT
    );
    const projectOverLimit = {
      ...createProjectGroup(AUTO_EXPAND_PREFERENCE_GROUP_LIMIT + 1),
      projectSlug: "project-over-limit",
    } satisfies ProjectEmailUpdatePreferenceGroup;

    const expandedGroupKeys = getAutoExpandedPreferenceGroupKeys({
      groups: [projectAtLimit, projectOverLimit],
      expandAll: false,
    });

    expect(expandedGroupKeys).toEqual(
      new Set([`project:${projectAtLimit.projectSlug}`])
    );
  });

  it("expands every project for search results", () => {
    const project = createProjectGroup(
      AUTO_EXPAND_PREFERENCE_GROUP_LIMIT + 1
    );

    expect(
      getAutoExpandedPreferenceGroupKeys({ groups: [project], expandAll: true })
    ).toEqual(new Set([`project:${project.projectSlug}`]));
  });

  it("does not expand an empty project group", () => {
    const project = createProjectGroup(0);

    expect(
      getAutoExpandedPreferenceGroupKeys({ groups: [project], expandAll: true })
    ).toEqual(new Set());
  });

  it("applies the same expansion threshold to No Project", () => {
    const noProjectAtLimit = createNoProjectGroup(
      AUTO_EXPAND_PREFERENCE_GROUP_LIMIT
    );
    const noProjectOverLimit = createNoProjectGroup(
      AUTO_EXPAND_PREFERENCE_GROUP_LIMIT + 1
    );

    expect(
      getAutoExpandedPreferenceGroupKeys({
        groups: [noProjectAtLimit],
        expandAll: false,
      })
    ).toEqual(new Set(["no-project"]));
    expect(
      getAutoExpandedPreferenceGroupKeys({
        groups: [noProjectOverLimit],
        expandAll: false,
      })
    ).toEqual(new Set());
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

function createNoProjectGroup(
  conversationCount: number
): NoProjectEmailUpdatePreferenceGroup {
  return {
    kind: "no_project",
    availability: "available",
    conversations: createProjectGroup(conversationCount).conversations,
  };
}
