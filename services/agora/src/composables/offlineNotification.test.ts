import { describe, expect, it, vi } from "vitest";

import { createOfflineNotificationController } from "./offlineNotification";

function createMockEffects() {
  return {
    showOffline: vi.fn(),
    dismissOffline: vi.fn(),
    showConnected: vi.fn(),
  };
}

describe("createOfflineNotificationController", () => {
  it("starts in idle state", () => {
    const effects = createMockEffects();
    const controller = createOfflineNotificationController(effects);
    expect(controller.state).toBe("idle");
  });

  describe("idle → showing", () => {
    it("transitions to showing and calls showOffline on wentOffline", () => {
      const effects = createMockEffects();
      const controller = createOfflineNotificationController(effects);

      controller.onWentOffline();

      expect(controller.state).toBe("showing");
      expect(effects.showOffline).toHaveBeenCalledTimes(1);
    });
  });

  describe("showing → idle", () => {
    it("transitions to idle, dismisses offline, and shows connected on wentOnline", () => {
      const effects = createMockEffects();
      const controller = createOfflineNotificationController(effects);
      controller.onWentOffline();

      controller.onWentOnline();

      expect(controller.state).toBe("idle");
      expect(effects.dismissOffline).toHaveBeenCalledTimes(1);
      expect(effects.showConnected).toHaveBeenCalledTimes(1);
    });
  });

  describe("no-op transitions", () => {
    it("onWentOnline while idle does nothing", () => {
      const effects = createMockEffects();
      const controller = createOfflineNotificationController(effects);

      controller.onWentOnline();

      expect(controller.state).toBe("idle");
      expect(effects.dismissOffline).not.toHaveBeenCalled();
      expect(effects.showConnected).not.toHaveBeenCalled();
    });

    it("onWentOffline while showing does nothing", () => {
      const effects = createMockEffects();
      const controller = createOfflineNotificationController(effects);
      controller.onWentOffline();
      effects.showOffline.mockClear();

      controller.onWentOffline();

      expect(controller.state).toBe("showing");
      expect(effects.showOffline).not.toHaveBeenCalled();
    });
  });

  describe("rapid toggle", () => {
    it("offline → online → offline cycles correctly", () => {
      const effects = createMockEffects();
      const controller = createOfflineNotificationController(effects);

      controller.onWentOffline();
      expect(controller.state).toBe("showing");
      expect(effects.showOffline).toHaveBeenCalledTimes(1);

      controller.onWentOnline();
      expect(controller.state).toBe("idle");
      expect(effects.dismissOffline).toHaveBeenCalledTimes(1);
      expect(effects.showConnected).toHaveBeenCalledTimes(1);

      controller.onWentOffline();
      expect(controller.state).toBe("showing");
      expect(effects.showOffline).toHaveBeenCalledTimes(2);
    });
  });

  describe("onDismiss race condition (App.vue wiring pattern)", () => {
    it("stale onDismiss from notification 1 does not clobber notification 2 dismiss reference", () => {
      // Simulates the guarded onDismiss pattern used in App.vue
      let dismissOfflineFn: (() => void) | null = null;
      const dismissed: string[] = [];
      let capturedOnDismiss1: (() => void) | null = null;
      let callCount = 0;

      const effects = {
        showOffline: vi.fn(() => {
          callCount++;
          const callId = callCount;
          let thisDismiss: (() => void) | null = null;

          // Simulate showPersistentNotifyMessage: returns dismiss fn, accepts onDismiss callback
          const onDismiss = () => {
            if (dismissOfflineFn === thisDismiss) {
              dismissOfflineFn = null;
            }
          };

          thisDismiss = () => {
            dismissed.push(`notif${String(callId)}`);
            onDismiss();
          };

          if (callId === 1) {
            capturedOnDismiss1 = onDismiss;
          }

          dismissOfflineFn = thisDismiss;
        }),
        dismissOffline: vi.fn(() => {
          dismissOfflineFn?.();
          dismissOfflineFn = null;
        }),
        showConnected: vi.fn(),
      };

      const controller = createOfflineNotificationController(effects);

      // Offline -> notification 1
      controller.onWentOffline();
      expect(dismissOfflineFn).not.toBeNull();

      // Online -> dismiss notification 1
      controller.onWentOnline();
      expect(dismissed).toContain("notif1");

      // Offline again -> notification 2
      controller.onWentOffline();
      expect(dismissOfflineFn).not.toBeNull();

      // Simulate stale onDismiss from notification 1 firing late (e.g. after animation)
      capturedOnDismiss1!();

      // dismissOfflineFn should NOT be nullified (it belongs to notification 2)
      expect(dismissOfflineFn).not.toBeNull();

      // Online -> should still dismiss notification 2
      controller.onWentOnline();
      expect(dismissed).toContain("notif2");
    });

    it("onDismiss from current notification correctly clears the reference", () => {
      let dismissOfflineFn: (() => void) | null = null;
      let capturedOnDismiss: (() => void) | null = null;

      const effects = {
        showOffline: vi.fn(() => {
          let thisDismiss: (() => void) | null = null;
          const onDismiss = () => {
            if (dismissOfflineFn === thisDismiss) {
              dismissOfflineFn = null;
            }
          };
          thisDismiss = () => { onDismiss(); };
          capturedOnDismiss = onDismiss;
          dismissOfflineFn = thisDismiss;
        }),
        dismissOffline: vi.fn(() => {
          dismissOfflineFn?.();
          dismissOfflineFn = null;
        }),
        showConnected: vi.fn(),
      };

      const controller = createOfflineNotificationController(effects);

      // Offline -> notification shown
      controller.onWentOffline();
      expect(dismissOfflineFn).not.toBeNull();

      // User manually dismisses (clicks X) -> onDismiss fires for current notification
      capturedOnDismiss!();

      // Should correctly clear the reference since it's the current notification
      expect(dismissOfflineFn).toBeNull();

      // Online -> dismissOffline is a no-op (already null), but state resets
      controller.onWentOnline();
      expect(effects.showConnected).toHaveBeenCalledTimes(1);
    });
  });

  describe("destroy", () => {
    it("cleans up from showing state", () => {
      const effects = createMockEffects();
      const controller = createOfflineNotificationController(effects);
      controller.onWentOffline();

      controller.destroy();

      expect(controller.state).toBe("idle");
      expect(effects.dismissOffline).toHaveBeenCalledTimes(1);
    });

    it("is a no-op from idle state", () => {
      const effects = createMockEffects();
      const controller = createOfflineNotificationController(effects);

      controller.destroy();

      expect(controller.state).toBe("idle");
      expect(effects.dismissOffline).not.toHaveBeenCalled();
    });
  });
});
