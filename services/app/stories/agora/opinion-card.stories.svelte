<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import type { Snippet } from "svelte";

  import {
    author,
    opinionVoteBreakdown,
    opinionTexts,
  } from "#lib/mock-data.js";
  import OpinionCard from "$ui/agora/opinion-card.svelte";
  import type {
    OpinionVoteChoice,
    OpinionCardProps,
  } from "$ui/agora/view-types.js";

  import FixtureState from "../fixture-state.svelte";
  import type { FixtureStateView } from "../view-types.js";

  type Args = Omit<OpinionCardProps, "onvote"> & {
    dir?: "ltr" | "rtl";
  };

  const { Story } = defineMeta<Snippet<[Args, unknown]>, typeof OpinionCard>({
    title: "Agora/Opinion card",
    component: OpinionCard,
    args: { text: opinionTexts[0], author, selected: undefined },
  });

  const longOpinion = [
    "We should make it safer and easier to walk and cycle around Riverside, with a connected network of routes that serves schools, shops, parks and public transport. Residents should be able to make everyday journeys without needing to drive, including people travelling with children or using mobility aids.",
    "Start by listening to people who already use these streets every day. Ask where crossings feel unsafe, where pavements become too narrow, and where shade or seating would make a journey possible. Include people who cannot attend a public meeting through accessible surveys and neighbourhood visits.",
    "The first improvements should connect existing routes rather than leave isolated stretches. Review junctions, crossing times, lighting and the space needed for a wheelchair or pushchair to pass. Keep access to local shops and essential services in mind throughout the design process.",
    "Trial changes before making them permanent, share the results openly, and explain how feedback changes the plans. Measure safety, accessibility and comfort as well as journey times. This gives residents a clear way to understand the trade-offs and suggest practical improvements.",
    "Finally, agree on how these routes will be maintained over time. Good drainage, reliable lighting, clear signage and regular repairs matter as much as the initial design. Publish a simple timetable and make it easy for residents to report a problem without having to attend another consultation.",
  ].join("\n\n");
</script>

{#snippet template({ dir = "ltr", ...args }: Args)}
  <FixtureState initial={() => args.selected}>
    {#snippet children({
      value: selected,
      set,
    }: FixtureStateView<OpinionVoteChoice | undefined>)}
      <div {dir} class="w-full max-w-200">
        <OpinionCard
          {...args}
          {selected}
          onvote={(next: OpinionVoteChoice) => {
            set(next);
          }}
        />
      </div>
    {/snippet}
  </FixtureState>
{/snippet}

<Story name="Unanswered" {template} />
<Story name="Disagreed" args={{ selected: "disagree" }} {template} />
<Story name="Unsure" args={{ selected: "pass" }} {template} />
<Story name="Agreed" args={{ selected: "agree" }} {template} />
<Story name="Long statement" args={{ text: longOpinion }} {template} />
<Story name="Closed" args={{ disabled: true }} {template} />
<Story
  name="Response breakdown"
  args={{ voteBreakdown: opinionVoteBreakdown }}
  {template}
/>
<Story
  name="Awaiting review"
  args={{ visibilityNotice: "pending" }}
  {template}
/>
<Story name="Hidden" args={{ visibilityNotice: "hidden" }} {template} />
<Story name="RTL" args={{ dir: "rtl" }} {template} />
