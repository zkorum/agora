import { describe, expect, it } from "vitest";

import { getLiveAnalysisClosedTransitionAction } from "./liveAnalysisClosedTransition";

type TransitionParams = Parameters<
  typeof getLiveAnalysisClosedTransitionAction
>[0];
type TransitionAction = ReturnType<typeof getLiveAnalysisClosedTransitionAction>;
type TransitionTestCase = TransitionParams & {
  name: string;
  expected: TransitionAction;
};

describe("live analysis closed transition", () => {
  const cases: TransitionTestCase[] = [
    {
      name: "refreshes latest analysis when live closes",
      isClosed: true,
      wasClosed: false,
      isLiveAnalysis: true,
      expected: "refresh-latest-analysis",
    },
    {
      name: "keeps old checkpoint route and refreshes checkpoints on close",
      isClosed: true,
      wasClosed: false,
      isLiveAnalysis: false,
      expected: "refresh-checkpoints",
    },
    {
      name: "resumes live analysis when live reopens",
      isClosed: false,
      wasClosed: true,
      isLiveAnalysis: true,
      expected: "clear-live-pause",
    },
    {
      name: "keeps old checkpoint route unchanged on reopen",
      isClosed: false,
      wasClosed: true,
      isLiveAnalysis: false,
      expected: "none",
    },
    {
      name: "does nothing when closed state is unchanged",
      isClosed: true,
      wasClosed: true,
      isLiveAnalysis: true,
      expected: "none",
    },
  ];

  for (const testCase of cases) {
    it(testCase.name, () => {
      expect(
        getLiveAnalysisClosedTransitionAction({
          isClosed: testCase.isClosed,
          wasClosed: testCase.wasClosed,
          isLiveAnalysis: testCase.isLiveAnalysis,
        })
      ).toBe(testCase.expected);
    });
  }
});
