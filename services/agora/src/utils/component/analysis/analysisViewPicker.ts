import type { AnalysisViewState } from "src/shared/types/dto";
import type { AnalysisView } from "src/shared/types/zod";

export type AnalysisViewOption = AnalysisViewState["options"][number];

export type FacilitatorPreferenceCaption =
  | { kind: "none" }
  | { kind: "sameAsAuto" }
  | { kind: "usesGroups"; groupCount: string };

export function getAnalysisViewGroupCount(
  view: AnalysisView
): string | undefined {
  switch (view) {
    case "2":
    case "3":
    case "4":
    case "5":
    case "6":
      return view;
    case "facilitator_preference":
    case "auto":
      return undefined;
  }
}

export function getDisplayedAnalysisView({
  routeView,
  viewState,
}: {
  routeView: AnalysisView | undefined;
  viewState: AnalysisViewState | undefined;
}): AnalysisView {
  if (viewState?.variantsEnabled === false) {
    return viewState.canonicalView;
  }

  return routeView ?? viewState?.requestedView ?? "auto";
}

export function isAnalysisViewOptionSelectable({
  option,
  variantsEnabled,
}: {
  option: AnalysisViewOption;
  variantsEnabled: boolean | undefined;
}): boolean {
  if (variantsEnabled === false) {
    return false;
  }

  return option.status !== "locked";
}

export function isAnalysisViewOptionMuted({
  option,
  variantsEnabled,
}: {
  option: AnalysisViewOption;
  variantsEnabled: boolean | undefined;
}): boolean {
  if (variantsEnabled === false || option.status === "locked") {
    return true;
  }

  return (
    getAnalysisViewGroupCount(option.view) !== undefined &&
    (option.status === "discouraged" || option.status === "unavailable")
  );
}

export function shouldShowAnalysisViewOptionStats(
  option: AnalysisViewOption
): boolean {
  return getAnalysisViewGroupCount(option.view) !== undefined;
}

export function getFacilitatorPreferenceCaption({
  option,
}: {
  option: AnalysisViewOption;
}): FacilitatorPreferenceCaption {
  const resolvesToView = option.resolvesToView;
  if (resolvesToView === undefined) {
    return { kind: "none" };
  }

  if (resolvesToView === "auto") {
    return { kind: "sameAsAuto" };
  }

  const groupCount = getAnalysisViewGroupCount(resolvesToView);
  return groupCount === undefined
    ? { kind: "none" }
    : { kind: "usesGroups", groupCount };
}
