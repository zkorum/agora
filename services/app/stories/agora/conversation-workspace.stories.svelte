<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import type { Snippet } from "svelte";
  import ConversationWorkspace from "$ui/agora/conversation-workspace.svelte";
  import ConversationSummaryPanel from "$ui/agora/conversation-summary-panel.svelte";
  import type {
    ConversationViewKind,
    ConversationViewStatus,
  } from "$ui/agora/view-types.js";
  import FixtureState from "../fixture-state.svelte";
  import type { FixtureStateView } from "../view-types.js";

  type Section = "setup" | "moderation" | "analysis";
  interface Args {
    kind: ConversationViewKind;
    title: string;
    status?: ConversationViewStatus;
    dir: "ltr" | "rtl";
  }
  const tabs = [
    { value: "setup", label: "Setup" },
    { value: "moderation", label: "Moderation" },
    { value: "analysis", label: "Analysis" },
  ] as const;
  const { Story } = defineMeta<
    Snippet<[Args, unknown]>,
    typeof ConversationWorkspace
  >({
    title: "Agora/Conversation workspace",
    component: ConversationWorkspace,
    args: { kind: "polis", title: "New activity name", dir: "ltr" },
  });
</script>

{#snippet template(args: Args)}
  <FixtureState initial={(): Section => "setup"}>
    {#snippet children({ value, set }: FixtureStateView<Section>)}
      <ConversationWorkspace
        dir={args.dir}
        tabs={args.kind === "prioritizing"
          ? tabs.filter((t) => t.value !== "moderation")
          : tabs}
        {value}
        onValueChange={set}
        label="Activity sections"
      >
        {#snippet layout(list: Snippet, panels: Snippet)}
          <header class="flex justify-center py-3">{@render list()}</header>
          {@render panels()}
        {/snippet}
        {#snippet panel(tab)}
          {#if tab === "setup"}<ConversationSummaryPanel
              kind={args.kind}
              title={args.title}
              status={args.status}
              description={args.status
                ? "Share practical ideas for a greener Riverside."
                : ""}
            />
          {:else}<h2>{tab === "analysis" ? "Analysis" : "Moderation"}</h2>{/if}
        {/snippet}
      </ConversationWorkspace>
    {/snippet}
  </FixtureState>
{/snippet}
<Story name="Mapping setup" {template} />
<Story
  name="Published prioritizing"
  args={{
    kind: "prioritizing",
    status: "open",
    title: "Which shared priorities should happen first?",
  }}
  {template}
/>
<Story
  name="Closed gathering"
  args={{
    kind: "gathering",
    status: "closed",
    title: "What would make our neighbourhood greener?",
  }}
  {template}
/>
<Story
  name="Mobile RTL"
  args={{ dir: "rtl" }}
  globals={{ viewport: { value: "mobile1", isRotated: false } }}
  {template}
/>
