import { describe, expect, it, vi } from "vitest";

import {
  createDynamicImportRecovery,
  isDynamicImportError,
} from "./dynamic-import-error";

describe("dynamic import error detection", () => {
  it.each([
    "Failed to fetch dynamically imported module: /_app/immutable/nodes/2.js",
    "error loading dynamically imported module: /_app/immutable/nodes/2.js",
    "Importing a module script failed.",
  ])("recognizes %s", (message) => {
    expect(isDynamicImportError(new TypeError(message))).toBe(true);
  });

  it.each([
    new TypeError("Request failed"),
    new TypeError("Application failed while Loading chunk metadata"),
    new Error("Failed to fetch dynamically imported module: /page.js"),
    "Failed to fetch dynamically imported module: /page.js",
  ])("rejects unrelated or non-native errors", (error) => {
    expect(isDynamicImportError(error)).toBe(false);
  });
});

function createEnvironment() {
  return {
    isDevelopment: false,
    isOnline: vi.fn(() => true),
    now: vi.fn(() => 20_000),
    readLastReload: vi.fn<() => string | null>(() => null),
    writeLastReload: vi.fn<(timestamp: string) => void>(),
    reload: vi.fn<() => void>(),
    warn: vi.fn<(message: string) => void>(),
  };
}

const dynamicImportError = new TypeError(
  "Failed to fetch dynamically imported module: /_app/immutable/nodes/2.js",
);

describe("dynamic import error recovery", () => {
  it("stores a cooldown marker and reloads", () => {
    const environment = createEnvironment();
    const recover = createDynamicImportRecovery(environment);

    expect(recover(dynamicImportError)).toBe(true);
    expect(environment.writeLastReload).toHaveBeenCalledWith("20000");
    expect(environment.reload).toHaveBeenCalledOnce();
  });

  it("consumes duplicate errors while the document is reloading", () => {
    const environment = createEnvironment();
    const recover = createDynamicImportRecovery(environment);

    expect(recover(dynamicImportError)).toBe(true);
    environment.isOnline.mockReturnValue(false);
    expect(recover(dynamicImportError)).toBe(true);
    expect(environment.reload).toHaveBeenCalledOnce();
  });

  it("does not recover while offline", () => {
    const environment = createEnvironment();
    environment.isOnline.mockReturnValue(false);
    const recover = createDynamicImportRecovery(environment);

    expect(recover(dynamicImportError)).toBe(false);
    expect(environment.readLastReload).not.toHaveBeenCalled();
    expect(environment.reload).not.toHaveBeenCalled();
  });

  it("does not recover during the reload cooldown", () => {
    const environment = createEnvironment();
    environment.readLastReload.mockReturnValue("15000");
    const recover = createDynamicImportRecovery(environment);

    expect(recover(dynamicImportError)).toBe(false);
    expect(environment.writeLastReload).not.toHaveBeenCalled();
    expect(environment.reload).not.toHaveBeenCalled();
  });

  it.each(["read", "write"])(
    "does not recover when session storage %s fails",
    (operation) => {
      const environment = createEnvironment();
      if (operation === "read") {
        environment.readLastReload.mockImplementation(() => {
          throw new DOMException("Storage disabled", "SecurityError");
        });
      } else {
        environment.writeLastReload.mockImplementation(() => {
          throw new DOMException("Storage disabled", "SecurityError");
        });
      }
      const recover = createDynamicImportRecovery(environment);

      expect(recover(dynamicImportError)).toBe(false);
      expect(environment.reload).not.toHaveBeenCalled();
    },
  );

  it("does not recover in development", () => {
    const environment = createEnvironment();
    environment.isDevelopment = true;
    const recover = createDynamicImportRecovery(environment);

    expect(recover(dynamicImportError)).toBe(false);
    expect(environment.isOnline).not.toHaveBeenCalled();
    expect(environment.reload).not.toHaveBeenCalled();
  });

  it("does not throw or consume the error when reload fails", () => {
    const environment = createEnvironment();
    environment.reload.mockImplementation(() => {
      throw new DOMException("Reload blocked", "SecurityError");
    });
    const recover = createDynamicImportRecovery(environment);

    expect(recover(dynamicImportError)).toBe(false);
  });

  it("does not intercept unrelated errors", () => {
    const environment = createEnvironment();
    const recover = createDynamicImportRecovery(environment);

    expect(recover(new Error("Request failed"))).toBe(false);
    expect(environment.isOnline).not.toHaveBeenCalled();
  });
});
