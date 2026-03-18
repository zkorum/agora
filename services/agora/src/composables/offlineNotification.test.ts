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
