import { describe, expect, it } from "vitest";

import { parseCheckpointQuery } from "./analysisRoute";

describe("parseCheckpointQuery", () => {
  it("accepts positive safe integer checkpoint IDs", () => {
    expect(parseCheckpointQuery({ query: { checkpoint: "42" } })).toBe(42);
  });

  it.each([
    "12garbage",
    "1.5",
    "0",
    "-1",
    "1e2",
    " 42 ",
    "9007199254740992",
  ])(
    "rejects malformed checkpoint value %s",
    (checkpoint) => {
      expect(parseCheckpointQuery({ query: { checkpoint } })).toBeUndefined();
    }
  );

  it("rejects duplicate checkpoint parameters", () => {
    expect(
      parseCheckpointQuery({ query: { checkpoint: ["41", "42"] } })
    ).toBeUndefined();
  });
});
