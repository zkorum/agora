import type { PolisClusters, PolisKey } from "src/shared/types/zod";
import { describe, expect, it } from "vitest";

import { shouldHideGroupAnalysis } from "./opinion";

function createCluster({
  key,
  numUsers,
}: {
  key: PolisKey;
  numUsers: number;
}): NonNullable<PolisClusters[PolisKey]> {
  return {
    key,
    numUsers,
    isUserInCluster: false,
    representative: [],
  };
}

describe("shouldHideGroupAnalysis", () => {
  it("hides exactly two groups when one group has one participant", () => {
    const clusters = {
      "0": createCluster({ key: "0", numUsers: 12 }),
      "1": createCluster({ key: "1", numUsers: 1 }),
    } satisfies Partial<PolisClusters>;

    expect(shouldHideGroupAnalysis(clusters)).toBe(true);
  });

  it("does not hide two groups when both groups have multiple participants", () => {
    const clusters = {
      "0": createCluster({ key: "0", numUsers: 12 }),
      "1": createCluster({ key: "1", numUsers: 2 }),
    } satisfies Partial<PolisClusters>;

    expect(shouldHideGroupAnalysis(clusters)).toBe(false);
  });

  it("does not hide one group", () => {
    const clusters = {
      "0": createCluster({ key: "0", numUsers: 1 }),
    } satisfies Partial<PolisClusters>;

    expect(shouldHideGroupAnalysis(clusters)).toBe(false);
  });

  it("does not hide three groups", () => {
    const clusters = {
      "0": createCluster({ key: "0", numUsers: 12 }),
      "1": createCluster({ key: "1", numUsers: 1 }),
      "2": createCluster({ key: "2", numUsers: 8 }),
    } satisfies Partial<PolisClusters>;

    expect(shouldHideGroupAnalysis(clusters)).toBe(false);
  });
});
