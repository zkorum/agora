import type { AnalysisViewState } from "src/shared/types/dto";
import { describe, expect, it } from "vitest";

import {
  type AnalysisViewOption,
  getDisplayedAnalysisView,
  getFacilitatorPreferenceCaption,
  isAnalysisViewOptionMuted,
  isAnalysisViewOptionSelectable,
  shouldShowAnalysisViewOptionStats,
} from "./analysisViewPicker";

function viewState(
  overrides: Partial<AnalysisViewState>
): AnalysisViewState {
  return {
    requestedView: "facilitator_preference",
    canonicalView: "auto",
    resolvedGroupCount: null,
    resolvedCandidateId: null,
    resolvedBy: "locked_fallback",
    variantsEnabled: false,
    options: [],
    ...overrides,
  };
}

describe("analysis view picker", () => {
  it("displays auto for snapshot fallback even when route requests facilitator preference", () => {
    expect(
      getDisplayedAnalysisView({
        routeView: "facilitator_preference",
        viewState: viewState({ variantsEnabled: false, canonicalView: "auto" }),
      })
    ).toBe("auto");
  });

  it("defaults to auto before backend state is available", () => {
    expect(
      getDisplayedAnalysisView({ routeView: undefined, viewState: undefined })
    ).toBe("auto");
  });

  it("defaults to facilitator preference when variants are available", () => {
    expect(
      getDisplayedAnalysisView({
        routeView: undefined,
        viewState: viewState({
          requestedView: "facilitator_preference",
          canonicalView: "facilitator_preference",
          resolvedBy: "no_analysis",
          variantsEnabled: true,
        }),
      })
    ).toBe("facilitator_preference");
  });

  it("disables every picker option when variants are disabled", () => {
    const autoOption: AnalysisViewOption = {
      view: "auto",
      status: "recommended",
      candidate: {
        candidateId: 1,
        groupCount: 3,
        assessment: {
          selectionScore: 1,
          silhouetteScore: 0.5,
          balanceScore: 0.5,
        },
      },
    };
    const facilitatorOption: AnalysisViewOption = {
      view: "facilitator_preference",
      status: "locked",
      reason: "analysis_variants_not_available",
      resolvesToView: "auto",
    };

    expect(
      isAnalysisViewOptionSelectable({
        option: autoOption,
        variantsEnabled: false,
      })
    ).toBe(false);
    expect(
      isAnalysisViewOptionSelectable({
        option: facilitatorOption,
        variantsEnabled: false,
      })
    ).toBe(false);
  });

  it("only shows stats/muted unavailable state for fixed group-count options", () => {
    const facilitatorOption: AnalysisViewOption = {
      view: "facilitator_preference",
      status: "unavailable",
      reason: "fixed_group_count_unavailable",
      groupCount: 3,
      resolvesToView: "3",
    };
    const fixedOption: AnalysisViewOption = {
      view: "3",
      status: "unavailable",
      reason: "fixed_group_count_unavailable",
      groupCount: 3,
    };

    expect(shouldShowAnalysisViewOptionStats(facilitatorOption)).toBe(false);
    expect(
      isAnalysisViewOptionMuted({
        option: facilitatorOption,
        variantsEnabled: true,
      })
    ).toBe(false);
    expect(shouldShowAnalysisViewOptionStats(fixedOption)).toBe(true);
    expect(
      isAnalysisViewOptionMuted({ option: fixedOption, variantsEnabled: true })
    ).toBe(true);
  });

  it("shows facilitator preference group count even when currently unavailable", () => {
    const facilitatorOption: AnalysisViewOption = {
      view: "facilitator_preference",
      status: "unavailable",
      reason: "fixed_group_count_unavailable",
      groupCount: 3,
      resolvesToView: "3",
    };

    expect(getFacilitatorPreferenceCaption({ option: facilitatorOption })).toEqual(
      { kind: "usesGroups", groupCount: "3" }
    );
  });
});
