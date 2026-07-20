import { beforeEach, describe, expect, it, vi } from "vitest";

const localforageMocks = vi.hoisted(() => ({
  clear: vi.fn(() => Promise.resolve()),
  createInstance: vi.fn(),
  dropInstance: vi.fn(() => Promise.resolve()),
}));

const keyStoreMocks = vi.hoisted(() => ({
  init: vi.fn(() => Promise.resolve({})),
}));

vi.mock("localforage", () => ({
  default: {
    createInstance: localforageMocks.createInstance,
  },
}));

vi.mock("@zkorum/keystore-idb/rsa/index.js", () => ({
  default: {},
  RSAKeyStore: {
    init: keyStoreMocks.init,
  },
}));

import { implementation } from "./browser";

describe("browser crypto implementation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localforageMocks.createInstance.mockReturnValue({
      clear: localforageMocks.clear,
      dropInstance: localforageMocks.dropInstance,
    });
  });

  it("clears records without dropping the IndexedDB database", async () => {
    const cryptoStore = await implementation({ storeName: "test-store" });

    await cryptoStore.keystore.clearStore();

    expect(localforageMocks.clear).toHaveBeenCalledOnce();
    expect(localforageMocks.dropInstance).not.toHaveBeenCalled();
  });
});
