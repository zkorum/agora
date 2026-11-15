import { describe, expect, it } from "vitest";

import { canChangeAllocation, getRemainingCredits } from "./qv-allocation.js";

describe("quadratic allocation budget", () => {
  it("leaves the allowance available when nothing is allocated", () => {
    expect(getRemainingCredits({ rows: [], totalCredits: 100 })).toBe(100);
    expect(getRemainingCredits({ rows: [{ votes: 0 }], totalCredits: 0 })).toBe(
      0,
    );
  });

  it("charges squared credits for both support and opposition", () => {
    expect(
      getRemainingCredits({
        rows: [{ votes: 7 }, { votes: 0 }, { votes: -4 }],
        totalCredits: 100,
      }),
    ).toBe(35);
  });

  it("returns credits when an allocation is reduced", () => {
    expect(
      getRemainingCredits({
        rows: [{ votes: 6 }, { votes: 0 }, { votes: -4 }],
        totalCredits: 100,
      }),
    ).toBe(48);
    expect(
      getRemainingCredits({
        rows: [{ votes: 7 }, { votes: 0 }, { votes: -3 }],
        totalCredits: 100,
      }),
    ).toBe(42);
  });

  it("allows the exact next marginal cost, but not overspending", () => {
    expect(
      canChangeAllocation({
        votes: 2,
        direction: "more",
        remainingCredits: 5,
        voteLimit: undefined,
      }),
    ).toBe(true);
    expect(
      canChangeAllocation({
        votes: 2,
        direction: "more",
        remainingCredits: 4,
        voteLimit: undefined,
      }),
    ).toBe(false);
    expect(
      canChangeAllocation({
        votes: -2,
        direction: "fewer",
        remainingCredits: 4,
        voteLimit: undefined,
      }),
    ).toBe(false);
  });

  it("allows undoing support and opposition when all credits are spent", () => {
    expect(
      canChangeAllocation({
        votes: 7,
        direction: "fewer",
        remainingCredits: 0,
        voteLimit: undefined,
      }),
    ).toBe(true);
    expect(
      canChangeAllocation({
        votes: -7,
        direction: "more",
        remainingCredits: 0,
        voteLimit: undefined,
      }),
    ).toBe(true);
    expect(
      canChangeAllocation({
        votes: 0,
        direction: "more",
        remainingCredits: 0,
        voteLimit: undefined,
      }),
    ).toBe(false);
    expect(
      canChangeAllocation({
        votes: 0,
        direction: "fewer",
        remainingCredits: 0,
        voteLimit: undefined,
      }),
    ).toBe(false);
  });

  it("charges one credit when moving away from zero in either direction", () => {
    expect(
      canChangeAllocation({
        votes: 0,
        direction: "more",
        remainingCredits: 1,
        voteLimit: undefined,
      }),
    ).toBe(true);
    expect(
      canChangeAllocation({
        votes: 0,
        direction: "fewer",
        remainingCredits: 1,
        voteLimit: undefined,
      }),
    ).toBe(true);
  });

  it("keeps optional preview limits separate from the credit allowance", () => {
    expect(
      canChangeAllocation({
        votes: 7,
        direction: "more",
        remainingCredits: 51,
        voteLimit: 7,
      }),
    ).toBe(false);
    expect(
      canChangeAllocation({
        votes: -7,
        direction: "fewer",
        remainingCredits: 51,
        voteLimit: 7,
      }),
    ).toBe(false);
    expect(
      canChangeAllocation({
        votes: 7,
        direction: "more",
        remainingCredits: 51,
        voteLimit: undefined,
      }),
    ).toBe(true);
  });

  it.each([
    { votes: 7, direction: "fewer" },
    { votes: -7, direction: "more" },
  ] satisfies { votes: number; direction: "fewer" | "more" }[])(
    "allows refunds when a changed limit or allowance is below the existing $votes votes",
    ({ votes, direction }) => {
      expect(
        canChangeAllocation({
          votes,
          direction,
          remainingCredits: -10,
          voteLimit: 3,
        }),
      ).toBe(true);
    },
  );
});
