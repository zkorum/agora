export type BannerState = "celebration" | "refine" | "discover";

export function computeBannerState({
  clusteredThisMount,
  clusteredFromCache,
  clusteredInSession,
}: {
  clusteredThisMount: boolean;
  clusteredFromCache: boolean;
  clusteredInSession: boolean;
}): BannerState {
  // First detection this mount, cache hasn't caught up yet
  if (clusteredThisMount && !clusteredFromCache) {
    return "celebration";
  }
  // Known to be clustered from ANY source
  if (clusteredThisMount || clusteredFromCache || clusteredInSession) {
    return "refine";
  }
  // Not clustered yet
  return "discover";
}
