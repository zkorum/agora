import type {
  OpinionVoteParams,
  UserVote,
} from "src/composables/opinion/types";
import type { FetchNextUnansweredOpinionResponse } from "src/shared/types/dto";
import type { DisplayedOpinionItem, VotingOption } from "src/shared/types/zod";
import { computed, shallowRef } from "vue";

// The next-unanswered endpoint accepts at most 100 exclusions.
const MAX_FETCH_EXCLUSIONS = 100;
const MAX_IN_FLIGHT_ACTIONS = 4;
export type VoteRecoveryFeedback = "changed" | "unconfirmed" | "unavailable";

interface RecoveryEntry {
  readonly entry: HistoryEntry;
  readonly feedback: "changed" | "unconfirmed";
}

interface StatementState {
  opinion: DisplayedOpinionItem;
  vote: VotingOption | undefined;
}

type NextOpinion =
  | { kind: "unfetched" }
  | { kind: "ready"; opinion: DisplayedOpinionItem }
  | { kind: "caught_up" };

type FeedState =
  | { kind: "waiting"; previousOpinion: DisplayedOpinionItem | undefined }
  | { kind: "ready"; current: StatementState; next: NextOpinion }
  | { kind: "caught_up" };

interface HistoryEntry {
  readonly id: number;
  opinion: DisplayedOpinionItem;
  before: VotingOption | undefined;
  after: VotingOption | undefined;
}

interface PendingWrite {
  readonly expectedVote: VotingOption | undefined;
}

interface SessionState {
  feed: FeedState;
  remaining: number | undefined;
  history: readonly HistoryEntry[];
  revisit: readonly StatementState[];
  exclusions: readonly string[];
  pending: ReadonlyMap<string, PendingWrite>;
  inFlight: readonly HistoryEntry[];
  recoveries: ReadonlyMap<string, RecoveryEntry>;
  feedback: ReadonlyMap<string, VoteRecoveryFeedback>;
  skippedFeedback: number;
}

export interface FetchedPolisOpinion {
  readonly response: FetchNextUnansweredOpinionResponse;
  readonly excludedOpinionSlugIds: readonly string[];
}

function emptySession(): SessionState {
  return {
    feed: { kind: "waiting", previousOpinion: undefined },
    remaining: undefined,
    history: [],
    revisit: [],
    exclusions: [],
    pending: new Map(),
    inFlight: [],
    recoveries: new Map(),
    feedback: new Map(),
    skippedFeedback: 0,
  };
}

function currentStatement(feed: FeedState): StatementState | undefined {
  return feed.kind === "ready" ? feed.current : undefined;
}

function heldUnansweredIds(state: SessionState): Set<string> {
  const ids = new Set(
    state.revisit
      .filter((item) => item.vote === undefined)
      .map((item) => item.opinion.opinionSlugId)
  );
  if (state.feed.kind === "ready") {
    if (state.feed.current.vote === undefined)
      ids.add(state.feed.current.opinion.opinionSlugId);
    if (state.feed.next.kind === "ready")
      ids.add(state.feed.next.opinion.opinionSlugId);
  }
  return ids;
}

function advanceFeed({
  feed,
  revisit,
  previousOpinion,
}: {
  feed: FeedState;
  revisit: readonly StatementState[];
  previousOpinion: DisplayedOpinionItem | undefined;
}): { feed: FeedState; revisit: readonly StatementState[] } {
  const next: NextOpinion =
    feed.kind === "ready" ? feed.next : { kind: "unfetched" };
  const revisited = revisit.at(-1);
  if (revisited !== undefined)
    return {
      feed: { kind: "ready", current: revisited, next },
      revisit: revisit.slice(0, -1),
    };
  if (next.kind === "ready")
    return {
      feed: {
        kind: "ready",
        current: { opinion: next.opinion, vote: undefined },
        next: { kind: "unfetched" },
      },
      revisit,
    };
  return {
    feed:
      next.kind === "caught_up"
        ? { kind: "caught_up" }
        : { kind: "waiting", previousOpinion },
    revisit,
  };
}

function withExclusion({
  exclusions,
  id,
}: {
  exclusions: readonly string[];
  id: string;
}): string[] {
  return [
    ...exclusions
      .filter((existing) => existing !== id)
      .slice(-(MAX_FETCH_EXCLUSIONS - 1)),
    id,
  ];
}

function excludeOpinions({
  state,
  ids,
}: {
  state: SessionState;
  ids: ReadonlySet<string>;
}): SessionState {
  let feed = state.feed;
  let revisit: readonly StatementState[] = state.revisit.filter(
    (item) => !ids.has(item.opinion.opinionSlugId)
  );
  if (feed.kind === "ready") {
    if (feed.next.kind === "ready" && ids.has(feed.next.opinion.opinionSlugId))
      feed = { ...feed, next: { kind: "unfetched" } };
    if (ids.has(feed.current.opinion.opinionSlugId)) {
      const advanced = advanceFeed({
        feed,
        revisit,
        previousOpinion: undefined,
      });
      feed = advanced.feed;
      revisit = advanced.revisit;
    }
  } else if (
    feed.kind === "waiting" &&
    feed.previousOpinion !== undefined &&
    ids.has(feed.previousOpinion.opinionSlugId)
  ) {
    feed = { kind: "waiting", previousOpinion: undefined };
  }
  const removedUnanswered = [...heldUnansweredIds(state)].filter((id) =>
    ids.has(id)
  ).length;
  return {
    ...state,
    feed,
    revisit,
    remaining:
      state.remaining === undefined
        ? undefined
        : Math.max(0, state.remaining - removedUnanswered),
    exclusions: [...new Set([...state.exclusions, ...ids])].slice(
      -MAX_FETCH_EXCLUSIONS
    ),
  };
}

function adjustRemaining({
  count,
  before,
  after,
}: {
  count: number | undefined;
  before: VotingOption | undefined;
  after: VotingOption | undefined;
}): number | undefined {
  if (count === undefined) return undefined;
  return Math.max(
    0,
    count + Number(after === undefined) - Number(before === undefined)
  );
}

export function usePolisVotingSession() {
  const state = shallowRef<SessionState>(emptySession());
  let generation = 0;
  let undoGeneration = 0;
  let nextActionId = 0;

  function acceptFetchedOpinion({
    response,
    excludedOpinionSlugIds,
  }: FetchedPolisOpinion): void {
    const previous = state.value;
    if (
      response.status === "ready" &&
      (currentStatement(previous.feed)?.opinion.opinionSlugId ===
        response.opinion.opinionSlugId ||
        previous.exclusions.includes(response.opinion.opinionSlugId) ||
        previous.revisit.some(
          (item) =>
            item.opinion.opinionSlugId === response.opinion.opinionSlugId
        ))
    )
      return;

    const current = currentStatement(previous.feed);
    const requestedExclusions = new Set(excludedOpinionSlugIds);
    const reservedUnanswered = [current, ...previous.revisit].filter(
      (item) =>
        item !== undefined &&
        item.vote === undefined &&
        requestedExclusions.has(item.opinion.opinionSlugId)
    ).length;
    let feed: FeedState;
    if (previous.feed.kind === "ready") {
      feed = {
        ...previous.feed,
        next:
          response.status === "ready"
            ? { kind: "ready", opinion: response.opinion }
            : { kind: "caught_up" },
      };
    } else {
      feed =
        response.status === "ready"
          ? {
              kind: "ready",
              current: { opinion: response.opinion, vote: undefined },
              next: { kind: "unfetched" },
            }
          : { kind: "caught_up" };
    }
    const nextState = { ...previous, feed };
    state.value = {
      ...nextState,
      // Only add held statements actually excluded by this particular request.
      remaining:
        previous.pending.size === 0 &&
        previous.inFlight.length === 0 &&
        previous.recoveries.size === 0
          ? response.remainingCount + reservedUnanswered
          : previous.remaining === undefined
            ? undefined
            : Math.max(previous.remaining, heldUnansweredIds(nextState).size),
    };
  }

  function prepareVote({
    opinionSlugId,
    voteAction,
    sourceVersion,
    previousVote,
  }: OpinionVoteParams & { previousVote: VotingOption | undefined }) {
    const current = currentStatement(state.value.feed);
    if (
      current?.opinion.opinionSlugId !== opinionSlugId ||
      current.opinion.displayContent.sourceVersion !== sourceVersion ||
      state.value.inFlight.some(
        (entry) => entry.opinion.opinionSlugId === opinionSlugId
      ) ||
      state.value.inFlight.length + state.value.recoveries.size >=
        MAX_IN_FLIGHT_ACTIONS
    )
      return undefined;
    const actionGeneration = generation;
    const previousPending = state.value.pending.get(opinionSlugId);
    const after = voteAction === "cancel" ? undefined : voteAction;
    const params: OpinionVoteParams = {
      opinionSlugId,
      voteAction,
      sourceVersion,
    };
    const entry: HistoryEntry = {
      id: ++nextActionId,
      opinion: current.opinion,
      before: previousVote,
      after,
    };
    let applied = false;
    const apply = () => {
      if (applied || generation !== actionGeneration) return;
      applied = true;
      const previous = state.value;
      const pending = new Map(previous.pending);
      const history = [...previous.history, entry];
      const remaining = adjustRemaining({
        count: previous.remaining,
        before: previousVote,
        after,
      });
      if (after === undefined) {
        pending.set(opinionSlugId, { expectedVote: undefined });
        state.value = {
          ...previous,
          feed: {
            kind: "ready",
            current: { opinion: current.opinion, vote: undefined },
            next:
              previous.feed.kind === "ready"
                ? previous.feed.next
                : { kind: "unfetched" },
          },
          history,
          remaining,
          pending,
          exclusions: previous.exclusions.filter((id) => id !== opinionSlugId),
        };
      } else {
        pending.delete(opinionSlugId);
        state.value = {
          ...previous,
          ...advanceFeed({
            feed: previous.feed,
            revisit: previous.revisit,
            previousOpinion: current.opinion,
          }),
          history,
          remaining,
          pending,
          exclusions: withExclusion({
            exclusions: previous.exclusions,
            id: opinionSlugId,
          }),
        };
      }
    };
    return {
      params,
      optimistic: () => {
        if (applied || generation !== actionGeneration) return false;
        apply();
        state.value = {
          ...state.value,
          inFlight: [...state.value.inFlight, entry],
        };
        return true;
      },
      confirm: () => {
        if (generation !== actionGeneration) return;
        if (applied && !state.value.inFlight.includes(entry)) return;
        apply();
        state.value = {
          ...state.value,
          inFlight: state.value.inFlight.filter((pending) => pending !== entry),
        };
      },
      reject: (feedback: "changed" | "unconfirmed" | "blocked") => {
        if (
          !applied ||
          generation !== actionGeneration ||
          !state.value.inFlight.includes(entry)
        )
          return;
        const previous = state.value;
        const recoveries = new Map(previous.recoveries);
        const pending = new Map(previous.pending);
        if (previousPending === undefined) pending.delete(opinionSlugId);
        else pending.set(opinionSlugId, previousPending);
        if (feedback !== "blocked")
          recoveries.set(opinionSlugId, { entry, feedback });
        state.value = {
          ...previous,
          inFlight: previous.inFlight.filter((pending) => pending !== entry),
          history: previous.history.filter((item) => item !== entry),
          remaining: adjustRemaining({
            count: previous.remaining,
            before: after,
            after: previousVote,
          }),
          recoveries,
          pending,
          exclusions:
            feedback === "blocked"
              ? previous.exclusions.filter((id) => id !== opinionSlugId)
              : previous.exclusions,
        };
      },
    };
  }

  function acceptRecoveredOpinions({
    opinions,
    captured,
  }: {
    opinions: readonly DisplayedOpinionItem[];
    captured: ReadonlyMap<string, RecoveryEntry>;
  }): void {
    const byId = new Map(
      opinions.map((opinion) => [opinion.opinionSlugId, opinion])
    );
    for (const [id, recovery] of captured) {
      if (state.value.recoveries.get(id)?.entry.id !== recovery.entry.id)
        continue;
      const previous = state.value;
      const recoveries = new Map(previous.recoveries);
      recoveries.delete(id);
      const opinion = byId.get(id);
      const feedback = new Map(previous.feedback);
      let feed = previous.feed;
      let revisit = previous.revisit;
      if (opinion !== undefined) {
        feedback.set(id, recovery.feedback);
        const restored: StatementState = {
          opinion,
          vote: recovery.entry.before,
        };
        if (feed.kind === "ready")
          revisit = [
            ...revisit.filter((item) => item.opinion.opinionSlugId !== id),
            restored,
          ];
        else
          feed = {
            kind: "ready",
            current: restored,
            next: { kind: "unfetched" },
          };
      }
      state.value = {
        ...previous,
        feed,
        revisit,
        recoveries,
        feedback,
        remaining:
          opinion === undefined &&
          recovery.entry.before === undefined &&
          previous.remaining !== undefined
            ? Math.max(0, previous.remaining - 1)
            : previous.remaining,
        exclusions:
          opinion === undefined
            ? previous.exclusions
            : previous.exclusions.filter((existing) => existing !== id),
        skippedFeedback:
          previous.skippedFeedback + Number(opinion === undefined),
      };
    }
  }

  function takeFeedback(): VoteRecoveryFeedback | undefined {
    const previous = state.value;
    const id = currentStatement(previous.feed)?.opinion.opinionSlugId;
    const message = id === undefined ? undefined : previous.feedback.get(id);
    if (message !== undefined && id !== undefined) {
      const feedback = new Map(previous.feedback);
      feedback.delete(id);
      state.value = { ...previous, feedback };
      return message;
    }
    if (previous.skippedFeedback > 0) {
      state.value = { ...previous, skippedFeedback: 0 };
      return "unavailable";
    }
    return undefined;
  }

  function prepareUndo() {
    const previous = state.value;
    const entry = previous.history.at(-1);
    if (entry === undefined || previous.inFlight.includes(entry))
      return undefined;
    const actionGeneration = generation;
    const capturedUndoGeneration = undoGeneration;
    const id = entry.opinion.opinionSlugId;
    const pending = new Map(previous.pending);
    pending.set(id, { expectedVote: entry.before });
    const current = currentStatement(previous.feed);
    const revisit =
      current !== undefined && current.opinion.opinionSlugId !== id
        ? [...previous.revisit, current]
        : previous.revisit;
    state.value = {
      ...previous,
      feed: {
        kind: "ready",
        current: { opinion: entry.opinion, vote: entry.before },
        next:
          previous.feed.kind === "ready"
            ? previous.feed.next
            : previous.feed.kind === "caught_up"
              ? { kind: "caught_up" }
              : { kind: "unfetched" },
      },
      revisit,
      pending,
      history: previous.history.slice(0, -1),
      remaining: adjustRemaining({
        count: previous.remaining,
        before: entry.after,
        after: entry.before,
      }),
      exclusions: previous.exclusions.filter((existing) => existing !== id),
    };
    const params: OpinionVoteParams = {
      opinionSlugId: id,
      voteAction: entry.before ?? "cancel",
      sourceVersion: entry.opinion.displayContent.sourceVersion,
    };
    return {
      params,
      rollback: () => {
        if (
          generation !== actionGeneration ||
          undoGeneration !== capturedUndoGeneration
        )
          return;
        // Statement submission can exclude an auto-agreed item while Undo is pending.
        const addedExclusions = new Set(
          state.value.exclusions.filter(
            (id) => !previous.exclusions.includes(id)
          )
        );
        let restored =
          addedExclusions.size === 0
            ? previous
            : excludeOpinions({ state: previous, ids: addedExclusions });
        // Keep a refill received during Undo instead of restoring an obsolete end marker.
        const observedFeed = state.value.feed;
        if (observedFeed.kind === "ready") {
          const advanced =
            restored.feed.kind === "ready"
              ? {
                  feed: { ...restored.feed, next: observedFeed.next },
                  revisit: restored.revisit,
                }
              : advanceFeed({
                  feed: observedFeed,
                  revisit: restored.revisit,
                  previousOpinion:
                    restored.feed.kind === "waiting"
                      ? restored.feed.previousOpinion
                      : undefined,
                });
          restored = { ...restored, ...advanced };
          if (restored.remaining !== undefined)
            restored = {
              ...restored,
              remaining: Math.max(
                restored.remaining,
                heldUnansweredIds(restored).size
              ),
            };
        }
        // Only undo this action's delta. Other votes can finish or enter recovery
        // while Undo is in flight; restoring the whole snapshot would revive them.
        const observed = state.value;
        const pending = new Map(observed.pending);
        const priorWrite = previous.pending.get(id);
        if (priorWrite === undefined) pending.delete(id);
        else pending.set(id, priorWrite);
        const restoredIds = new Set(
          restored.revisit.map((item) => item.opinion.opinionSlugId)
        );
        state.value = {
          ...restored,
          pending,
          inFlight: observed.inFlight,
          recoveries: observed.recoveries,
          feedback: observed.feedback,
          skippedFeedback: observed.skippedFeedback,
          history: [...observed.history, entry],
          remaining: adjustRemaining({
            count: observed.remaining,
            before: entry.before,
            after: entry.after,
          }),
          revisit: [
            ...restored.revisit,
            ...observed.revisit.filter(
              (item) =>
                !restoredIds.has(item.opinion.opinionSlugId) &&
                item.opinion.opinionSlugId !==
                  currentStatement(restored.feed)?.opinion.opinionSlugId
            ),
          ],
        };
      },
    };
  }

  function capturePendingWrites(): ReadonlyMap<string, PendingWrite> {
    return new Map(state.value.pending);
  }

  function confirmPendingWrites({
    votes,
    captured,
  }: {
    votes: readonly UserVote[];
    captured: ReadonlyMap<string, PendingWrite>;
  }): boolean {
    const byId = new Map(
      votes.map((vote) => [vote.opinionSlugId, vote.votingAction])
    );
    const pending = new Map(state.value.pending);
    for (const [id, write] of captured) {
      if (pending.get(id) === write && byId.get(id) === write.expectedVote)
        pending.delete(id);
    }
    state.value = { ...state.value, pending };
    return pending.size === 0;
  }

  function refresh({ preserveCurrent }: { preserveCurrent: boolean }): void {
    const previous = state.value;
    const preserve =
      previous.feed.kind === "ready" &&
      (preserveCurrent ||
        previous.pending.size > 0 ||
        previous.inFlight.length > 0 ||
        previous.recoveries.size > 0);
    state.value = {
      ...previous,
      feed:
        preserve && previous.feed.kind === "ready"
          ? {
              ...previous.feed,
              next:
                previous.feed.next.kind === "caught_up"
                  ? { kind: "unfetched" }
                  : previous.feed.next,
            }
          : { kind: "waiting", previousOpinion: undefined },
    };
  }

  function excludeCreatedOpinion(id: string): void {
    state.value = excludeOpinions({ state: state.value, ids: new Set([id]) });
  }

  function updateCurrentOpinion(opinion: DisplayedOpinionItem): void {
    const feed = state.value.feed;
    if (
      feed.kind === "ready" &&
      feed.current.opinion.opinionSlugId === opinion.opinionSlugId
    )
      state.value = {
        ...state.value,
        feed: { ...feed, current: { ...feed.current, opinion } },
      };
  }

  function discard(matches: (opinion: DisplayedOpinionItem) => boolean): void {
    undoGeneration += 1;
    const previous = state.value;
    const known = [
      ...previous.history.map((entry) => entry.opinion),
      ...previous.revisit.map((item) => item.opinion),
      ...[...previous.recoveries.values()].map(
        (recovery) => recovery.entry.opinion
      ),
    ];
    const feed = previous.feed;
    if (feed.kind === "ready") {
      known.push(feed.current.opinion);
      if (feed.next.kind === "ready") known.push(feed.next.opinion);
    } else if (feed.kind === "waiting" && feed.previousOpinion !== undefined) {
      known.push(feed.previousOpinion);
    }
    const removed = new Set(
      known.filter(matches).map((opinion) => opinion.opinionSlugId)
    );
    const pending = new Map(previous.pending);
    for (const id of removed) pending.delete(id);
    const recoveries = new Map(previous.recoveries);
    const feedback = new Map(previous.feedback);
    for (const id of removed) {
      recoveries.delete(id);
      feedback.delete(id);
    }
    state.value = {
      ...excludeOpinions({ state: previous, ids: removed }),
      pending,
      recoveries,
      feedback,
      inFlight: previous.inFlight.filter(
        (entry) => !removed.has(entry.opinion.opinionSlugId)
      ),
      history: previous.history.filter(
        (entry) => !removed.has(entry.opinion.opinionSlugId)
      ),
    };
  }

  function reset(): void {
    generation += 1;
    state.value = emptySession();
  }

  return {
    currentOpinion: computed(() => currentStatement(state.value.feed)?.opinion),
    previousOpinion: computed(() =>
      state.value.feed.kind === "waiting"
        ? state.value.feed.previousOpinion
        : undefined
    ),
    remainingCount: computed(() => state.value.remaining),
    fetchExcludedOpinionSlugIds: computed(() => {
      const previous = state.value;
      const reserved = previous.revisit.map(
        (item) => item.opinion.opinionSlugId
      );
      const current = currentStatement(previous.feed);
      if (current !== undefined) reserved.push(current.opinion.opinionSlugId);
      return [...new Set([...previous.exclusions, ...reserved])]
        .slice(-MAX_FETCH_EXCLUSIONS)
        .sort();
    }),
    needsNextOpinion: computed(
      () =>
        state.value.feed.kind === "waiting" ||
        (state.value.feed.kind === "ready" &&
          state.value.feed.next.kind === "unfetched" &&
          state.value.revisit.length === 0)
    ),
    canUndo: computed(() => {
      const entry = state.value.history.at(-1);
      return entry !== undefined && !state.value.inFlight.includes(entry);
    }),
    hasInFlightActions: computed(() => state.value.inFlight.length > 0),
    isAtCapacity: computed(
      () =>
        state.value.inFlight.length + state.value.recoveries.size >=
        MAX_IN_FLIGHT_ACTIONS
    ),
    isCurrentOpinionPending: computed(() =>
      state.value.inFlight.some(
        (entry) =>
          entry.opinion.opinionSlugId ===
          currentStatement(state.value.feed)?.opinion.opinionSlugId
      )
    ),
    recoveries: computed(() => state.value.recoveries),
    currentFeedback: computed(() => {
      const id = currentStatement(state.value.feed)?.opinion.opinionSlugId;
      return id === undefined ? undefined : state.value.feedback.get(id);
    }),
    hasPendingWrites: computed(() => state.value.pending.size > 0),
    isWaitingForOpinion: computed(
      () =>
        state.value.feed.kind === "waiting" ||
        (state.value.feed.kind === "caught_up" &&
          (state.value.inFlight.length > 0 || state.value.recoveries.size > 0))
    ),
    isCaughtUp: computed(
      () =>
        state.value.feed.kind === "caught_up" &&
        state.value.inFlight.length === 0 &&
        state.value.recoveries.size === 0
    ),
    acceptFetchedOpinion,
    updateCurrentOpinion,
    prepareVote,
    prepareUndo,
    capturePendingWrites,
    confirmPendingWrites,
    acceptRecoveredOpinions,
    takeFeedback,
    refresh,
    excludeCreatedOpinion,
    discard,
    reset,
  };
}
