import type { AnalysisView } from "src/shared/types/zod";
import { zodAnalysisView } from "src/shared/types/zod";
import type { LocationQuery, LocationQueryRaw, LocationQueryValue } from "vue-router";

function getSingleQueryValue(
  value: LocationQueryValue | LocationQueryValue[] | undefined
): string | undefined {
  if (Array.isArray(value)) {
    return value[0] ?? undefined;
  }

  return value ?? undefined;
}

export function parseAnalysisViewQuery({
  query,
}: {
  query: LocationQuery;
}): AnalysisView | undefined {
  const value = getSingleQueryValue(query.analysisView);
  const parsed = zodAnalysisView.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function parseCheckpointQuery({
  query,
}: {
  query: LocationQuery;
}): number | undefined {
  const value = getSingleQueryValue(query.checkpoint);
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function getUpdatedAnalysisRouteQuery({
  query,
  analysisView,
  checkpointViewSnapshotId,
}: {
  query: LocationQuery;
  analysisView?: AnalysisView;
  checkpointViewSnapshotId?: number;
}): LocationQueryRaw {
  const nextQuery: LocationQueryRaw = { ...query };

  if (analysisView === undefined) {
    delete nextQuery.analysisView;
  } else {
    nextQuery.analysisView = analysisView;
  }

  if (checkpointViewSnapshotId === undefined) {
    delete nextQuery.checkpoint;
  } else {
    nextQuery.checkpoint = String(checkpointViewSnapshotId);
  }

  return nextQuery;
}
