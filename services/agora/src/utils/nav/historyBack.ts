/**
 * Returns true when the previous Vue Router history entry is a non-analysis
 * page of the same conversation (i.e. the comment/voting tab).
 *
 * Vue Router 4 stores the previous path in `window.history.state.back`.
 * This helper lets callers decide between `router.back()` (natural pop)
 * and `router.replace()` (synthetic navigation).
 */
export function isBackToConversationCommentTab({
  historyBack,
  conversationPathPrefix,
}: {
  historyBack: unknown;
  conversationPathPrefix: string;
}): boolean {
  return (
    typeof historyBack === "string" &&
    historyBack.startsWith(conversationPathPrefix) &&
    !historyBack.includes("/analysis")
  );
}
