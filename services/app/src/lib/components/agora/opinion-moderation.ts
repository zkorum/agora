import { SvelteMap } from "svelte/reactivity";

import type { AuthorView, OpinionVoteBreakdown } from "$ui/agora/view-types.js";

import type {
  OpinionItem,
  OpinionModerationProperties,
} from "../../../../../shared/src/types/zod.js";

type MoveDetails = Pick<
  Extract<OpinionModerationProperties, { status: "moderated" }>,
  "reason" | "explanation"
>;
export type OpinionMove = MoveDetails & Pick<OpinionItem, "opinionSlugId">;

export interface ModerationOpinion extends Pick<
  OpinionItem,
  "opinionSlugId" | "isSeed"
> {
  author?: AuthorView;
  text: string;
  voteBreakdown?: readonly OpinionVoteBreakdown[];
  move?: MoveDetails;
}

/** Local review decisions only, independent of the activity's editable creation payload. */
export function createOpinionMoves() {
  const decisions = new SvelteMap<string, MoveDetails>();
  return {
    get: (opinionSlugId: string) => decisions.get(opinionSlugId),
    move: ({ opinionSlugId, reason, explanation }: OpinionMove) => {
      decisions.set(opinionSlugId, { reason, explanation });
    },
  };
}
export function createActivityReview() {
  return { authored: createOpinionMoves(), example: createOpinionMoves() };
}
export type ActivityReview = ReturnType<typeof createActivityReview>;
