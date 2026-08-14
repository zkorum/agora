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

export type ChunkReloadResult = "blocked" | "pending" | "started";

const recoveryStartedAtByError = new WeakMap<Error, number>();

export function isChunkLoadError(error: unknown): error is Error {
  if (!(error instanceof Error)) return false;
  return CHUNK_ERROR_PATTERNS.some((pattern) =>
    error.message.includes(pattern)
  );
}

/**
 * Attempts recovery from a chunk load error by reloading the page.
 * Coalesces duplicate delivery of the same error while navigation starts,
 * while the persisted cooldown detects failures that survive a reload.
 * When `navigateTo` is provided, navigates to that URL instead of reloading.
 */
export function reloadForChunkError({
  error,
  navigateTo,
}: {
  error: Error;
  navigateTo?: string;
}): ChunkReloadResult {
  if (import.meta.env.DEV) {
    console.warn("[ChunkRecovery] Suppressed chunk reload in dev mode");
    return "blocked";
  }

  const now = Date.now();
  const recoveryStartedAt = recoveryStartedAtByError.get(error);
  if (recoveryStartedAt !== undefined) {
    const elapsedSinceRecovery = now - recoveryStartedAt;
    if (
      elapsedSinceRecovery >= 0 &&
      elapsedSinceRecovery < RELOAD_COOLDOWN_MS
    ) {
      return "pending";
    }
    recoveryStartedAtByError.delete(error);
  }

  if (!navigator.onLine) {
    console.warn("[ChunkRecovery] Reload skipped while offline");
    return "blocked";
  }

  try {
    const lastReload = sessionStorage.getItem(RELOAD_KEY);
    if (lastReload !== null) {
      const elapsedSinceReload = now - Number(lastReload);
      if (elapsedSinceReload >= 0 && elapsedSinceReload < RELOAD_COOLDOWN_MS) {
        console.warn("[ChunkRecovery] Reload skipped during cooldown");
        return "blocked";
      }
    }
    sessionStorage.setItem(RELOAD_KEY, String(now));
  } catch {
    console.warn("[ChunkRecovery] Reload skipped without session storage");
    return "blocked";
  }

  recoveryStartedAtByError.set(error, now);
  if (navigateTo) {
    window.location.href = navigateTo;
  } else {
    window.location.reload();
  }
  return "started";
}
