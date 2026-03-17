import { describe, expect, it, vi } from "vitest";

import { createOfflineNotificationController } from "./offlineNotification";

function createMockEffects() {
  let timerCallback: (() => void) | null = null;
  const cancelTimer = vi.fn(() => {
    timerCallback = null;
  });

  const effects = {
    showOffline: vi.fn(),
    dismissOffline: vi.fn(),
    showRetrying: vi.fn(),
    dismissRetrying: vi.fn(),
    showConnected: vi.fn(),
    triggerForceReconnect: vi.fn(),
    scheduleTimer: vi.fn((_callback, _delayMs) => {
      timerCallback = _callback;
      return cancelTimer;
    }),
  };

  return {
    effects,
    fireTimer: () => {
      const cb = timerCallback;
      timerCallback = null;
      cb?.();
    },
    cancelTimer,
    hasTimer: () => timerCallback !== null,
  };
}

describe("createOfflineNotificationController", () => {
  it("starts in idle state", () => {
    const { effects } = createMockEffects();
    const controller = createOfflineNotificationController(effects);
    expect(controller.state).toBe("idle");
  });

  describe("idle → showing", () => {
    it("transitions to showing and calls showOffline on wentOffline", () => {
      const { effects } = createMockEffects();
      const controller = createOfflineNotificationController(effects);

      controller.onWentOffline();

      expect(controller.state).toBe("showing");
      expect(effects.showOffline).toHaveBeenCalledTimes(1);
    });
  });

  describe("showing → idle", () => {
    it("transitions to idle, dismisses offline, and shows connected on wentOnline", () => {
      const { effects } = createMockEffects();
      const controller = createOfflineNotificationController(effects);
      controller.onWentOffline();

      controller.onWentOnline();

      expect(controller.state).toBe("idle");
      expect(effects.dismissOffline).toHaveBeenCalledTimes(1);
      expect(effects.showConnected).toHaveBeenCalledTimes(1);
    });
  });

  describe("showing → retrying", () => {
    it("transitions to retrying on retry click", () => {
      const { effects } = createMockEffects();
      const controller = createOfflineNotificationController(effects);
      controller.onWentOffline();

      controller.onRetryClicked();

      expect(controller.state).toBe("retrying");
      expect(effects.triggerForceReconnect).toHaveBeenCalledTimes(1);
      expect(effects.showRetrying).toHaveBeenCalledTimes(1);
      expect(effects.scheduleTimer).toHaveBeenCalledTimes(1);
      expect(effects.scheduleTimer).toHaveBeenCalledWith(
        expect.any(Function),
        3000,
      );
    });

    it("does not call dismissOffline (Quasar auto-dismisses on action click)", () => {
      const { effects } = createMockEffects();
      const controller = createOfflineNotificationController(effects);
      controller.onWentOffline();

      controller.onRetryClicked();

      expect(effects.dismissOffline).not.toHaveBeenCalled();
    });
  });

  describe("retrying → showing (reshow timer)", () => {
    it("transitions back to showing when timer fires", () => {
      const { effects, fireTimer } = createMockEffects();
      const controller = createOfflineNotificationController(effects);
      controller.onWentOffline();
      controller.onRetryClicked();
      effects.showOffline.mockClear();

      fireTimer();

      expect(controller.state).toBe("showing");
      expect(effects.dismissRetrying).toHaveBeenCalledTimes(1);
      expect(effects.showOffline).toHaveBeenCalledTimes(1);
    });
  });

  describe("retrying → idle", () => {
    it("transitions to idle, cancels timer, dismisses retrying on wentOnline", () => {
      const { effects, cancelTimer, hasTimer } = createMockEffects();
      const controller = createOfflineNotificationController(effects);
      controller.onWentOffline();
      controller.onRetryClicked();

      controller.onWentOnline();

      expect(controller.state).toBe("idle");
      expect(cancelTimer).toHaveBeenCalledTimes(1);
      expect(hasTimer()).toBe(false);
      expect(effects.dismissRetrying).toHaveBeenCalledTimes(1);
      expect(effects.showConnected).toHaveBeenCalledTimes(1);
    });

    it("timer fire after cancel is a no-op", () => {
      const { effects, fireTimer } = createMockEffects();
      const controller = createOfflineNotificationController(effects);
      controller.onWentOffline();
      controller.onRetryClicked();
      controller.onWentOnline();
      effects.showOffline.mockClear();
      effects.dismissRetrying.mockClear();

      fireTimer(); // should be null, no-op

      expect(controller.state).toBe("idle");
      expect(effects.showOffline).not.toHaveBeenCalled();
      expect(effects.dismissRetrying).not.toHaveBeenCalled();
    });
  });

  describe("no-op transitions", () => {
    it("onWentOnline while idle does nothing", () => {
      const { effects } = createMockEffects();
      const controller = createOfflineNotificationController(effects);

      controller.onWentOnline();

      expect(controller.state).toBe("idle");
      expect(effects.dismissOffline).not.toHaveBeenCalled();
      expect(effects.showConnected).not.toHaveBeenCalled();
    });

    it("onWentOffline while showing does nothing", () => {
      const { effects } = createMockEffects();
      const controller = createOfflineNotificationController(effects);
      controller.onWentOffline();
      effects.showOffline.mockClear();

      controller.onWentOffline();

      expect(controller.state).toBe("showing");
      expect(effects.showOffline).not.toHaveBeenCalled();
    });

    it("onWentOffline while retrying does nothing", () => {
      const { effects } = createMockEffects();
      const controller = createOfflineNotificationController(effects);
      controller.onWentOffline();
      controller.onRetryClicked();
      effects.showOffline.mockClear();

      controller.onWentOffline();

      expect(controller.state).toBe("retrying");
      expect(effects.showOffline).not.toHaveBeenCalled();
    });

    it("onRetryClicked while retrying does nothing", () => {
      const { effects } = createMockEffects();
      const controller = createOfflineNotificationController(effects);
      controller.onWentOffline();
      controller.onRetryClicked();
      effects.triggerForceReconnect.mockClear();

      controller.onRetryClicked();

      expect(controller.state).toBe("retrying");
      expect(effects.triggerForceReconnect).not.toHaveBeenCalled();
    });

    it("onRetryClicked while idle does nothing", () => {
      const { effects } = createMockEffects();
      const controller = createOfflineNotificationController(effects);

      controller.onRetryClicked();

      expect(controller.state).toBe("idle");
      expect(effects.triggerForceReconnect).not.toHaveBeenCalled();
    });
  });

  describe("rapid toggle", () => {
    it("offline → online → offline cycles correctly", () => {
      const { effects } = createMockEffects();
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

  describe("destroy", () => {
    it("cleans up from showing state", () => {
      const { effects } = createMockEffects();
      const controller = createOfflineNotificationController(effects);
      controller.onWentOffline();

      controller.destroy();

      expect(controller.state).toBe("idle");
      expect(effects.dismissOffline).toHaveBeenCalledTimes(1);
    });

    it("cleans up from retrying state and cancels timer", () => {
      const { effects, cancelTimer } = createMockEffects();
      const controller = createOfflineNotificationController(effects);
      controller.onWentOffline();
      controller.onRetryClicked();

      controller.destroy();

      expect(controller.state).toBe("idle");
      expect(cancelTimer).toHaveBeenCalledTimes(1);
      expect(effects.dismissRetrying).toHaveBeenCalledTimes(1);
    });

    it("is a no-op from idle state", () => {
      const { effects } = createMockEffects();
      const controller = createOfflineNotificationController(effects);

      controller.destroy();

      expect(controller.state).toBe("idle");
      expect(effects.dismissOffline).not.toHaveBeenCalled();
      expect(effects.dismissRetrying).not.toHaveBeenCalled();
    });
  });
});
