export type OfflineNotificationState = "idle" | "showing";

export interface OfflineNotificationEffects {
  showOffline: () => void;
  dismissOffline: () => void;
  showConnected: () => void;
}

export interface OfflineNotificationController {
  onWentOffline: () => void;
  onWentOnline: () => void;
  readonly state: OfflineNotificationState;
  destroy: () => void;
}

export function createOfflineNotificationController(
  effects: OfflineNotificationEffects,
): OfflineNotificationController {
  let state: OfflineNotificationState = "idle";

  function onWentOffline() {
    if (state !== "idle") return;
    console.log("[OfflineNotification] idle → showing");
    effects.showOffline();
    state = "showing";
  }

  function onWentOnline() {
    if (state === "idle") return;
    console.log("[OfflineNotification] showing → idle");
    effects.dismissOffline();
    state = "idle";
    effects.showConnected();
  }

  function destroy() {
    if (state === "showing") {
      effects.dismissOffline();
    }
    state = "idle";
  }

  return {
    onWentOffline,
    onWentOnline,
    get state() {
      return state;
    },
    destroy,
  };
}
