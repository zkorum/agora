const DYNAMIC_IMPORT_ERROR_PATTERNS = [
  /^Failed to fetch dynamically imported module(?:: .+)?$/,
  /^error loading dynamically imported module(?:: .+)?$/i,
  /^Importing a module script failed\.?$/,
] as const;

const RELOAD_KEY = "landing-dynamic-import-reload";
const RELOAD_COOLDOWN_MS = 10_000;

interface DynamicImportRecoveryEnvironment {
  isDevelopment: boolean;
  isOnline: () => boolean;
  now: () => number;
  readLastReload: () => string | null;
  writeLastReload: (timestamp: string) => void;
  reload: () => void;
  warn: (message: string) => void;
}

export function isDynamicImportError(error: unknown): boolean {
  return (
    error instanceof TypeError &&
    DYNAMIC_IMPORT_ERROR_PATTERNS.some((pattern) => pattern.test(error.message))
  );
}

function warnSafely({
  warn,
  message,
}: {
  warn: (message: string) => void;
  message: string;
}): void {
  try {
    warn(message);
  } catch {
    // Diagnostics must not break SvelteKit's error handler.
  }
}

export function createDynamicImportRecovery({
  isDevelopment,
  isOnline,
  now,
  readLastReload,
  writeLastReload,
  reload,
  warn,
}: DynamicImportRecoveryEnvironment): (error: unknown) => boolean {
  let isReloadPending = false;

  return (error: unknown): boolean => {
    if (!isDynamicImportError(error)) return false;

    try {
      if (isDevelopment) {
        warnSafely({
          warn,
          message: "[DynamicImportRecovery] Suppressed reload in dev mode",
        });
        return false;
      }
      if (isReloadPending) return true;
      if (!isOnline()) {
        warnSafely({
          warn,
          message: "[DynamicImportRecovery] Reload skipped while offline",
        });
        return false;
      }

      const timestamp = now();
      const lastReload = readLastReload();
      if (lastReload !== null) {
        const elapsedSinceReload = timestamp - Number(lastReload);
        if (
          elapsedSinceReload >= 0 &&
          elapsedSinceReload < RELOAD_COOLDOWN_MS
        ) {
          warnSafely({
            warn,
            message: "[DynamicImportRecovery] Reload skipped during cooldown",
          });
          return false;
        }
      }
      writeLastReload(String(timestamp));

      isReloadPending = true;
      reload();
      return true;
    } catch {
      isReloadPending = false;
      warnSafely({
        warn,
        message: "[DynamicImportRecovery] Reload attempt failed",
      });
      return false;
    }
  };
}

export const recoverFromDynamicImportError = createDynamicImportRecovery({
  isDevelopment: import.meta.env.DEV,
  isOnline: () => navigator.onLine,
  now: () => Date.now(),
  readLastReload: () => sessionStorage.getItem(RELOAD_KEY),
  writeLastReload: (timestamp) => {
    sessionStorage.setItem(RELOAD_KEY, timestamp);
  },
  reload: () => {
    window.location.reload();
  },
  warn: (message) => {
    console.warn(message);
  },
});
