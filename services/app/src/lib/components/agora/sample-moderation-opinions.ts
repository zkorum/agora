import * as m from "#lib/paraglide/messages.js";
import type { OpinionVoteBreakdown } from "$ui/agora/view-types.js";

import type { ModerationOpinion } from "./opinion-moderation.js";

export function createSampleModerationOpinions(
  getMove: (opinionSlugId: string) => ModerationOpinion["move"],
): ModerationOpinion[] {
  function votes({
    agree,
    disagree,
    pass,
  }: {
    agree: number;
    disagree: number;
    pass: number;
  }): OpinionVoteBreakdown[] {
    const total = agree + disagree + pass;
    return [
      {
        choice: "disagree",
        label: m.authoring_disagree(),
        count: String(disagree),
        percentage: (100 * disagree) / total,
      },
      {
        choice: "pass",
        label: m.authoring_unsure(),
        count: String(pass),
        percentage: (100 * pass) / total,
      },
      {
        choice: "agree",
        label: m.authoring_agree(),
        count: String(agree),
        percentage: (100 * agree) / total,
      },
    ];
  }
  const samples: ModerationOpinion[] = [
    {
      opinionSlugId: "sample-crossings",
      isSeed: false,
      text: m.demo_crossings(),
      voteBreakdown: votes({ agree: 80, disagree: 32, pass: 16 }),
    },
    {
      opinionSlugId: "sample-trees",
      isSeed: true,
      text: m.demo_trees(),
      voteBreakdown: votes({ agree: 28, disagree: 8, pass: 4 }),
    },
    {
      opinionSlugId: "sample-benches",
      isSeed: false,
      text: m.demo_benches(),
      voteBreakdown: votes({ agree: 9, disagree: 8, pass: 3 }),
    },
    {
      opinionSlugId: "sample-buses",
      isSeed: false,
      text: m.demo_buses(),
      voteBreakdown: votes({ agree: 3, disagree: 1, pass: 0 }),
      move: { reason: "off_topic", explanation: "" },
    },
  ];
  return samples.map((opinion) => ({
    ...opinion,
    move: getMove(opinion.opinionSlugId) ?? opinion.move,
  }));
}
