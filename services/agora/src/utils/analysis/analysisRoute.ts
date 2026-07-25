import type { AnalysisView } from "src/shared/types/zod";
import { zodAnalysisView } from "src/shared/types/zod";
import type {
  LocationQuery,
  LocationQueryRaw,
  LocationQueryValue,
} from "vue-router";

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
  const value = query.checkpoint;
  if (
    value === undefined ||
    value === null ||
    Array.isArray(value) ||
    !/^[1-9]\d*$/.test(value)
  ) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
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
