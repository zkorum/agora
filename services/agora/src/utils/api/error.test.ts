import { AxiosError } from "axios";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { classifyApiError } from "./error";

describe("API error boundaries", () => {
  it("preserves actual transport codes and normalized errors", () => {
    const error = classifyApiError(new AxiosError("offline", "ERR_NETWORK"));
    expect(error).toMatchObject({ kind: "transport", code: "ERR_NETWORK" });
    expect(classifyApiError(error)).toEqual(error);
  });

  it("keeps schema failures distinct from timeouts", () => {
    const result = z.string().safeParse(42);
    if (result.success) throw new Error("Expected invalid external input");
    expect(classifyApiError(result.error)).toMatchObject({
      kind: "contract",
      code: undefined,
      name: "ZodError",
    });
  });

  it.each([null, undefined, "failure", new Error("failure")])(
    "handles arbitrary thrown values without inventing network errors: %s",
    (error) => {
      expect(classifyApiError(error)).toMatchObject({
        kind: "unexpected",
        code: undefined,
      });
    }
  );
});
