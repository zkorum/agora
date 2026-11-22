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
  const groupShapes = [
    "bg-primary-lightest [clip-path:polygon(20%_0,88%_18%,100%_72%,48%_100%,0_70%)]",
    "bg-gradient-light-blue [clip-path:polygon(10%_16%,72%_0,100%_72%,30%_100%,0_50%)]",
    "bg-green-darkest/10 [clip-path:polygon(30%_0,100%_26%,80%_100%,0_80%,5%_25%)]",
  ];
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

<div class="flex flex-col gap-6">
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
      ><SegmentedControl
        label="Opinion groups"
        appearance="unstyled"
        rootProps={{
          class:
            "grid w-full grid-cols-3 gap-4 max-md:grid-cols-1 [&>button]:rounded-xl [&>button]:bg-transparent [&>button]:p-0",
        }}
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
              `
                relative isolate flex min-h-[190px] w-full cursor-pointer
                flex-col items-center justify-center gap-2 rounded-xl border
                px-4 py-7 text-ink-dark
                max-md:min-h-[130px]
              `,
              opinionGroupId === item.value
                ? "border-primary-light bg-primary-lightest/35"
                : "border-transparent",
            ]}
          >
            <span
              class={[
                "absolute inset-2 -z-1",
                groupShapes[
                  opinionGroups.findIndex((group) => group.id === item.value) %
                    groupShapes.length
                ],
              ]}
              aria-hidden="true"
            ></span>
            <strong class="text-sm font-medium">{item.label}</strong>
            <span class="text-xs text-ink-light">{item.count}</span>
          </span>
        {/snippet}
      </SegmentedControl>
      {#each opinionGroups as opinionGroup (opinionGroup.id)}{#if opinionGroupId === opinionGroup.id}<div
            class="mt-6 rounded-[10px] bg-sky-lightest p-5"
          >
            <h3 class="mb-2 text-lg font-semibold">{opinionGroup.name}</h3>
            <div class="text-sm text-ink-light">
              <ExpandableText text={opinionGroup.description} />
            </div>
          </div>{/if}{/each}</Panel
    >
  {/if}
  <Panel title={moderation ? "Moderation" : "Statements"}>
    <div class="mb-6">
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
    {:else}<div class="flex flex-col gap-6">
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
