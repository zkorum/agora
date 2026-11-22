import type {
    ClosedAnalysisInputMode,
    ClosedAnalysisSelection,
} from "@/shared/types/dto.js";

export function describeClosedAnalysisSelection({
    closeId,
    selectionRevision,
    isSwitchable,
    selectedInputMode,
    servedInputMode,
    requestedResultRevision,
    servedResultRevision,
    failed,
}: {
    closeId: number;
    selectionRevision: number;
    isSwitchable: boolean;
    selectedInputMode: ClosedAnalysisInputMode;
    servedInputMode: ClosedAnalysisInputMode;
    requestedResultRevision: number | null;
    servedResultRevision: number | null;
    failed: boolean;
}): ClosedAnalysisSelection {
    const served = {
        closeId,
        selectionRevision,
        isSwitchable,
        servedInputMode,
    };
    return selectedInputMode === servedInputMode &&
        requestedResultRevision === servedResultRevision
        ? { ...served, status: "ready" }
        : {
              ...served,
              status: failed ? "failed" : "pending",
              requestedInputMode: selectedInputMode,
          };
}
