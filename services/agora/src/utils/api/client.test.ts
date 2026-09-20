import type { AxiosResponse } from "axios";
import { describe, expect, it } from "vitest";

import { api } from "./client";

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
