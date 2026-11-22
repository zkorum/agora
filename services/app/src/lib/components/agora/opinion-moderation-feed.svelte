<script lang="ts">
  import * as m from "#lib/paraglide/messages.js";
  import OpinionReviewActions from "$ui/agora/opinion-review-actions.svelte";
  import OpinionVoteBar from "$ui/agora/opinion-vote-bar.svelte";
  import Avatar from "$ui/shared/avatar.svelte";
  import ExpandableText from "$ui/shared/expandable-text.svelte";
  import Panel from "$ui/shared/panel.svelte";
  import SearchField from "$ui/shared/search-field.svelte";
  import SegmentedControl from "$ui/shared/segmented-control.svelte";
  import type { SelectItem } from "$ui/shared/view-types.js";

  import type { ModerationReason } from "../../../../../shared/src/types/zod.js";
  import ModerateOpinionDialog from "./moderate-opinion-dialog.svelte";
  import type { ModerationOpinion, OpinionMove } from "./opinion-moderation.js";

  let {
    opinions,
    onmove,
    dir = "ltr",
    heading = m.opinion_feed_title(),
    description,
  }: {
    opinions: readonly ModerationOpinion[];
    onmove: ((change: OpinionMove) => void) | undefined;
    dir?: "ltr" | "rtl";
    heading?: string;
    description?: string;
  } = $props();
  const reasons = {
    misleading: m.opinion_reason_misleading,
    antisocial: m.opinion_reason_antisocial,
    illegal: m.opinion_reason_illegal,
    doxing: m.opinion_reason_doxing,
    sexual: m.opinion_reason_sexual,
    spam: m.opinion_reason_spam,
    off_topic: m.opinion_reason_off_topic,
    other: m.opinion_reason_other,
  } satisfies Record<ModerationReason, () => string>;
  function localizedOptions<Value extends string>(
    labels: Record<Value, () => string>,
  ): SelectItem<Value>[] {
    const items: SelectItem<Value>[] = [];
    for (const value in labels) items.push({ value, label: labels[value]() });
    return items;
  }
  const reasonItems = $derived(localizedOptions(reasons));
  let filter = $state("review");
  let query = $state("");
  const normalizedQuery = $derived(query.trim().toLocaleLowerCase());
  const matching = $derived(
    normalizedQuery
      ? opinions.filter(
          (opinion) =>
            opinion.text.toLocaleLowerCase().includes(normalizedQuery) ||
            opinion.author?.name.toLocaleLowerCase().includes(normalizedQuery),
        )
      : opinions,
  );
  const movedCount = $derived(
    matching.filter((opinion) => opinion.move !== undefined).length,
  );
  const filters = $derived([
    {
      value: "review",
      label: m.moderation_statement_review(),
      count: String(matching.length - movedCount),
    },
    {
      value: "history",
      label: m.moderation_history(),
      count: String(movedCount),
    },
  ]);
  const shown = $derived(
    matching.filter(
      (opinion) => (opinion.move !== undefined) === (filter === "history"),
    ),
  );
  let request = $state.raw<{
    opinion: ModerationOpinion;
    opener: HTMLElement;
  }>();
  const requestedOpinion = $derived(
    request &&
      opinions.find(
        (item) => item.opinionSlugId === request?.opinion.opinionSlugId,
      ),
  );
  let search: HTMLInputElement | null = $state(null);
</script>

<section {dir} aria-label={heading}>
  <Panel title={heading} {description} appearance="activity">
    <div
      class="
        flex flex-wrap items-center justify-between gap-3 border-b
        border-sky-lighter pb-4
      "
    >
      <SearchField
        label={m.opinion_feed_search()}
        bind:value={query}
        bind:ref={search}
      />
      <SegmentedControl
        label={m.opinion_feed_title()}
        appearance="filter"
        items={filters}
        value={filter}
        onchange={(value: string) => {
          filter = value;
        }}
        rootProps={{ dir }}
      />
    </div>
    <div class="grid gap-2 pt-4">
      {#each shown as opinion (opinion.opinionSlugId)}
        <article
          class="
            min-w-0 rounded-xl border border-sky-lighter bg-sky-white
            p-[clamp(16px,2vw,24px)] wrap-anywhere
          "
        >
          <header
            class="mb-3 flex flex-wrap items-center justify-between gap-3"
          >
            <div class="flex flex-wrap items-center gap-2">
              {#if opinion.author}<Avatar author={opinion.author} />{/if}
              <span
                class="
                  rounded-md bg-sky-lightest px-2 py-1 text-xs font-semibold
                  text-ink-dark
                "
                >{opinion.isSeed
                  ? m.moderation_seed_statement()
                  : m.moderation_participant_statement()}</span
              >
            </div>
            <OpinionReviewActions
              text={opinion.text}
              {dir}
              onmoderate={onmove && !opinion.move
                ? (opener: HTMLElement) => {
                    request = { opinion, opener };
                  }
                : undefined}
            />
          </header>
          <ExpandableText text={opinion.text} />
          {#if opinion.move}
            <p class="mt-3 rounded-lg bg-sky-lightest p-2.5">
              <strong
                >{m.moderation_moved()} · {reasons[
                  opinion.move.reason
                ]()}</strong
              >{#if opinion.move.explanation}<br />{opinion.move
                  .explanation}{/if}
            </p>
          {/if}
          {#if opinion.voteBreakdown}<OpinionVoteBar
              voteBreakdown={opinion.voteBreakdown}
              compact
            />{/if}
        </article>
      {:else}<p>{m.opinion_feed_empty()}</p>{/each}
    </div>
  </Panel>
</section>

{#if request}
  {@const target = request}
  {#key target}
    <ModerateOpinionDialog
      opinion={requestedOpinion ?? target.opinion}
      reasons={reasonItems}
      {dir}
      onmove={requestedOpinion && !requestedOpinion.move ? onmove : undefined}
      onclose={() => {
        if (request === target) request = undefined;
      }}
      returnFocus={() => {
        (target.opener.isConnected ? target.opener : search)?.focus({
          preventScroll: true,
        });
      }}
    />
  {/key}
{/if}
