import {
  type ConversationRouteContext,
  getConversationPath,
  getConversationShareUrl,
  normalConversationRouteContext,
} from "src/utils/router/conversationRouteContext";

export function useConversationUrl() {
  function getConversationUrl({
    conversationSlugId,
    routeContext = normalConversationRouteContext,
  }: {
    conversationSlugId: string;
    routeContext?: ConversationRouteContext;
  }): string {
    return getConversationShareUrl({ conversationSlugId, routeContext });
  }

  function getEmbedUrl(conversationSlugId: string): string {
    return new URL(
      getConversationPath({
        conversationSlugId,
        routeContext: { kind: "embed" },
      }),
      window.location.origin
    ).href;
  }

  return { getConversationUrl, getEmbedUrl };
}
