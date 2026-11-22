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

<div
  class="
    mx-auto px-10 pb-16 [--qv-footer-inset:-21px]
    max-md:px-5 max-md:pt-6 max-md:pb-0
  "
>
  <div
    class="
      mb-12 flex min-h-[71px] flex-wrap items-center gap-3 border-b
      border-sky-lighter text-xs text-ink-light
      max-md:hidden
    "
  >
    <Icon name="back" size={16} />{data.projectTitle}<span aria-hidden="true"
      >/</span
    >{title}
  </div>
  <header
    class="
      mb-12 flex flex-col gap-2
      max-md:mb-4 max-md:gap-4
    "
  >
    <div class="flex min-h-[30px] flex-wrap items-center justify-between gap-4">
      <ConversationBadge {kind} /><ConversationBadge {status} />
    </div>
    <h1
      class="
        text-[32px] leading-[1.3] font-bold
        max-md:text-2xl
      "
    >
      {title}
    </h1>
    <div
      class="
        text-base text-ink-light
        max-md:text-lg max-md:leading-[27px]
      "
    >
      <ExpandableText text={description} />
    </div>
  </header>
  {#if data.kind === "polis" || data.kind === "qv"}
    <div
      class="
        mb-4 flex min-h-14 items-center gap-3
        max-md:gap-2 max-md:border-b max-md:border-sky-lighter
      "
    >
      <div
        class="
          flex flex-1 items-stretch self-stretch border-b border-sky-lighter
          text-base
          max-md:border-0
        "
        aria-label="Activity sections"
      >
        <span
          class="
            flex items-center gap-2 border-b-2 border-primary-base px-3 py-2
            whitespace-nowrap
          "
          >Statements <span
            class="rounded-[3px] bg-sky-lighter px-1 text-xs text-ink-light"
            >{data.kind === "polis"
              ? data.opinions.length
              : data.allocations.length}</span
          ></span
        >
        <Button
          variant="unstyled"
          class="
            flex items-center gap-2 border-0 bg-transparent px-3 py-2
            whitespace-nowrap text-sky-dark
          "
          type="button"
          disabled>Analysis <Icon name="prioritizing" size={20} /></Button
        >
      </div>
      <Button
        variant="unstyled"
        class="
          flex h-[42px] items-center gap-3 rounded-lg border border-sky-lighter
          bg-sky-white px-3 py-2 text-sm text-ink-light
          max-md:size-9 max-md:border-0 max-md:bg-sky-lighter max-md:p-2.5
          max-md:text-sky-dark
        "
        type="button"
        disabled
        aria-label="Sort by: Recent"
        ><span class="icon-[lucide--arrow-down-up]" aria-hidden="true"
        ></span><span
          class="
            flex items-center gap-5
            max-md:hidden
          ">Recent <Icon name="chevron" size={16} /></span
        ></Button
      >
      {#if data.kind === "polis"}<span class="max-md:hidden"
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
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
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
    <div
      class="
        flex flex-col gap-6
        max-md:gap-4
      "
    >
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
    <div
      class="
        flex flex-col gap-6
        max-md:gap-4
      "
    >
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
    <div
      class="
        sticky bottom-0 z-1 mx-[-21px] mt-6 hidden border-t border-sky-lighter
        bg-sky-white px-5 pt-3 pb-10
        max-md:block
      "
    >
      <Button
        class="
          max-md:min-h-[50px] max-md:w-full max-md:rounded-full max-md:text-base
          max-md:font-normal
        "
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
  <div
    class="
      flex flex-col gap-6
      max-md:gap-4
    "
  >
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
  <div
    class="
      flex flex-col gap-6
      max-md:gap-4
    "
  >
    <ExpandableText text={reading?.description ?? ""} />
  </div>
</Dialog>
