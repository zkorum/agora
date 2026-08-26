import type { ConversationEmailUpdatePreferenceGroup } from "src/shared/types/dto";

import type {
  ConversationEmailUpdatePreference,
  ConversationEmailUpdatePreferenceOverride,
  ConversationEmailUpdatePreferenceResult,
} from "./conversationUpdatePreferenceTypes";

export const AUTO_EXPAND_PREFERENCE_GROUP_LIMIT = 5;
export const CONVERSATION_UPDATE_PREFERENCE_PAGE_SIZE = 20;

export function getPreferenceOverrideKey(
  preference: ConversationEmailUpdatePreferenceOverride
): string {
  if (preference.kind === "global") {
    return "global";
  }
  if (preference.kind === "project") {
    return `project:${preference.projectSlug}`;
  }
  return `conversation:${preference.conversationSlugId}`;
}

export function getPreferenceGroupKey(
  group: ConversationEmailUpdatePreferenceGroup
): string {
  return group.kind === "project"
    ? `project:${group.projectSlug}`
    : "no-project";
}

export function getAutoExpandedPreferenceGroupKeys({
  groups,
  expandAll,
}: {
  groups: readonly ConversationEmailUpdatePreferenceGroup[];
  expandAll: boolean;
}): ReadonlySet<string> {
  return new Set(
    groups.flatMap((group) =>
      group.conversations.length > 0 &&
      (expandAll ||
        group.conversations.length <= AUTO_EXPAND_PREFERENCE_GROUP_LIMIT)
        ? [getPreferenceGroupKey(group)]
        : []
    )
  );
}

export function applyPreferenceOverrides({
  globalPaused,
  groups,
  overrides,
}: {
  globalPaused: boolean;
  groups: readonly ConversationEmailUpdatePreferenceGroup[];
  overrides: ReadonlyMap<string, ConversationEmailUpdatePreferenceOverride>;
}): {
  globalPaused: boolean;
  groups: readonly ConversationEmailUpdatePreferenceGroup[];
} {
  const globalOverride = overrides.get("global");
  const effectiveGlobalPaused =
    globalOverride?.kind === "global" ? globalOverride.paused : globalPaused;
  return {
    globalPaused: effectiveGlobalPaused,
    groups: groups.map((group) => {
      if (group.kind === "no_project") {
        return {
          ...group,
          conversations: group.conversations.map((conversation) =>
            applyConversationPreferenceOverride({
              conversation,
              effectiveGlobalPaused,
              projectEnabled: undefined,
              overrides,
            })
          ),
        };
      }
      const projectOverride =
        overrides.get(`project:${group.projectSlug}`);
      const state =
        projectOverride?.kind === "project"
          ? projectOverride.state
          : group.state;
      const projectEnabled = state === "enabled";
      return {
        ...group,
        state,
        resolvedEnabled: !effectiveGlobalPaused && projectEnabled,
        conversations: group.conversations.map((conversation) =>
          applyConversationPreferenceOverride({
            conversation,
            effectiveGlobalPaused,
            projectEnabled,
            overrides,
          })
        ),
      };
    }),
  };
}

function applyConversationPreferenceOverride({
  conversation,
  effectiveGlobalPaused,
  projectEnabled,
  overrides,
}: {
  conversation: ConversationEmailUpdatePreference;
  effectiveGlobalPaused: boolean;
  projectEnabled: boolean | undefined;
  overrides: ReadonlyMap<string, ConversationEmailUpdatePreferenceOverride>;
}): ConversationEmailUpdatePreference {
  const conversationOverride = overrides.get(
    `conversation:${conversation.conversationSlugId}`
  );
  if (conversationOverride?.kind === "conversation") {
    return {
      ...conversation,
      preferenceKind: "explicit",
      state: conversationOverride.state,
      resolvedEnabled:
        !effectiveGlobalPaused && conversationOverride.state === "enabled",
    };
  }
  if (conversation.preferenceKind === "explicit") {
    return {
      ...conversation,
      resolvedEnabled:
        !effectiveGlobalPaused && conversation.state === "enabled",
    };
  }
  return {
    ...conversation,
    resolvedEnabled:
      conversation.preferenceKind === "project_inherited" &&
      !effectiveGlobalPaused &&
      projectEnabled === true,
  };
}

export function getPreferenceOverridesFromResult(
  result: ConversationEmailUpdatePreferenceResult
): readonly ConversationEmailUpdatePreferenceOverride[] {
  if (result.operation === "set_global_pause") {
    return [{ kind: "global", paused: result.globalPaused }];
  }
  const overrides: ConversationEmailUpdatePreferenceOverride[] = [];
  if (result.globalResumed) {
    overrides.push({ kind: "global", paused: false });
  }
  if (result.operation === "set_project_preference") {
    overrides.push({
      kind: "project",
      projectSlug: result.projectSlug,
      state: result.state,
    });
    return overrides;
  }
  if (result.projectPreference !== undefined) {
    overrides.push({
      kind: "project",
      projectSlug: result.projectPreference.projectSlug,
      state: result.projectPreference.state,
    });
  }
  for (const preference of result.conversationPreferences) {
    overrides.push({
      kind: "conversation",
      conversationSlugId: preference.conversationSlugId,
      state: preference.state,
    });
  }
  return overrides;
}

export function setPreferenceOverrides({
  overrides,
  preferences,
}: {
  overrides: ReadonlyMap<string, ConversationEmailUpdatePreferenceOverride>;
  preferences: readonly ConversationEmailUpdatePreferenceOverride[];
}): ReadonlyMap<string, ConversationEmailUpdatePreferenceOverride> {
  const nextOverrides = new Map(overrides);
  for (const preference of preferences) {
    nextOverrides.set(getPreferenceOverrideKey(preference), preference);
  }
  return nextOverrides;
}
