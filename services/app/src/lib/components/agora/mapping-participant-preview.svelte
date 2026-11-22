<script lang="ts">
  import OpinionCard from "$ui/agora/opinion-card.svelte";
  import StatementDeck from "$ui/agora/statement-deck.svelte";
  import type { AuthorView, OpinionVoteChoice } from "$ui/agora/view-types.js";

  import type { ParticipationSettings } from "./conversation-settings.js";

  interface Statement {
    id: string;
    title: string;
    author?: AuthorView;
  }
  let {
    statements,
    display,
  }: {
    statements: readonly Statement[];
    display: Extract<ParticipationSettings, { kind: "polis" }>["display"];
  } = $props();
  let votes = $state<Partial<Record<string, OpinionVoteChoice>>>({});
</script>

{#snippet card(statement: Statement, afterVote?: () => void)}
  <OpinionCard
    text={statement.title}
    author={statement.author}
    selected={votes[statement.id]}
    onvote={(vote: OpinionVoteChoice) => {
      votes[statement.id] = vote;
      afterVote?.();
    }}
  />
{/snippet}

{#if display === "deck"}
  <StatementDeck {statements} {card} />
{:else}
  <div
    class="
      grid min-w-0 gap-4
      @md:gap-6
    "
  >
    {#each statements as statement (statement.id)}
      {@render card(statement)}
    {/each}
  </div>
{/if}
