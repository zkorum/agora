export function getHorizontalScrollMax({
  scrollWidth,
  clientWidth,
}: {
  scrollWidth: number;
  clientWidth: number;
}): number {
  return Math.max(0, scrollWidth - clientWidth);
}

export function clampHorizontalScrollLeft({
  scrollLeft,
  maxScrollLeft,
}: {
  scrollLeft: number;
  maxScrollLeft: number;
}): number {
  return Math.min(Math.max(scrollLeft, 0), maxScrollLeft);
}

export function hasHorizontalDragExceededThreshold({
  startClientX,
  currentClientX,
  thresholdPx,
}: {
  startClientX: number;
  currentClientX: number;
  thresholdPx: number;
}): boolean {
  return Math.abs(currentClientX - startClientX) >= thresholdPx;
}

export function getHorizontalDragScrollLeft({
  startClientX,
  currentClientX,
  startScrollLeft,
  maxScrollLeft,
}: {
  startClientX: number;
  currentClientX: number;
  startScrollLeft: number;
  maxScrollLeft: number;
}): number {
  return clampHorizontalScrollLeft({
    scrollLeft: startScrollLeft - (currentClientX - startClientX),
    maxScrollLeft,
  });
}
