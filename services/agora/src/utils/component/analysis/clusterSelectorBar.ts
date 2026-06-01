export const CLUSTER_SELECTOR_STICKY_THRESHOLD_PX = 1;

export function computeClusterSelectorStickyTopOffset({
  actionBarViewportTop,
  actionBarHeight,
  containerViewportTop,
  headerHeight,
}: {
  actionBarViewportTop: number;
  actionBarHeight: number;
  containerViewportTop: number;
  headerHeight: number;
}): number {
  const actionBarTop = actionBarViewportTop - containerViewportTop;
  const stickyActionBarTop = Math.max(0, Math.min(actionBarTop, headerHeight));

  return stickyActionBarTop + actionBarHeight;
}

export function computeIsClusterSelectorSticky({
  sentinelViewportTop,
  containerViewportTop,
  stickyTopOffset,
}: {
  sentinelViewportTop: number;
  containerViewportTop: number;
  stickyTopOffset: number;
}): boolean {
  return (
    sentinelViewportTop <=
    containerViewportTop +
      stickyTopOffset +
      CLUSTER_SELECTOR_STICKY_THRESHOLD_PX
  );
}

export function computeIsSecondaryContentMerged({
  secondaryContentViewportTop,
  containerViewportTop,
  stickyTopOffset,
  selectorHeight,
}: {
  secondaryContentViewportTop: number;
  containerViewportTop: number;
  stickyTopOffset: number;
  selectorHeight: number;
}): boolean {
  return (
    secondaryContentViewportTop <=
    containerViewportTop +
      stickyTopOffset +
      selectorHeight +
      CLUSTER_SELECTOR_STICKY_THRESHOLD_PX
  );
}

export function computeClusterSelectorContentFloorScroll({
  elementScrollPosition,
  stickyTopOffset,
  selectorHeight,
}: {
  elementScrollPosition: number;
  stickyTopOffset: number;
  selectorHeight: number;
}): number {
  return Math.max(0, elementScrollPosition - stickyTopOffset - selectorHeight);
}

export function computeClusterSelectorRestoreTarget({
  savedScroll,
  floorScroll,
}: {
  savedScroll: number | undefined;
  floorScroll: number;
}): number {
  return Math.max(savedScroll ?? floorScroll, floorScroll);
}
