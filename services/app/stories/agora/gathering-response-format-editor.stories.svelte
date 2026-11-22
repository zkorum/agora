<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import type { Snippet } from "svelte";
  import { gatheringFormat } from "#lib/mock-data.js";
  import GatheringResponseFormatEditor from "$components/agora/gathering-response-format-editor.svelte";
  import FixtureState from "../fixture-state.svelte";
  import type { FixtureStateView } from "../view-types.js";

  type Format = typeof gatheringFormat;
  interface Args {
    dir: "ltr" | "rtl";
    disabled: boolean;
  }
  const { Story } = defineMeta<
    Snippet<[Args, unknown]>,
    typeof GatheringResponseFormatEditor
  >({
    title: "Agora/Gathering response format editor",
    component: GatheringResponseFormatEditor,
    args: { dir: "ltr", disabled: false },
  });
</script>

{#snippet template(args: Args)}
  <FixtureState initial={() => gatheringFormat}>
    {#snippet children({ value, set }: FixtureStateView<Format>)}
      <GatheringResponseFormatEditor {...args} fields={value} onsave={set} />
      <output aria-label="Saved format">{JSON.stringify(value)}</output>
    {/snippet}
  </FixtureState>
{/snippet}
<Story name="Editable format" {template} />
<Story name="Frozen format" args={{ disabled: true }} {template} />
<Story
  name="Mobile RTL"
  args={{ dir: "rtl" }}
  globals={{ viewport: { value: "mobile1", isRotated: false } }}
  {template}
/>
