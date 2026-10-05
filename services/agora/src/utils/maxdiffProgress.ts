export function getMaxDiffProgressPercent({
  progress,
  complete,
}: {
  progress: number;
  complete: boolean;
}): number {
  return complete ? 100 : Math.min(99, Math.round(progress * 100));
}
