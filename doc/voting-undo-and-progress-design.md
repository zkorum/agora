# Voting Undo and progress design

## Implementation status

Implemented with a shared `VotingSessionToolbar` and `useVotingActionGuard`.
Polis uses session-local history, immediate card restoration, and background
confirmation of buffered cancellations. Prioritization retains its persisted
history, preserves candidate positions, and reconciles the engine with active
items without replacing a valid set being read. The findings below describe
the baseline that motivated these changes.

The follow-up review consolidated Polis state into `usePolisVotingSession` and
made buffered-vote reconciliation abortable with bounded exponential backoff.
Vote-cache updates now receive one typed viewer key from the mutation layer;
they do not infer identity by searching other caches. Guest creation transfers
anonymous votes to the guest cache and retires their anonymous source. Rollback
is statement-scoped and preserves newer votes and live count updates. Ranking
completion and progress use engine counters rather than enumerating all pairs
on every render.

## Decision

Use the same repeated **Undo** interaction for Polis one-at-a-time
voting and Best-Worst prioritization. Reuse the action coordination and toolbar;
keep the domain-specific histories and server operations separate.

The initial one-step Polis suggestion was a scope simplification, not a technical
restriction. The existing Polis `cancel` action can support repeated Undo.

## Baseline audited behavior

### Prioritization

- Each completed best/worst choice is an ordered comparison round.
- Undo removes the last round, replays the remaining comparisons to rebuild the
  ranking engine, restores the removed round's candidate set, and saves the
  shortened history.
- Repeated Undo is supported, including comparisons loaded from the backend.
- The displayed percentage is **resolved pairwise orderings / all possible
  pairwise orderings**, including orderings inferred through transitivity. It is
  not the percentage of votes or time remaining, or confidence in the result.

Relevant code: `MaxDiffVotingTab.vue`, `useMaxDiffQueries.ts`, and
`services/shared/src/utils/maxdiff.ts`.

### Polis one-at-a-time

- The API selects an unanswered statement rather than replaying an ordered task
  history.
- Votes are exposed to the frontend as statement/action mappings. The current
  response does not supply the chronological comparison history available for
  prioritization.
- A successful vote excludes that statement locally and requests the next one.
- The remaining count includes the current statement. It excludes answered,
  moderated, deleted, muted, and locally excluded statements.
- Result counts and percentages are hidden in this view; loading between
  statements is retained.
- Remaining counts now use the same compact formatter as the other counters:
  `1K`, `10K`, `1M`, `10M`.

## Findings from testing and source review

### 1. Repeated prioritization Undo has a write-ordering bug

Reproduced in a fresh browser session with controlled request delays:

1. Submit three comparison rounds.
2. Undo twice quickly: intended history length is one.
3. Delay the first Undo's request, containing two rounds.
4. The second request, containing one round, reaches the server first.
5. The delayed request then overwrites it with two rounds.

Observed: the engine displayed one round, the cache held two, and a reload
restored two. Database row locking serializes transactions but does not preserve
the order in which the user issued requests.

### 2. The percentage can display 100% before completion

The UI uses `Math.round(progress * 100)`. With 40 items, a test state containing
779 resolved pairs and one unresolved pair displayed 100%, while the engine
reported `complete === false`.

### 3. A refreshed item catalog does not rebase the ranking engine

Simulated a newly added item in the browser's item-query cache. The rendered
catalog grew from 40 to 41 items, but the initialized engine still contained 40
and did not include the new item. Initialization currently runs only once.

### 4. Undo availability causes avoidable layout changes

Prioritization conditionally mounts Undo with `v-if="canUndo"`. It disappears
during the ordinary transition and returns afterward. The completed-ranking
screen does not offer last-vote Undo; it offers only a full ranking restart.

### 5. The analysis caption is too strong

The current wording promises votes are immediately counted in the analysis.
Saving is synchronous, but community scoring and published analysis updates are
asynchronous. Prefer **Every vote contributes to the analysis**.

## Shared behavior

### Stable toolbar

- Keep the toolbar mounted during loading, transitions, caught-up states, and
  completion.
- Reserve the Undo button's space. Disable it when unavailable instead of
  mounting and unmounting it.
- Show **Undo** with the existing Undo icon. Each press reverses the latest
  remaining vote; repeated presses walk backward through the available history.
- Reuse Discover's button component, font, gradient color, rounded padding, and
  hover behavior, with the Undo icon before the label. Keep uniform 0.5rem gaps
  between Share, Discover, and Undo rows instead of stacking extra padding.
- On Undo, restore the previous statement or candidate set immediately, without
  adding a full-screen loading state.
- Keep Undo available after the final vote.
- Do not reveal community agreement percentages in Polis one-at-a-time voting.

Use the same toolbar placement, sizing, button, and loading/completion behavior
in both modes. Only the status metric differs:

- Polis: **18 remaining**, using compact numbers for large counts.
- Prioritization: **Ranking progress**, a progress bar, and the percentage.

Conceptually:

```text
Polis:           18 remaining                 ↶ Undo
Prioritization:  42% complete                 ↶ Undo
```

Per-statement agreement percentages are results, not progress, and remain hidden
in Polis one-at-a-time voting. A Polis completion percentage would require a
meaningful denominator over eligible statements, which can change as statements
are added or moderated. The remaining count avoids implying a fixed workload.

On caught-up/completed screens, keep the same toolbar and show the completed
status. Undo remains enabled while there is reversible history. Do not replace
last-action Undo with a full restart.

### One action coordinator

The shared action guard coordinates vote, Undo, and restart operations; each
domain adapter owns its correlated rollback snapshot:

1. Acquire the action lock before awaiting participation checks.
2. Capture one correlated rollback snapshot.
3. Apply the optimistic UI change.
4. Persist through the mode's existing mutation.
5. Reconcile from the confirmed response, or restore the snapshot on failure.
6. Release the lock.

Disable conflicting controls while a write is pending. Repeated Undo remains
available after each save settles, but overlapping full-history writes cannot
overtake one another. Guard keyboard and dialog callbacks as well as pointer
interaction; CSS pointer blocking alone is insufficient.

An account/conversation change must invalidate old action callbacks and history.
The anonymous-to-new-guest promotion must preserve them.

## Domain adapters

### Prioritization adapter

- Retain the existing persisted comparison history and engine replay.
- Restore the exact candidate set belonging to the removed round.
- Cache the confirmed next candidate sets returned by the save.
- Show at most 99% while incomplete; show 100% only when complete.
- Rebuild the engine from the current item catalog and retained comparisons at
  a safe transition boundary. Do not change a candidate's wording or selection
  while the user is choosing.
- Resolve newly routed candidate IDs against an up-to-date item catalog before
  presenting the next round.

### Polis adapter

- Record successfully accepted Agree, Disagree, and Unsure votes in a local
  ordered history, retaining the displayed statement snapshot.
- Undo submits `cancel` for the latest entry and restores its statement for a
  fresh choice.
- Repeated Undo walks backward through this voting session.
- Preserve history when visiting analysis and returning through KeepAlive;
  reset it on a real identity/conversation/order change.
- Statement submission is not a vote-history entry: Undo must not unexpectedly
  cancel the implicit auto-agree attached to a newly authored statement.
- Cancel or ignore obsolete next-statement requests so they cannot replace the
  restored card.
- Reconcile local exclusions and the remaining count with buffered persistence.
  Cancellation can be confirmed before replica reads reflect it; simply
  refetching is insufficient to guarantee the restored card remains visible.

Polis Undo history would initially be session-scoped. Matching prioritization's
cross-reload history requires a backend chronological history contract, including
distinguishing explicit votes from implicit auto-agrees. Do not infer history
from the ordering of a statement/action mapping.

## Acceptance checks

For both modes:

- First participation creates a guest without remounting the voting screen.
- Consecutive Undo operations remain consistent before and after refresh.
- A failed vote or Undo restores the previous view and does not corrupt history.
- Undo works after completion/caught-up and does not cause toolbar layout shifts.
- Account changes and obsolete async responses cannot update another session.
- Pointer, keyboard, and dialog actions obey the same pending-write guard.

Additionally for prioritization:

- Incomplete states never display 100%.
- Item additions/removals rebase the engine at a safe boundary.
- Undo restores the exact previous candidate set.

Additionally for Polis:

- Undo restores the exact previous statement without showing result percentages.
- Repeated Undo and subsequent re-voting do not lose unanswered statements.
- New statements can increase the remaining count without replacing the card
  currently being read.
- Buffered cancellation/replica lag cannot immediately skip the restored card.
- Authored statements do not unexpectedly become undoable votes.

## Implementation order

1. Introduce shared action coordination and fix prioritization write ordering.
2. Introduce the stable toolbar and completion-safe percentage presentation.
3. Handle prioritization item-catalog reconciliation.
4. Add the Polis history/cancellation adapter using the same coordinator and
   toolbar, then verify the acceptance checks above.
