import type { ConversationEmailUpdatePreferenceGroup } from "src/shared/types/dto";

import type {
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
  return {
    globalPaused:
      globalOverride?.kind === "global" ? globalOverride.paused : globalPaused,
    groups: groups.map((group) => {
      const projectOverride =
        group.kind === "project"
          ? overrides.get(`project:${group.projectSlug}`)
          : undefined;
      return {
        ...group,
        ...(projectOverride?.kind === "project"
          ? { state: projectOverride.state }
          : {}),
        conversations: group.conversations.map((conversation) => {
          const conversationOverride = overrides.get(
            `conversation:${conversation.conversationSlugId}`
          );
          if (conversationOverride?.kind !== "conversation") {
            return conversation;
          }
          return {
            ...conversation,
            state: conversationOverride.state,
            resolvedEnabled:
              conversationOverride.resolvedEnabled ??
              conversation.resolvedEnabled,
          };
        }),
      };
    }),
  };
}

export function getPreferenceOverridesFromResult(
  result: ConversationEmailUpdatePreferenceResult
): readonly ConversationEmailUpdatePreferenceOverride[] {
  if (result.operation === "set_global_pause") {
    return [{ kind: "global", paused: result.globalPaused }];
  }
  if (result.operation === "set_project_preference") {
    return [
      ...(result.globalResumed
        ? [{ kind: "global", paused: false } as const]
        : []),
      {
        kind: "project",
        projectSlug: result.projectSlug,
        state: result.state,
      },
    ];
  }
  return [
    ...(result.globalResumed
      ? [{ kind: "global", paused: false } as const]
      : []),
    ...(result.projectPreference === undefined
      ? []
      : [
          {
            kind: "project",
            projectSlug: result.projectPreference.projectSlug,
            state: result.projectPreference.state,
          } as const,
        ]),
    ...result.conversationPreferences.map((preference) => ({
      kind: "conversation" as const,
      conversationSlugId: preference.conversationSlugId,
      state: preference.state,
      resolvedEnabled: preference.resolvedEnabled,
    })),
  ];
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
