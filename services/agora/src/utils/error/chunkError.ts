const CHUNK_ERROR_PATTERNS = [
  "Failed to fetch dynamically imported module",
  "error loading dynamically imported module",
  "Importing a module script failed",
  "Loading chunk",
  "Loading CSS chunk",
  "Unable to preload CSS",
] as const;

const RELOAD_KEY = "chunk-reload";
const RELOAD_COOLDOWN_MS = 10_000;

export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return CHUNK_ERROR_PATTERNS.some((pattern) =>
    error.message.includes(pattern)
  );
}

/**
 * Attempts recovery from a chunk load error by reloading the page.
 * Returns false when reloading is unsafe or was attempted too recently.
 * When `navigateTo` is provided, navigates to that URL instead of reloading.
 */
export function reloadForChunkError({
  navigateTo,
}: { navigateTo?: string } = {}): boolean {
  if (import.meta.env.DEV) {
    console.warn("[ChunkRecovery] Suppressed chunk reload in dev mode");
    return false;
  }
  if (!navigator.onLine) {
    console.warn("[ChunkRecovery] Reload skipped while offline");
    return false;
  }

  const now = Date.now();
  try {
    const lastReload = sessionStorage.getItem(RELOAD_KEY);
    if (lastReload !== null) {
      const elapsedSinceReload = now - Number(lastReload);
      if (
        elapsedSinceReload >= 0 &&
        elapsedSinceReload < RELOAD_COOLDOWN_MS
      ) {
        console.warn("[ChunkRecovery] Reload skipped during cooldown");
        return false;
      }
    }
    sessionStorage.setItem(RELOAD_KEY, String(now));
  } catch {
    console.warn("[ChunkRecovery] Reload skipped without session storage");
    return false;
  }

  if (navigateTo) {
    window.location.href = navigateTo;
  } else {
    window.location.reload();
  }
  return true;
}
