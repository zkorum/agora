import type { OpinionVoteParams, UserVote } from "src/composables/opinion/types";
import type { FetchNextUnansweredOpinionResponse } from "src/shared/types/dto";
import type { DisplayedOpinionItem, VotingOption } from "src/shared/types/zod";
import { computed, shallowRef } from "vue";

interface StatementState {
  opinion: DisplayedOpinionItem;
  vote: VotingOption | undefined;
}

interface HistoryEntry {
  opinion: DisplayedOpinionItem;
  before: VotingOption | undefined;
  after: VotingOption | undefined;
}

interface PendingWrite {
  readonly expectedVote: VotingOption | undefined;
}

interface SessionState {
  current: StatementState | undefined;
  remaining: number | undefined;
  history: readonly HistoryEntry[];
  revisit: readonly StatementState[];
  exclusions: readonly string[];
  pending: ReadonlyMap<string, PendingWrite>;
  preserveCurrent: boolean;
  advancing: boolean;
}

function emptySession(): SessionState {
  return {
    current: undefined, remaining: undefined, history: [], revisit: [],
    exclusions: [], pending: new Map(), preserveCurrent: false, advancing: false,
  };
}

function withExclusion({ exclusions, id }: { exclusions: readonly string[]; id: string }): string[] {
  return [...exclusions.filter(existing => existing !== id).slice(-98), id];
}

function adjustRemaining({ count, before, after }: {
  count: number | undefined;
  before: VotingOption | undefined;
  after: VotingOption | undefined;
}): number | undefined {
  if (count === undefined) return undefined;
  return Math.max(0, count + Number(after === undefined) - Number(before === undefined));
}

export function usePolisVotingSession() {
  const state = shallowRef<SessionState>(emptySession());
  let generation = 0;

  function acceptQueryResult(data: FetchNextUnansweredOpinionResponse): void {
    const previous = state.value;
    const current = previous.preserveCurrent && previous.current !== undefined
      ? previous.current
      : data.status === "ready" ? { opinion: data.opinion, vote: undefined } : undefined;
    state.value = {
      ...previous,
      current,
      remaining: previous.pending.size > 0 ? previous.remaining
        : current !== undefined && current.vote === undefined
          ? Math.max(data.remainingCount, 1) : data.remainingCount,
      advancing: false,
    };
  }

  function prepareVote({ opinionSlugId, voteAction, previousVote }: OpinionVoteParams & {
    previousVote: VotingOption | undefined;
  }) {
    const current = state.value.current;
    if (current?.opinion.opinionSlugId !== opinionSlugId) return undefined;
    const actionGeneration = generation;
    const after = voteAction === "cancel" ? undefined : voteAction;
    const params: OpinionVoteParams = { opinionSlugId, voteAction };
    return {
      params,
      confirm: () => {
        if (generation !== actionGeneration) return;
        const previous = state.value;
        const pending = new Map(previous.pending);
        const history = [...previous.history, { opinion: current.opinion, before: previousVote, after }];
        const remaining = adjustRemaining({ count: previous.remaining, before: previousVote, after });
        if (after === undefined) {
          pending.set(opinionSlugId, { expectedVote: undefined });
          state.value = {
            ...previous, current: { opinion: current.opinion, vote: undefined }, history,
            remaining, pending, advancing: false, preserveCurrent: true,
            exclusions: previous.exclusions.filter(id => id !== opinionSlugId),
          };
        } else {
          pending.delete(opinionSlugId);
          const next = previous.revisit.at(-1);
          state.value = {
            ...previous, current: next, history, remaining, pending,
            exclusions: withExclusion({ exclusions: previous.exclusions, id: opinionSlugId }),
            revisit: previous.revisit.slice(0, -1), preserveCurrent: next !== undefined,
            advancing: next === undefined,
          };
        }
      },
    };
  }

  function prepareUndo() {
    const previous = state.value;
    const entry = previous.history.at(-1);
    if (entry === undefined) return undefined;
    const actionGeneration = generation;
    const id = entry.opinion.opinionSlugId;
    const pending = new Map(previous.pending);
    pending.set(id, { expectedVote: entry.before });
    const revisit = previous.current !== undefined && previous.current.opinion.opinionSlugId !== id
      ? [...previous.revisit, previous.current] : previous.revisit;
    state.value = {
      ...previous, current: { opinion: entry.opinion, vote: entry.before }, revisit, pending,
      history: previous.history.slice(0, -1), advancing: false, preserveCurrent: true,
      remaining: adjustRemaining({ count: previous.remaining, before: entry.after, after: entry.before }),
      exclusions: previous.exclusions.filter(existing => existing !== id),
    };
    const params: OpinionVoteParams = { opinionSlugId: id, voteAction: entry.before ?? "cancel" };
    return {
      params,
      rollback: () => {
        if (generation !== actionGeneration) return;
        // A simultaneous statement submission may have added its auto-agreed ID.
        const addedExclusions = state.value.exclusions.filter(existing => !previous.exclusions.includes(existing));
        state.value = {
          ...previous,
          exclusions: [...new Set([...previous.exclusions, ...addedExclusions])],
        };
      },
    };
  }

  function capturePendingWrites(): ReadonlyMap<string, PendingWrite> {
    return new Map(state.value.pending);
  }

  function confirmPendingWrites({ votes, captured }: {
    votes: readonly UserVote[];
    captured: ReadonlyMap<string, PendingWrite>;
  }): boolean {
    const byId = new Map(votes.map(vote => [vote.opinionSlugId, vote.votingAction]));
    const pending = new Map(state.value.pending);
    for (const [id, write] of captured) {
      if (pending.get(id) === write && byId.get(id) === write.expectedVote) pending.delete(id);
    }
    state.value = { ...state.value, pending };
    return pending.size === 0;
  }

  function refresh({ preserveCurrent }: { preserveCurrent: boolean }): void {
    const previous = state.value;
    const preserve = previous.current !== undefined && (preserveCurrent || previous.pending.size > 0);
    state.value = {
      ...previous, preserveCurrent: preserve,
      current: preserve ? previous.current : undefined, advancing: !preserve,
    };
  }

  function excludeCreatedOpinion(id: string): void {
    const previous = state.value;
    const current = previous.current?.opinion.opinionSlugId === id ? undefined : previous.current;
    state.value = {
      ...previous, current, preserveCurrent: current !== undefined,
      exclusions: withExclusion({ exclusions: previous.exclusions, id }),
    };
  }

  function preserveCurrent(): void {
    state.value = { ...state.value, preserveCurrent: state.value.current !== undefined };
  }

  function discard(matches: (opinion: DisplayedOpinionItem) => boolean): void {
    generation += 1;
    const previous = state.value;
    const known = [...previous.history.map(entry => entry.opinion), ...previous.revisit.map(item => item.opinion)];
    if (previous.current !== undefined) known.push(previous.current.opinion);
    const removed = new Set(known.filter(matches).map(opinion => opinion.opinionSlugId));
    const pending = new Map(previous.pending);
    for (const id of removed) pending.delete(id);
    state.value = {
      ...previous, pending,
      current: previous.current !== undefined && !removed.has(previous.current.opinion.opinionSlugId) ? previous.current : undefined,
      history: previous.history.filter(entry => !removed.has(entry.opinion.opinionSlugId)),
      revisit: previous.revisit.filter(item => !removed.has(item.opinion.opinionSlugId)),
      exclusions: [...new Set([...previous.exclusions, ...removed])],
    };
  }

  function reset(): void {
    generation += 1;
    state.value = emptySession();
  }

  return {
    currentOpinion: computed(() => state.value.current?.opinion),
    remainingCount: computed(() => state.value.remaining),
    excludedOpinionSlugIds: computed(() => state.value.exclusions),
    canUndo: computed(() => state.value.history.length > 0),
    hasPendingWrites: computed(() => state.value.pending.size > 0),
    isAdvancing: computed(() => state.value.advancing),
    acceptQueryResult, prepareVote, prepareUndo, capturePendingWrites,
    confirmPendingWrites, refresh, excludeCreatedOpinion, preserveCurrent, discard, reset,
    finishLoading: () => { state.value = { ...state.value, advancing: false }; },
  };
}
