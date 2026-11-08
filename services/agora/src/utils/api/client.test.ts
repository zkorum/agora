import type { AxiosResponse } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api, setApiDisplayLanguage } from "./client";

async function inspectRequestHeaders(
  data: unknown
): Promise<AxiosResponse["config"]["headers"]> {
  const response = await api.post("/test", data, {
    adapter: (config) =>
      Promise.resolve({
        config,
        data: undefined,
        headers: {},
        status: 200,
        statusText: "OK",
      }),
  });
  return response.config.headers;
}

afterEach(() => {
  delete api.defaults.headers.common["Accept-Language"];
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("API request language", () => {
  it("uses a normalized saved preference before the store initializes", async () => {
    localStorage.setItem("displayLanguage", "fr-FR");
    const headers = await inspectRequestHeaders(undefined);
    expect(headers.get("Accept-Language")).toBe("fr");
  });

  it.each([
    { userAgent: "Chrome/142.0.0.0", expectedLanguage: "en" },
    { userAgent: "Firefox/145.0", expectedLanguage: "en" },
    {
      userAgent: "Mozilla/5.0 (Linux; Android 15) Chrome/142.0.0.0",
      expectedLanguage: "fr",
    },
    {
      userAgent: "Mozilla/5.0 (Android 15; Mobile) Firefox/145.0",
      expectedLanguage: "fr",
    },
    {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0) CriOS/142.0.0.0",
      expectedLanguage: "en",
    },
  ])(
    "uses the platform language policy without a supported saved preference: $userAgent",
    async ({ userAgent, expectedLanguage }) => {
      localStorage.setItem("displayLanguage", "not-a-language");
      const options = new Intl.DateTimeFormat().resolvedOptions();
      vi.spyOn(
        Intl.DateTimeFormat.prototype,
        "resolvedOptions"
      ).mockReturnValue({
        ...options,
        locale: "fr",
      });
      vi.spyOn(navigator, "userAgent", "get").mockReturnValue(userAgent);
      vi.spyOn(navigator, "languages", "get").mockReturnValue(["en-US"]);
      expect(
        (await inspectRequestHeaders(undefined)).get("Accept-Language")
      ).toBe(expectedLanguage);
    }
  );

  it("snapshots the effective language at request creation, not after a later change", async () => {
    setApiDisplayLanguage("fr");
    const pending = inspectRequestHeaders(undefined);
    setApiDisplayLanguage("es");
    expect((await pending).get("Accept-Language")).toBe("fr");
    expect(
      (await inspectRequestHeaders(undefined)).get("Accept-Language")
    ).toBe("es");
  });

  it("does not overwrite an explicit request language with defaults or local storage", async () => {
    localStorage.setItem("displayLanguage", "en");
    setApiDisplayLanguage("es");
    const response = await api.post("/test", undefined, {
      headers: { "Accept-Language": "fr" },
      adapter: (config) =>
        Promise.resolve({
          config,
          data: undefined,
          headers: {},
          status: 200,
          statusText: "OK",
        }),
    });
    expect(response.config.headers.get("Accept-Language")).toBe("fr");
  });
});

describe("API request content type", () => {
  it("does not apply the JSON fallback to FormData posts", async () => {
    const headers = await inspectRequestHeaders(new FormData());

    expect(headers.getContentType()).not.toBe("application/json");
  });

  it("keeps the JSON fallback for bodyless posts", async () => {
    const headers = await inspectRequestHeaders(undefined);

    expect(headers.getContentType()).toBe("application/json");
  });
});
