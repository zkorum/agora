const RESHOW_DELAY_MS = 3000;

export type OfflineNotificationState = "idle" | "showing" | "retrying";

export interface OfflineNotificationEffects {
  showOffline: () => void;
  dismissOffline: () => void;
  showRetrying: () => void;
  dismissRetrying: () => void;
  showConnected: () => void;
  triggerForceReconnect: () => void;
  scheduleTimer: (callback: () => void, delayMs: number) => () => void;
}

export interface OfflineNotificationController {
  onWentOffline: () => void;
  onWentOnline: () => void;
  onRetryClicked: () => void;
  readonly state: OfflineNotificationState;
  destroy: () => void;
}

export function createOfflineNotificationController(
  effects: OfflineNotificationEffects,
): OfflineNotificationController {
  let state: OfflineNotificationState = "idle";
  let cancelReshowTimer: (() => void) | null = null;

  function cancelTimer() {
    if (cancelReshowTimer) {
      cancelReshowTimer();
      cancelReshowTimer = null;
    }
  }

  function onWentOffline() {
    if (state !== "idle") return;
    console.log("[OfflineNotification] idle → showing");
    effects.showOffline();
    state = "showing";
  }

  function onWentOnline() {
    if (state === "idle") return;
    console.log("[OfflineNotification]", state, "→ idle");
    cancelTimer();
    if (state === "showing") {
      effects.dismissOffline();
    } else if (state === "retrying") {
      effects.dismissRetrying();
    }
    state = "idle";
    effects.showConnected();
  }

  function onRetryClicked() {
    if (state !== "showing") return;
    console.log("[OfflineNotification] showing → retrying");
    // Don't call dismissOffline — Quasar auto-dismisses on action click
    effects.triggerForceReconnect();
    effects.showRetrying();
    state = "retrying";

    cancelReshowTimer = effects.scheduleTimer(() => {
      cancelReshowTimer = null;
      if (state === "retrying") {
        console.log("[OfflineNotification] retrying → showing (reshow timer)");
        effects.dismissRetrying();
        effects.showOffline();
        state = "showing";
      }
    }, RESHOW_DELAY_MS);
  }

  function destroy() {
    cancelTimer();
    if (state === "showing") {
      effects.dismissOffline();
    } else if (state === "retrying") {
      effects.dismissRetrying();
    }
    state = "idle";
  }

  return {
    onWentOffline,
    onWentOnline,
    onRetryClicked,
    get state() {
      return state;
    },
    destroy,
  };
}
