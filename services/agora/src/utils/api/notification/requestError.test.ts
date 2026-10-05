import { AxiosError, AxiosHeaders } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";

import { runNotificationRefreshInBackground } from "./requestError";

function createHttpError(status: number): AxiosError {
  return new AxiosError(
    `Request failed with status code ${status}`,
    status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
    undefined,
    undefined,
    {
      data: undefined,
      status,
      statusText: "",
      headers: new AxiosHeaders(),
      config: { headers: new AxiosHeaders() },
    }
  );
}

describe("notification request error handling", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs and handles transient background request failures", async () => {
    const refreshError = new AxiosError(
      "Network Error",
      AxiosError.ERR_NETWORK
    );
    const refreshNotifications = vi.fn(() => Promise.reject(refreshError));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(
      runNotificationRefreshInBackground(refreshNotifications)
    ).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      "Background notification refresh failed",
      expect.objectContaining({
        name: "AxiosError",
        message: "Network Error",
        axiosCode: AxiosError.ERR_NETWORK,
      })
    );
  });

  it("handles a 401 after the auth interceptor refreshes state", async () => {
    const refreshError = createHttpError(401);
    const refreshNotifications = vi.fn(() => Promise.reject(refreshError));
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(
      runNotificationRefreshInBackground(refreshNotifications)
    ).resolves.toBeUndefined();
  });

  it.each([502, 503, 504])(
    "handles a transient gateway response (%i) during background refresh",
    async (status) => {
      const refreshError = createHttpError(status);
      const refreshNotifications = vi.fn(() => Promise.reject(refreshError));
      const warn = vi
        .spyOn(console, "warn")
        .mockImplementation(() => undefined);

      await expect(
        runNotificationRefreshInBackground(refreshNotifications)
      ).resolves.toBeUndefined();
      expect(warn).toHaveBeenCalledWith(
        "Background notification refresh failed",
        expect.objectContaining({ httpStatus: status })
      );
    }
  );

  it("rethrows unexpected server responses", async () => {
    const refreshError = createHttpError(500);
    const refreshNotifications = vi.fn(() => Promise.reject(refreshError));

    await expect(
      runNotificationRefreshInBackground(refreshNotifications)
    ).rejects.toBe(refreshError);
  });

  it("rethrows non-request failures", async () => {
    const refreshError = new Error("Failed to transform notifications");
    const refreshNotifications = vi.fn(() => Promise.reject(refreshError));

    await expect(
      runNotificationRefreshInBackground(refreshNotifications)
    ).rejects.toBe(refreshError);
  });
});
