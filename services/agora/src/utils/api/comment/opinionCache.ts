import type { InfiniteData } from "@tanstack/vue-query";
import type { FetchOpinionPageResponse } from "src/shared/types/dto";
import type { DisplayedOpinionItem } from "src/shared/types/zod";

export type OpinionCache = InfiniteData<
  FetchOpinionPageResponse,
  FetchOpinionPageResponse["nextCursor"]
>;

export function mapCachedOpinions({
  cache,
  mapOpinion,
}: {
  cache: OpinionCache | undefined;
  mapOpinion: (opinion: DisplayedOpinionItem) => DisplayedOpinionItem;
}): OpinionCache | undefined {
  if (cache === undefined) return undefined;
  return {
    ...cache,
    pages: cache.pages.map((page) => ({
      ...page,
      items: page.items.map(mapOpinion),
    })),
  };
}

export function removeCachedOpinion({
  cache,
  opinionSlugId,
}: {
  cache: OpinionCache | undefined;
  opinionSlugId: string;
}): OpinionCache | undefined {
  if (cache === undefined) return undefined;
  return {
    ...cache,
    pages: cache.pages.map((page) => ({
      ...page,
      items: page.items.filter(
        (opinion) => opinion.opinionSlugId !== opinionSlugId
      ),
    })),
  };
}

export function prependCachedOpinion({
  cache,
  opinion,
}: {
  cache: OpinionCache | undefined;
  opinion: DisplayedOpinionItem;
}): OpinionCache | undefined {
  if (cache === undefined) return undefined;
  const withoutOpinion = removeCachedOpinion({
    cache,
    opinionSlugId: opinion.opinionSlugId,
  });
  if (withoutOpinion === undefined) return undefined;
  return {
    ...withoutOpinion,
    pages: withoutOpinion.pages.map((page, index) =>
      index === 0 ? { ...page, items: [opinion, ...page.items] } : page
    ),
  };
}
