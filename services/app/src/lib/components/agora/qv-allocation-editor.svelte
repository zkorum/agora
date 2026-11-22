<script lang="ts">
  import {
    canChangeAllocation,
    getRemainingCredits,
    type QvAllocationChange,
  } from "$logic/agora/qv-allocation.js";
  import QvBallot from "$ui/agora/qv-ballot.svelte";
  import type { QvAllocationView } from "$ui/agora/view-types.js";

  import type { QvAllocationEditorProps } from "./view-types.js";

  let {
    rows,
    totalCredits = 100,
    voteLimit,
    disabled = false,
    onread,
  }: QvAllocationEditorProps = $props();

  // Replacing the source rows resets the local draft; closing only locks it.
  let draft = $derived(rows.map((row) => ({ ...row })));
  const remainingCredits = $derived(
    getRemainingCredits({ rows: draft, totalCredits }),
  );
  const remainingPercent = $derived(
    totalCredits > 0 ? (remainingCredits / totalCredits) * 100 : 0,
  );
  const displayRows = $derived(
    draft.map((row): QvAllocationView => {
      const cost = row.votes ** 2;
      return {
        ...row,
        votes: row.votes < 0 ? `−${Math.abs(row.votes)}` : String(row.votes),
        credits: `${cost} ${cost === 1 ? "credit" : "credits"}`,
        squarePercent:
          totalCredits > 0
            ? (Math.abs(row.votes) / Math.sqrt(totalCredits)) * 100
            : 0,
        tone:
          row.votes > 0 ? "support" : row.votes < 0 ? "opposition" : "neutral",
        fewerDisabled: !canChangeAllocation({
          votes: row.votes,
          direction: "fewer",
          remainingCredits,
          voteLimit,
        }),
        moreDisabled: !canChangeAllocation({
          votes: row.votes,
          direction: "more",
          remainingCredits,
          voteLimit,
        }),
      };
    }),
  );

  function changeAllocation({ id, direction }: QvAllocationChange): void {
    if (disabled) return;
    const row = draft.find((item) => item.id === id);
    if (
      !row ||
      !canChangeAllocation({
        votes: row.votes,
        direction,
        remainingCredits,
        voteLimit,
      })
    ) {
      return;
    }
    draft = draft.map((item) =>
      item.id === id
        ? { ...item, votes: item.votes + (direction === "more" ? 1 : -1) }
        : item,
    );
  }
</script>

<QvBallot
  rows={displayRows}
  remaining={`${remainingCredits} / ${totalCredits} credits remaining`}
  {remainingPercent}
  {disabled}
  {onread}
  onallocationchange={changeAllocation}
/>
