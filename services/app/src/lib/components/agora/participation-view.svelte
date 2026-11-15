<script lang="ts">
  import BwsChoice from "$ui/agora/bws-choice.svelte";
  import ChoiceGroup from "$ui/agora/choice-group.svelte";
  import ContentCard from "$ui/agora/content-card.svelte";
  import ConversationBadge from "$ui/agora/conversation-badge.svelte";
  import OpinionCard from "$ui/agora/opinion-card.svelte";
  import type { OpinionVoteChoice } from "$ui/agora/view-types.js";
  import Button from "$ui/shared/button.svelte";
  import Dialog from "$ui/shared/dialog.svelte";
  import ExpandableText from "$ui/shared/expandable-text.svelte";
  import Field from "$ui/shared/field.svelte";
  import Icon from "$ui/shared/icon.svelte";
  import Panel from "$ui/shared/panel.svelte";

  import QvAllocationEditor from "./qv-allocation-editor.svelte";
  import type {
    ParticipationResponse,
    ParticipationViewData,
  } from "./view-types.js";

  let {
    data,
    dir,
  }: {
    data: ParticipationViewData;
    dir: "ltr" | "rtl";
  } = $props();
  const { author, title, description, status } = $derived(data);
  let selections = $state<Record<string, OpinionVoteChoice | undefined>>({});
  let choice = $state<string | undefined>();
  let best = $state<string | undefined>();
  let worst = $state<string | undefined>();
  let dialog = $state(false);
  let reading = $state<ParticipationResponse | undefined>();
  const kind = $derived(
    data.kind === "qv" || data.kind === "comparisons"
      ? "prioritizing"
      : data.kind,
  );
</script>

<div class="participant">
  <div class="crumbs">
    <Icon name="back" size={16} />{data.projectTitle}<span aria-hidden="true"
      >/</span
    >{title}
  </div>
  <header class="conversation-heading">
    <div class="row">
      <ConversationBadge {kind} /><ConversationBadge {status} />
    </div>
    <h1>{title}</h1>
    <div class="description">
      <ExpandableText text={description} />
    </div>
  </header>
  {#if data.kind === "polis" || data.kind === "qv"}
    <div class="conversation-toolbar">
      <div class="conversation-tabs" aria-label="Activity sections">
        <span class="current-section"
          >Statements <span class="count"
            >{data.kind === "polis"
              ? data.opinions.length
              : data.allocations.length}</span
          ></span
        >
        <Button variant="unstyled" type="button" disabled
          >Analysis <Icon name="prioritizing" size={20} /></Button
        >
      </div>
      <Button
        variant="unstyled"
        class="conversation-sort"
        type="button"
        disabled
        aria-label="Sort by: Recent"
        ><span class="icon-[lucide--arrow-down-up]" aria-hidden="true"
        ></span><span class="sort-label"
          >Recent <Icon name="chevron" size={16} /></span
        ></Button
      >
      {#if data.kind === "polis"}<span class="desktop-add"
          ><Button
            variant="solid"
            size="control"
            disabled={status === "closed"}
            onclick={() => (dialog = true)}
            ><Icon name="plus" size={16} />Add statement</Button
          ></span
        >{/if}
    </div>
  {:else if data.kind === "gathering"}
    <div class="toolbar">
      <Button
        variant="solid"
        size="control"
        disabled={status === "closed"}
        onclick={() => (dialog = true)}
        ><Icon name="plus" size={16} />Add response</Button
      >
    </div>
  {/if}
  {#if data.kind === "polis"}
    <div class="stack">
      {#each data.opinions as text (text)}<OpinionCard
          {text}
          {author}
          selected={selections[text]}
          onvote={(value: OpinionVoteChoice) => {
            selections[text] = value;
          }}
          disabled={status === "closed"}
        />{/each}
    </div>
  {:else if data.kind === "qv"}
    <QvAllocationEditor
      --qv-footer-inset="-21px"
      rows={data.allocations}
      totalCredits={data.totalCredits}
      voteLimit={data.voteLimit}
      disabled={status === "closed"}
      onread={(id: string) => {
        reading = data.allocations.find((row) => row.id === id);
      }}
    />
  {:else if data.kind === "comparisons"}
    <Panel
      title={data.comparisonMethod === "pairwise"
        ? "Choose the statement you would prioritise"
        : "Choose the most and least important statement"}
    >
      {#if data.comparisonMethod === "pairwise"}<ChoiceGroup
          label="Prioritise a statement"
          items={data.items.map((text) => ({
            value: text,
            text,
            label: "Choose this statement",
          }))}
          selected={choice}
          onselect={(next: string) => {
            choice = next;
          }}
          disabled={status === "closed"}
        />
      {:else}<BwsChoice
          items={data.items.map((text) => ({ value: text, text }))}
          {best}
          {worst}
          onbestchange={(next: string) => {
            best = next;
            if (worst === next) worst = undefined;
          }}
          onworstchange={(next: string) => {
            worst = next;
            if (best === next) best = undefined;
          }}
          disabled={status === "closed"}
        />{/if}
    </Panel>
  {:else}
    <div class="stack">
      {#each data.responses as response (response.id)}<ContentCard
          {author}
          title={response.title}
          description={response.description}
          onread={() => {
            reading = response;
          }}
        />{/each}
    </div>
  {/if}
  {#if data.kind === "polis"}
    <div class="mobile-action">
      <Button
        variant="solid"
        size="control"
        disabled={status === "closed"}
        onclick={() => (dialog = true)}
        ><Icon name="plus" size={16} />Add statement</Button
      >
    </div>
  {/if}
</div>

<Dialog
  bind:open={dialog}
  {dir}
  title={data.kind === "gathering" ? "Add a response" : "Add a statement"}
  description="Submission is not available yet."
>
  <div class="stack">
    {#if data.kind === "gathering"}<Field
        label="Title"
        placeholder="Give your response a title"
      />{/if}<Field
      label={data.kind === "gathering" ? "Your response" : "Your statement"}
      multiline
      placeholder="Share your perspective…"
    />
  </div>
  {#snippet footer()}<Button
      variant="neutral"
      size="control"
      onclick={() => (dialog = false)}>Cancel</Button
    ><Button variant="solid" size="control" disabled>Submit</Button>{/snippet}
</Dialog>
<Dialog
  bind:open={
    () => reading !== undefined,
    (next: boolean) => {
      if (!next) reading = undefined;
    }
  }
  {dir}
  title={reading?.title ?? ""}
  description="Full response"
>
  <div class="stack">
    <ExpandableText text={reading?.description ?? ""} />
  </div>
</Dialog>

<style>
  .participant {
    padding: 0 40px 64px;
    margin-inline: auto;
  }
  .crumbs {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    min-height: 71px;
    border-block-end: 1px solid var(--sky-lighter);
    color: var(--ink-light);
    font-size: 12px;
    margin-block-end: 48px;
  }
  .conversation-heading {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-block-end: 48px;
  }
  h1 {
    font-size: 32px;
    font-weight: 700;
    line-height: 1.3;
  }
  .conversation-heading > .description {
    color: var(--ink-light);
    font-size: 16px;
  }
  .conversation-heading .row {
    min-height: 30px;
  }
  .row,
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }
  .conversation-toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 56px;
    margin-block-end: 16px;
  }
  .conversation-tabs {
    display: flex;
    align-self: stretch;
    align-items: stretch;
    flex: 1;
    border-block-end: 1px solid var(--sky-lighter);
    font-size: 16px;
  }
  .current-section,
  .conversation-tabs :global(button) {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    white-space: nowrap;
  }
  .current-section {
    border-block-end: 2px solid var(--primary-base);
  }
  .count {
    border-radius: 3px;
    padding: 0 4px;
    color: var(--ink-light);
    background: var(--sky-lighter);
    font-size: 12px;
  }
  .conversation-tabs :global(button) {
    border: 0;
    background: transparent;
    color: var(--sky-dark);
    font: inherit;
  }
  .conversation-toolbar :global(.conversation-sort) {
    display: flex;
    align-items: center;
    gap: 12px;
    height: 42px;
    padding: 8px 12px;
    border: 1px solid var(--sky-lighter);
    border-radius: 8px;
    background: white;
    color: var(--ink-light);
    font: inherit;
    font-size: 14px;
  }
  .sort-label {
    display: flex;
    align-items: center;
    gap: 20px;
  }
  .mobile-action {
    display: none;
  }
  .toolbar {
    margin-block-end: 24px;
  }
  .stack {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
  @media (max-width: 760px) {
    .participant {
      padding: 24px 20px 0;
    }
    .crumbs {
      display: none;
    }
    .conversation-heading {
      gap: 16px;
      margin-block-end: 16px;
    }
    .conversation-heading > .description {
      font-size: 18px;
      line-height: 27px;
    }
    .stack {
      gap: 16px;
    }
    .conversation-toolbar {
      gap: 8px;
      border-block-end: 1px solid var(--sky-lighter);
    }
    .conversation-tabs {
      border: 0;
    }
    .conversation-toolbar :global(.conversation-sort) {
      padding: 10px;
      width: 36px;
      height: 36px;
      border: 0;
      background: var(--sky-lighter);
      color: var(--sky-dark);
    }
    .sort-label,
    .desktop-add {
      display: none;
    }
    .mobile-action {
      display: block;
      position: sticky;
      inset-block-end: 0;
      margin-inline: -21px;
      margin-block-start: 24px;
      padding: 12px 20px 40px;
      border-block-start: 1px solid var(--sky-lighter);
      background: white;
      z-index: 1;
    }
    .mobile-action :global(button) {
      width: 100%;
      min-height: 50px;
      border-radius: 999px;
      font-size: 16px;
      font-weight: 400;
    }
    h1 {
      font-size: 24px;
    }
  }
</style>
