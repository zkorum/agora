export function useConversationUrl() {
  function getConversationUrl(conversationSlugId: string): string {
    return new URL(
      `/conversation/${conversationSlugId}`,
      window.location.origin
    ).href;
  }

  function getEmbedUrl(conversationSlugId: string): string {
    return new URL(
      `/conversation/${conversationSlugId}/embed`,
      window.location.origin
    ).href;
  }

  return { getConversationUrl, getEmbedUrl };
}
