import type { QueryClient } from "@tanstack/vue-query";
import type { UserVote } from "src/composables/opinion/types";
import type { CastVoteResponse } from "src/shared/types/dto";

import type { VoteCacheSnapshot } from "./voteCache";

export interface VoteSubmission {
  readonly snapshot: VoteCacheSnapshot;
  readonly isLatest: () => boolean;
  readonly confirm: () => void;
  readonly confirmedVote: () => UserVote | undefined;
}

type VoteResult = CastVoteResponse | undefined;

interface QueuedVote {
  readonly snapshot: VoteCacheSnapshot;
  readonly execute: (submission: VoteSubmission) => Promise<VoteResult>;
  readonly resolve: (result: VoteResult) => void;
  readonly reject: (error: unknown) => void;
}

interface StatementSubmissions {
  latest: VoteCacheSnapshot;
  confirmed: UserVote | undefined;
  pending: QueuedVote | undefined;
  isSameViewer: () => boolean;
}

function createVoteSubmissionQueue() {
  const statements = new Map<string, Set<StatementSubmissions>>();
  const sessionId = crypto.randomUUID();
  let nextSequence = 0;

  function nextAction() {
    // Global monotonic order also orders each statement, without retaining an
    // ever-growing map of every statement visited during the app's lifetime.
    return { sessionId, sequence: ++nextSequence };
  }

  async function drain({
    key,
    state,
    task,
  }: {
    key: string;
    state: StatementSubmissions;
    task: QueuedVote;
  }): Promise<void> {
    let current: QueuedVote | undefined = task;
    while (current !== undefined) {
      const { snapshot } = current;
      const isLatest = () => state.latest === snapshot;
      try {
        const result = await current.execute({
          snapshot,
          isLatest,
          confirm: () => {
            state.confirmed = snapshot.after;
          },
          confirmedVote: () => state.confirmed,
        });
        current.resolve(isLatest() ? result : undefined);
      } catch (error) {
        if (isLatest()) current.reject(error);
        else current.resolve(undefined);
      }
      current = state.pending;
      state.pending = undefined;
    }
    const viewers = statements.get(key);
    viewers?.delete(state);
    if (viewers?.size === 0) statements.delete(key);
  }

  function submit({
    conversationSlugId,
    snapshot,
    isSameViewer,
    execute,
  }: {
    conversationSlugId: string;
    snapshot: VoteCacheSnapshot;
    isSameViewer: () => boolean;
    execute: QueuedVote["execute"];
  }): Promise<VoteResult> {
    const key = JSON.stringify([conversationSlugId, snapshot.opinionSlugId]);
    return new Promise((resolve, reject) => {
      const task: QueuedVote = { snapshot, execute, resolve, reject };
      const viewers = statements.get(key) ?? new Set<StatementSubmissions>();
      const previous = Array.from(viewers).find((state) =>
        state.isSameViewer()
      );
      if (previous !== undefined) {
        previous.latest = snapshot;
        previous.isSameViewer = isSameViewer;
        previous.pending?.resolve(undefined);
        previous.pending = task;
      } else {
        const state: StatementSubmissions = {
          latest: snapshot,
          confirmed: snapshot.before,
          pending: undefined,
          isSameViewer,
        };
        viewers.add(state);
        statements.set(key, viewers);
        void drain({ key, state, task });
      }
    });
  }

  return { submit, nextAction };
}

// QueryClient ownership shares ordering across mounted views without sharing
// pending votes between independent app/test instances or retaining clients.
const queues = new WeakMap<
  QueryClient,
  ReturnType<typeof createVoteSubmissionQueue>
>();

export function getVoteSubmissionQueue(queryClient: QueryClient) {
  const existing = queues.get(queryClient);
  if (existing !== undefined) return existing;
  const queue = createVoteSubmissionQueue();
  queues.set(queryClient, queue);
  return queue;
}
