<script lang="ts">
  import OpinionCard from "$ui/agora/opinion-card.svelte";
  import Button from "$ui/shared/button.svelte";
  import EmptyState from "$ui/shared/empty-state.svelte";
  import ExpandableText from "$ui/shared/expandable-text.svelte";
  import Metrics from "$ui/shared/metrics.svelte";
  import Panel from "$ui/shared/panel.svelte";
  import SegmentedControl from "$ui/shared/segmented-control.svelte";
  import type { SegmentedControlItem } from "$ui/shared/view-types.js";

  import type { PolisAnalysisViewData } from "./view-types.js";

  let {
    data,
    moderation,
  }: { data: PolisAnalysisViewData; moderation: boolean } = $props();
  const { opinions, opinionGroups } = $derived(data);
  const filters = $derived(
    moderation
      ? [
          {
            value: "all",
            label: "All statements",
            count: String(opinions.length),
          },
          {
            value: "pending",
            label: "Awaiting review",
            count: String(
              opinions.filter(
                (opinion) => opinion.visibilityNotice === "pending",
              ).length,
            ),
          },
          {
            value: "hidden",
            label: "Hidden",
            count: String(
              opinions.filter(
                (opinion) => opinion.visibilityNotice === "hidden",
              ).length,
            ),
          },
        ]
      : [
          { value: "all", label: "All statements" },
          { value: "approved", label: "Approved" },
          { value: "divisive", label: "Divisive" },
        ],
  );
  let filter = $derived(filters[0].value);
  let opinionGroupId = $derived(opinionGroups[0]?.id ?? "");
  const filteredOpinions = $derived(
    opinions.filter(
      (opinion) =>
        filter === "all" ||
        (moderation
          ? opinion.visibilityNotice === filter
          : opinion.outcome === filter),
    ),
  );
</script>

<div class="stack">
  <Panel
    title={moderation ? "Responses" : "Activity results"}
    description={data.conversationTitle}
    ><Metrics
      items={[
        { value: data.participantCount, label: "Participants" },
        { value: data.voteCount, label: "Responses" },
        { value: String(opinions.length), label: "Statements" },
      ]}
    /></Panel
  >
  {#if !moderation && opinionGroups.length > 0}
    <Panel title="Opinion groups"
      ><div class="groups">
        <SegmentedControl
          label="Opinion groups"
          appearance="unstyled"
          items={opinionGroups.map((opinionGroup) => ({
            value: opinionGroup.id,
            label: opinionGroup.name,
            count: opinionGroup.participantCount,
          }))}
          value={opinionGroupId}
          onchange={(next: string) => {
            opinionGroupId = next;
          }}
        >
          {#snippet itemContent(item: SegmentedControlItem)}
            <span
              class={[
                "shape",
                {
                  "shape-1":
                    opinionGroups.findIndex(
                      (opinionGroup) => opinionGroup.id === item.value,
                    ) %
                      3 ===
                    1,
                  "shape-2":
                    opinionGroups.findIndex(
                      (opinionGroup) => opinionGroup.id === item.value,
                    ) %
                      3 ===
                    2,
                },
              ]}
              aria-hidden="true"
            ></span><strong>{item.label}</strong><span>{item.count}</span>
          {/snippet}
        </SegmentedControl>
      </div>
      {#each opinionGroups as opinionGroup (opinionGroup.id)}{#if opinionGroupId === opinionGroup.id}<div
            class="summary"
          >
            <h3>{opinionGroup.name}</h3>
            <div class="description">
              <ExpandableText text={opinionGroup.description} />
            </div>
          </div>{/if}{/each}</Panel
    >
  {/if}
  <Panel title={moderation ? "Moderation" : "Statements"}>
    <div class="filters">
      <SegmentedControl
        label={moderation ? "Moderation filters" : "Statement outcomes"}
        items={filters}
        value={filter}
        onchange={(next: string) => {
          filter = next;
        }}
        appearance="underline"
      />
    </div>
    {#if filteredOpinions.length === 0}<EmptyState
        title="No statements in this set yet"
        description="Statements will appear here when people take part."
        icon="message"
      />
    {:else}<div class="stack">
        {#each filteredOpinions as opinion (opinion.id)}<OpinionCard
            text={opinion.text}
            author={opinion.author}
            selected={undefined}
            onvote={undefined}
            voteBreakdown={opinion.visibilityNotice === "pending" ||
            opinion.visibilityNotice === "hidden"
              ? undefined
              : opinion.voteBreakdown}
            visibilityNotice={opinion.visibilityNotice}
            >{#snippet actions()}{#if moderation}<Button
                  variant="quiet"
                  size="control"
                  disabled>Moderate</Button
                >{/if}{/snippet}</OpinionCard
          >{/each}
      </div>{/if}
  </Panel>
</div>

<style>
  .stack {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
  .filters {
    margin-block-end: 24px;
  }
  .groups :global(.agora-segments) {
    display: grid;
    width: 100%;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }
  .groups :global(button) {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    position: relative;
    isolation: isolate;
    padding: 28px 16px;
    min-height: 190px;
    border: 1px solid transparent;
    border-radius: 12px;
    background: transparent;
    font: inherit;
    color: var(--ink-dark);
    cursor: pointer;
  }
  .shape {
    position: absolute;
    inset: 8px;
    background: #ece9ff;
    clip-path: polygon(20% 0, 88% 18%, 100% 72%, 48% 100%, 0 70%);
    z-index: -1;
  }
  .shape-1 {
    clip-path: polygon(10% 16%, 72% 0, 100% 72%, 30% 100%, 0 50%);
    background: #e8effa;
  }
  .shape-2 {
    clip-path: polygon(30% 0, 100% 26%, 80% 100%, 0 80%, 5% 25%);
    background: #e5f1ed;
  }
  .groups :global(button[data-state="on"]) {
    border-color: var(--primary-light);
    background: #eeeeff55;
  }
  strong {
    font-size: 14px;
    font-weight: 500;
  }
  .groups :global(button > span:last-child) {
    font-size: 12px;
    color: var(--ink-light);
  }
  .summary {
    margin-block-start: 24px;
    padding: 20px;
    background: var(--sky-lightest);
    border-radius: 10px;
  }
  h3 {
    font-size: 18px;
    font-weight: 600;
    margin-block-end: 8px;
  }
  .description {
    color: var(--ink-light);
    font-size: 14px;
  }
  @media (max-width: 760px) {
    .groups :global(.agora-segments) {
      grid-template-columns: 1fr;
    }
    .groups :global(button) {
      min-height: 130px;
    }
  }
</style>
