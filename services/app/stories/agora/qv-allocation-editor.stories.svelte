<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import type { Snippet } from "svelte";

  import { qvAllocations } from "#lib/mock-data.js";
  import QvAllocationEditor from "$components/agora/qv-allocation-editor.svelte";
  import type { QvAllocationEditorProps } from "$components/agora/view-types.js";
  import Dialog from "$ui/shared/dialog.svelte";

  import FixtureState from "../fixture-state.svelte";
  import type { FixtureStateView } from "../view-types.js";

  type Args = Omit<QvAllocationEditorProps, "onread"> & {
    dir?: "ltr" | "rtl";
  };

  const emptyRows = qvAllocations.map(
    (row): (typeof qvAllocations)[number] => ({
      ...row,
      votes: 0,
    }),
  );

  const longRows = Array.from({ length: 12 }, (_, index) => {
    const row = qvAllocations[index % qvAllocations.length];
    return {
      ...row,
      id: `item-${String(index + 1)}`,
      title: `${String(index + 1)}. ${row.title}`,
      votes: 0,
    };
  });

  const { Story } = defineMeta<
    Snippet<[Args, unknown]>,
    typeof QvAllocationEditor
  >({
    title: "Agora/Quadratic voting",
    component: QvAllocationEditor,
    args: {
      rows: qvAllocations,
      totalCredits: 100,
      voteLimit: 7,
    },
    parameters: {
      docs: {
        description: {
          component:
            "The shared allocation component updates each statement’s squared credit cost and the remaining budget. These fixtures use a preview range of −7 to 7, not a production voting limit. The balance and disabled Submit button stay visible while scrolling within the widget. No API requests or submissions are made.",
        },
      },
    },
  });
</script>

{#snippet template({ dir = "ltr", ...args }: Args)}
  <FixtureState
    initial={(): (typeof qvAllocations)[number] | undefined => undefined}
  >
    {#snippet children({
      value: reading,
      set,
    }: FixtureStateView<(typeof qvAllocations)[number] | undefined>)}
      <div {dir} style="max-width: 1100px">
        <QvAllocationEditor
          {...args}
          onread={(id: string) => {
            set(args.rows.find((row) => row.id === id));
          }}
        />
        <Dialog
          bind:open={
            () => reading !== undefined,
            (next: boolean) => {
              if (!next) set(undefined);
            }
          }
          {dir}
          title={reading?.title ?? "Statement"}
          description="Full response"
        >
          {reading?.description ?? ""}
        </Dialog>
      </div>
    {/snippet}
  </FixtureState>
{/snippet}

<Story name="Allocated" {template} />
<Story
  name="Unallocated"
  args={{
    rows: emptyRows,
  }}
  {template}
/>
<Story name="Closed" args={{ disabled: true }} {template} />
<Story
  name="Long description"
  args={{
    rows: qvAllocations.map((row, index) =>
      index === 0
        ? {
            ...row,
            description:
              "Select three streets through a shared survey and an open invitation for residents to identify difficult summer journeys. Prioritize routes to schools, public transport, local shops and health services, especially where older residents and families have few shaded places to rest. Publish the proposed planting locations so neighbors can identify access requirements before work begins. Include a maintenance plan for watering, replacing damaged trees and keeping pavements clear. Review the planting with residents after the first summer and share what has worked before extending the approach to more streets.",
          }
        : row,
    ),
  }}
  {template}
/>
<Story
  name="Opposition"
  args={{
    rows: emptyRows.map((row, index) =>
      index === 0 ? { ...row, votes: -1 } : row,
    ),
  }}
  {template}
/>
<Story
  name="Preview boundaries"
  args={{
    rows: emptyRows.map((row, index) => ({
      ...row,
      votes: index === 0 ? 7 : index === 2 ? -7 : 0,
    })),
  }}
  {template}
/>
<Story
  name="Empty"
  args={{
    rows: [],
  }}
  {template}
/>
<Story
  name="Budget exhausted"
  args={{
    totalCredits: 49,
    rows: emptyRows.map((row, index) => ({
      ...row,
      votes: index === 0 ? 7 : 0,
    })),
  }}
  {template}
/>
<Story
  name="Zero budget"
  args={{ totalCredits: 0, rows: emptyRows }}
  {template}
/>
<Story name="Reduced budget" args={{ totalCredits: 49 }} {template} />
<Story name="Long list" args={{ rows: longRows }} {template} />
<Story name="RTL" args={{ dir: "rtl" }} {template} />
