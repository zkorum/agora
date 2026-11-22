import { AxiosError, AxiosHeaders } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useBackendAccountApi } from "./account";

const mocks = vi.hoisted(() => ({
  remove: vi.fn<() => Promise<{ data: unknown }>>(),
}));
vi.mock("src/api", () => ({
  DefaultApiAxiosParamCreator: () => ({
    apiV1UserDeletePost: () => ({ url: "/api/v1/user/delete", options: {} }),
  }),
  DefaultApiFactory: () => ({ apiV1UserDeletePost: mocks.remove }),
}));
vi.mock("src/stores/user", () => ({
  useUserStore: () => ({ loadUserProfile: vi.fn() }),
}));
vi.mock("src/composables/ui/useComponentI18n", () => ({
  useComponentI18n: () => ({ t: (key: string) => key }),
}));
vi.mock("../ui/notify", () => ({
  useNotify: () => ({ showNotifyMessage: vi.fn() }),
}));
vi.mock("../crypto/ucan/operation", () => ({
  buildAuthorizationHeader: () => ({ Authorization: "Bearer test" }),
}));
vi.mock("../query/client", () => ({ queryClient: {} }));
vi.mock("./client", () => ({ api: {} }));
vi.mock("./common", () => ({
  useCommonApi: () => ({ buildEncodedUcan: () => Promise.resolve("test") }),
}));

function conflict(data: unknown) {
  return new AxiosError("Conflict", "ERR_BAD_REQUEST", undefined, undefined, {
    data,
    status: 409,
    statusText: "Conflict",
    headers: {},
    config: { headers: new AxiosHeaders() },
  });
}

describe("account deletion API response", () => {
  beforeEach(() => {
    mocks.remove.mockReset();
  });
  it("parses an accepted deletion", async () => {
    mocks.remove.mockResolvedValue({ data: { success: true } });
    expect(await useBackendAccountApi().deleteUserAccount()).toEqual({
      success: true,
    });
  });
  it("turns the typed conflict into a refusal result", async () => {
    const result = { success: false, reason: "last_active_organization_admin" };
    mocks.remove.mockRejectedValue(conflict(result));
    expect(await useBackendAccountApi().deleteUserAccount()).toEqual(result);
  });
  it("does not mistake an unrelated conflict for an organization refusal", async () => {
    const error = conflict({ error: "Conflict", message: "Other failure" });
    mocks.remove.mockRejectedValue(error);
    await expect(useBackendAccountApi().deleteUserAccount()).rejects.toBe(
      error
    );
  });
  it("does not accept an empty or malformed successful response", async () => {
    mocks.remove.mockResolvedValue({ data: "" });
    await expect(useBackendAccountApi().deleteUserAccount()).rejects.toThrow();
  });
});
