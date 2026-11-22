<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import * as m from "#lib/paraglide/messages.js";
  import type { Snippet } from "svelte";
  import { createSampleModerationOpinions } from "$components/agora/sample-moderation-opinions.js";
  import OpinionModerationFeed from "$components/agora/opinion-moderation-feed.svelte";
  import { createOpinionMoves } from "$components/agora/opinion-moderation.js";
  import FixtureState from "../fixture-state.svelte";
  import type { FixtureStateView } from "../view-types.js";

  interface Args {
    dir: "ltr" | "rtl";
    facilitator: boolean;
  }
  const { Story } = defineMeta<
    Snippet<[Args, unknown]>,
    typeof OpinionModerationFeed
  >({
    title: "Agora/Opinion moderation feed",
    component: OpinionModerationFeed,
    args: { dir: "ltr", facilitator: true },
  });
</script>

{#snippet template(args: Args)}
  <FixtureState initial={createOpinionMoves}>
    {#snippet children({
      value: moves,
    }: FixtureStateView<ReturnType<typeof createOpinionMoves>>)}
      <OpinionModerationFeed
        dir={args.dir}
        heading={m.authoring_moderation_example()}
        description={m.moderation_sample_explanation()}
        opinions={createSampleModerationOpinions(moves.get)}
        onmove={args.facilitator ? moves.move : undefined}
      />
    {/snippet}
  </FixtureState>
{/snippet}
<Story name="Facilitator" {template} />
<Story name="Read only" args={{ facilitator: false }} {template} />
<Story
  name="Mobile RTL"
  args={{ dir: "rtl" }}
  globals={{ viewport: { value: "mobile1", isRotated: false } }}
  {template}
/>
