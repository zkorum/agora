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

  it("uses browser-family detection when no supported preference is saved", async () => {
    localStorage.setItem("displayLanguage", "not-a-language");
    const options = new Intl.DateTimeFormat().resolvedOptions();
    vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
      ...options,
      locale: "fr",
    });
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Chrome/142.0.0.0");
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["en-US"]);
    expect(
      (await inspectRequestHeaders(undefined)).get("Accept-Language")
    ).toBe("fr");
  });

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
