const CHUNK_ERROR_PATTERNS = [
  "Failed to fetch dynamically imported module",
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
 * Returns false if a reload was attempted too recently (10s cooldown).
 * When `navigateTo` is provided, navigates to that URL instead of reloading.
 */
export function reloadForChunkError({
  navigateTo,
}: { navigateTo?: string } = {}): boolean {
  if (import.meta.env.DEV) {
    console.warn("[ChunkRecovery] Suppressed chunk reload in dev mode");
    return false;
  }
  const lastReload = sessionStorage.getItem(RELOAD_KEY);
  const now = Date.now();
  if (lastReload && now - Number(lastReload) < RELOAD_COOLDOWN_MS) {
    console.error(
      "[ChunkRecovery] Chunk load failed after recent reload, giving up"
    );
    return false;
  }
  sessionStorage.setItem(RELOAD_KEY, String(now));
  if (navigateTo) {
    window.location.href = navigateTo;
  } else {
    window.location.reload();
  }
  return true;
}
