import type { QueryClient } from "@tanstack/vue-query";
import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export type ConversationContentMode = "original" | "translated";

export function getConversationContentQueryKey({
  conversationSlugId,
  sourceVersion,
  mode,
  targetLanguageCode,
  spokenLanguages,
}: {
  conversationSlugId: string;
  sourceVersion: string;
  mode: ConversationContentMode;
  targetLanguageCode: SupportedDisplayLanguageCodes;
  spokenLanguages: readonly string[];
}) {
  return [
    "conversationContent",
    conversationSlugId,
    sourceVersion,
    mode,
    targetLanguageCode,
    [...spokenLanguages].sort(),
  ] as const;
}

function getConversationContentQueryPrefix({
  conversationSlugId,
}: {
  conversationSlugId: string;
}) {
  return ["conversationContent", conversationSlugId] as const;
}

export function getConversationDisplayContentQueryKey({
  conversationSlugId,
  targetLanguageCode,
  spokenLanguages,
}: {
  conversationSlugId: string;
  targetLanguageCode: SupportedDisplayLanguageCodes;
  spokenLanguages: readonly string[];
}) {
  return [
    "conversationDisplayContent",
    conversationSlugId,
    targetLanguageCode,
    [...spokenLanguages].sort(),
  ] as const;
}

function getConversationDisplayContentQueryPrefix({
  conversationSlugId,
}: {
  conversationSlugId: string;
}) {
  return ["conversationDisplayContent", conversationSlugId] as const;
}

export async function invalidateConversationContentQueries({
  queryClient,
  conversationSlugId,
}: {
  queryClient: QueryClient;
  conversationSlugId: string;
}): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: ["conversation", conversationSlugId],
      refetchType: "none",
    }),
    queryClient.invalidateQueries({
      queryKey: getConversationContentQueryPrefix({ conversationSlugId }),
      refetchType: "none",
    }),
    queryClient.invalidateQueries({
      queryKey: getConversationDisplayContentQueryPrefix({ conversationSlugId }),
      refetchType: "none",
    }),
  ]);
}
