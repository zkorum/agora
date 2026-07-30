import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import type { ProjectDisplayedContent } from "src/shared/types/zod";

const SETTLED_PROJECT_CONTENT_STALE_TIME_MS = 5 * 60 * 1000;

export function getProjectContentStaleTime(
  status: ProjectDisplayedContent["status"] | undefined
): number {
  return status === "pending" || status === "running"
    ? 0
    : SETTLED_PROJECT_CONTENT_STALE_TIME_MS;
}

export function getProjectContentQueryKey({
  projectSlug,
  conversationSlugId,
  sourceVersion,
  mode,
  targetLanguageCode,
  spokenLanguages,
}: {
  projectSlug: string;
  conversationSlugId: string | undefined;
  sourceVersion: string;
  mode: "original" | "translated";
  targetLanguageCode: SupportedDisplayLanguageCodes;
  spokenLanguages: readonly string[];
}) {
  return [
    "projectContent",
    projectSlug,
    conversationSlugId,
    sourceVersion,
    mode,
    targetLanguageCode,
    [...spokenLanguages].sort(),
  ] as const;
}

export function isProjectTranslatedContentQueryKey({
  queryKey,
  projectSlug,
  sourceVersion,
  targetLanguageCode,
}: {
  queryKey: readonly unknown[];
  projectSlug: string;
  sourceVersion: string;
  targetLanguageCode: SupportedDisplayLanguageCodes;
}): boolean {
  return (
    queryKey[0] === "projectContent" &&
    queryKey[1] === projectSlug &&
    queryKey[3] === sourceVersion &&
    queryKey[4] === "translated" &&
    queryKey[5] === targetLanguageCode
  );
}
