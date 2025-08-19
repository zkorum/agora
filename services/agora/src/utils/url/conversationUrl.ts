export function useConversationUrl() {
  function getConversationUrl(conversationSlugId: string): string {
    return (
      window.location.origin +
      process.env.VITE_PUBLIC_DIR +
      "conversation/" +
      conversationSlugId
    );
  }

  function getEmbedUrl(conversationSlugId: string): string {
    return (
      window.location.origin +
      process.env.VITE_PUBLIC_DIR +
      "conversation/" +
      conversationSlugId +
      "/embed"
    );
  }

  return { getConversationUrl, getEmbedUrl };
}
