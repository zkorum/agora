<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import type { Snippet } from "svelte";
  import ConversationMethodPanel from "$ui/agora/conversation-method-panel.svelte";
  import type { ConversationMethodPanelProps } from "$ui/agora/view-types.js";
  import FixtureState from "../fixture-state.svelte";
  import type { FixtureStateView } from "../view-types.js";
  type Args = ConversationMethodPanelProps<string>;
  const { Story } = defineMeta<
    Snippet<[Args, unknown]>,
    typeof ConversationMethodPanel
  >({
    title: "Agora/Conversation method panel",
    component: ConversationMethodPanel,
    args: {
      title: "Prioritizing method",
      description: "Choose how participants compare and prioritise the ideas.",
      selected: "bws",
      items: [
        {
          value: "pairwise",
          label: "Pairwise",
          description:
            "Participants compare two ideas at a time and choose the one they prefer.",
          icon: "list",
        },
        {
          value: "bws",
          label: "Best – Worst",
          description:
            "Participants see four statements at a time and choose the one they most and least support.",
          icon: "check",
        },
        {
          value: "qv",
          label: "Quadratic voting",
          description:
            "Participants distribute credits across all the ideas to show how strongly they support or oppose each one.",
          icon: "prioritizing",
          disabled: true,
        },
      ],
    },
  });
</script>

{#snippet template(args: Args)}
  <FixtureState initial={() => args.selected}>
    {#snippet children({ value, set }: FixtureStateView<string | undefined>)}
      <ConversationMethodPanel {...args} selected={value} onselect={set} />
    {/snippet}
  </FixtureState>
{/snippet}
<Story name="Prioritizing with unavailable method" {template} />
<Story
  name="Mapping no selection"
  args={{
    title: "Choose how participants respond",
    description: undefined,
    selected: undefined,
    items: [
      {
        value: "feed",
        label: "All at once",
        description:
          "Show every statement in a feed so participants can respond in any order.",
        icon: "list",
      },
      {
        value: "deck",
        label: "One at a time",
        description:
          "Show one statement and move to the next after each response.",
        icon: "panel",
      },
    ],
  }}
  {template}
/>
<Story
  name="Gathering amendments"
  args={{
    title: "Choose gathering format",
    description:
      "Choose whether you’d like to gather new responses to a question, or allow participants to amend responses from a previous activity.",
    selected: "amend",
    items: [
      {
        value: "new",
        label: "Gather new responses",
        description:
          "Participants submit a new response using your response format.",
        icon: "gathering",
      },
      {
        value: "amend",
        label: "Amend existing responses",
        description:
          "Participants revise their own responses, brought in from a linked gathering activity.",
        icon: "message",
      },
    ],
  }}
  {template}
/>
