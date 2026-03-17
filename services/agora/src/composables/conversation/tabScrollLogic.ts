type TabName = "analysis" | "comment";

interface TabScrollState {
  resolveTabName: (routeName: string) => TabName;
  savePosition: (params: {
    routeName: string;
    currentScroll: number;
    viewportHeight: number;
  }) => { minHeight: string };
  getRestorationTarget: (params: {
    routeName: string;
    floorScroll: number;
  }) => number;
  getSavedPosition: (tab: TabName) => number | undefined;
}

export function computeFloorScroll({
  sentinelTop,
  headerHeight,
}: {
  sentinelTop: number;
  headerHeight: number;
}): number {
  return Math.max(0, sentinelTop - headerHeight);
}

export function createTabScrollState({
  analysisRouteName,
}: {
  analysisRouteName: string;
}): TabScrollState {
  const positions = new Map<TabName, number>();

  function resolveTabName(routeName: string): TabName {
    return routeName === analysisRouteName ? "analysis" : "comment";
  }

  function savePosition({
    routeName,
    currentScroll,
    viewportHeight,
  }: {
    routeName: string;
    currentScroll: number;
    viewportHeight: number;
  }): { minHeight: string } {
    const tab = resolveTabName(routeName);
    positions.set(tab, currentScroll);
    return { minHeight: `${currentScroll + viewportHeight}px` };
  }

  function getRestorationTarget({
    routeName,
    floorScroll,
  }: {
    routeName: string;
    floorScroll: number;
  }): number {
    const tab = resolveTabName(routeName);
    const saved = positions.get(tab);
    return Math.max(saved ?? 0, floorScroll);
  }

  function getSavedPosition(tab: TabName): number | undefined {
    return positions.get(tab);
  }

  return { resolveTabName, savePosition, getRestorationTarget, getSavedPosition };
}
