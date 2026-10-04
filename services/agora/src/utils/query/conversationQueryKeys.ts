import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

import type { ViewerQueryScope } from "./viewerScope";

export function getUserVotesQueryKey({
  conversationSlugId,
  voterId,
}: {
  conversationSlugId: string;
  voterId: string | undefined;
}) {
  return ["userVotes", conversationSlugId, voterId] as const;
}

export type UserVotesQueryKey = ReturnType<typeof getUserVotesQueryKey>;

export function getConversationQueryKey({
  conversationSlugId,
  displayLanguage,
  spokenLanguages,
  viewerScope,
}: {
  conversationSlugId: string;
  displayLanguage: SupportedDisplayLanguageCodes;
  spokenLanguages: readonly string[];
  viewerScope: ViewerQueryScope;
}) {
  return [
    "conversation",
    conversationSlugId,
    displayLanguage,
    [...spokenLanguages].sort(),
    viewerScope,
  ] as const;
}

export function getMaxDiffLoadQueryKey({
  conversationSlugId,
  viewerScope,
}: {
  conversationSlugId: string;
  viewerScope: ViewerQueryScope;
}) {
  return ["maxdiff-load", conversationSlugId, viewerScope] as const;
}

export function getSurveyStatusQueryKey({
  conversationSlugId,
  viewerScope,
}: {
  conversationSlugId: string;
  viewerScope: ViewerQueryScope;
}) {
  return ["survey-status", conversationSlugId, viewerScope] as const;
}

export function getSurveyFormQueryKey({
  conversationSlugId,
  displayLanguage,
  spokenLanguages,
  viewerScope,
}: {
  conversationSlugId: string;
  displayLanguage: SupportedDisplayLanguageCodes;
  spokenLanguages: readonly string[];
  viewerScope: ViewerQueryScope;
}) {
  return [
    "survey-form",
    conversationSlugId,
    displayLanguage,
    [...spokenLanguages].sort(),
    viewerScope,
  ] as const;
}
