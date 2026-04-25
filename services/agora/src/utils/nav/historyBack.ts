import type { RouteLocationRaw, Router } from "vue-router";

function normalizeHistoryPath(path: string): string {
  const parsedUrl = new URL(path, "https://example.test");
  const pathWithPossibleHashRoute = parsedUrl.hash.startsWith("#/")
    ? parsedUrl.hash.slice(1)
    : parsedUrl.pathname;
  const [pathname] = pathWithPossibleHashRoute.split("?");

  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

export function isHistoryPathEqual({
  historyPath,
  expectedPath,
}: {
  historyPath: unknown;
  expectedPath: string;
}): boolean {
  return (
    typeof historyPath === "string" &&
    normalizeHistoryPath(historyPath) === normalizeHistoryPath(expectedPath)
  );
}

export function wasNavigationTriggeredByHistory({
  currentPath,
  historyBack,
  historyForward,
}: {
  currentPath: string;
  historyBack: unknown;
  historyForward: unknown;
}): boolean {
  return (
    isHistoryPathEqual({
      historyPath: historyBack,
      expectedPath: currentPath,
    }) ||
    isHistoryPathEqual({
      historyPath: historyForward,
      expectedPath: currentPath,
    })
  );
}

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
  if (typeof historyBack !== "string") {
    return false;
  }

  const normalizedHistoryBack = normalizeHistoryPath(historyBack);
  const normalizedConversationPathPrefix = normalizeHistoryPath(
    conversationPathPrefix
  );

  return (
    normalizedHistoryBack.startsWith(normalizedConversationPathPrefix) &&
    !normalizedHistoryBack.includes("/analysis")
  );
}

export function isHistoryBackToPath({
  historyBack,
  expectedPath,
}: {
  historyBack: unknown;
  expectedPath: string;
}): boolean {
  return isHistoryPathEqual({ historyPath: historyBack, expectedPath });
}

export function getHistoryPosition({
  historyState,
}: {
  historyState: unknown;
}): number | null {
  if (
    typeof historyState !== "object" ||
    historyState === null ||
    !("position" in historyState) ||
    typeof historyState.position !== "number"
  ) {
    return null;
  }

  return historyState.position;
}

export async function navigateBackOrReplace({
  router,
  fallbackRoute,
  shouldNavigateBack,
}: {
  router: Pick<Router, "back" | "replace">;
  fallbackRoute: RouteLocationRaw;
  shouldNavigateBack: boolean;
}): Promise<void> {
  if (shouldNavigateBack) {
    router.back();
    return;
  }

  await router.replace(fallbackRoute);
}

export async function navigateToHistoryPositionOrReplace({
  router,
  fallbackRoute,
  targetHistoryPosition,
  currentHistoryPosition,
}: {
  router: Pick<Router, "go" | "replace">;
  fallbackRoute: RouteLocationRaw;
  targetHistoryPosition: number | null;
  currentHistoryPosition: number | null;
}): Promise<void> {
  if (
    targetHistoryPosition !== null &&
    currentHistoryPosition !== null &&
    targetHistoryPosition < currentHistoryPosition
  ) {
    router.go(targetHistoryPosition - currentHistoryPosition);
    return;
  }

  await router.replace(fallbackRoute);
}
