import type { FetchNextUnansweredOpinionResponse } from "src/shared/types/dto";
import type { DisplayedOpinionItem } from "src/shared/types/zod";
import { describe, expect, it } from "vitest";

import { usePolisVotingSession } from "./usePolisVotingSession";

const statement: DisplayedOpinionItem = {
  opinionSlugId: "opinion",
  opinion: "A statement",
  username: "author",
  sourceLanguageCode: "en",
  createdAt: new Date(),
  updatedAt: new Date(),
  numParticipants: 0,
  numAgrees: 0,
  numDisagrees: 0,
  numPasses: 0,
  isSeed: false,
  moderation: { status: "unmoderated" },
  displayContent: {
    sourceVersion: "source",
    status: "available",
    mode: "original",
    content: { content: "A statement" },
    translationControl: null,
  },
};

type Session = ReturnType<typeof usePolisVotingSession>;

function acceptResult({
  session,
  response,
  excludedOpinionSlugIds = session.fetchExcludedOpinionSlugIds.value,
}: {
  session: Session;
  response: FetchNextUnansweredOpinionResponse;
  excludedOpinionSlugIds?: readonly string[];
}): void {
  session.acceptFetchedOpinion({ response, excludedOpinionSlugIds });
}

function confirmVote({
  session,
  opinion,
}: {
  session: Session;
  opinion: DisplayedOpinionItem;
}): void {
  session
    .prepareVote({
      opinionSlugId: opinion.opinionSlugId,
      sourceVersion: opinion.displayContent.sourceVersion,
      voteAction: "agree",
      previousVote: undefined,
    })
    ?.confirm();
}

function votedSession(): Session {
  const session = usePolisVotingSession();
  acceptResult({
    session,
    response: { status: "ready", opinion: statement, remainingCount: 1 },
  });
  confirmVote({ session, opinion: statement });
  acceptResult({
    session,
    response: { status: "caught_up", remainingCount: 0 },
  });
  return session;
}

describe("atomic Polis session state", () => {
  it("advances immediately and allows another statement while an earlier vote is unresolved", () => {
    const session = usePolisVotingSession();
    acceptResult({
      session,
      response: { status: "ready", opinion: statement, remainingCount: 2 },
    });
    const second = { ...statement, opinionSlugId: "second" };
    acceptResult({
      session,
      response: { status: "ready", opinion: second, remainingCount: 1 },
    });
    const firstVote = session.prepareVote({
      opinionSlugId: statement.opinionSlugId,
      sourceVersion: "source",
      voteAction: "agree",
      previousVote: undefined,
    });
    expect(firstVote?.optimistic()).toBe(true);
    expect(session.currentOpinion.value).toEqual(second);
    expect(session.canUndo.value).toBe(false);
    expect(
      session.prepareVote({
        opinionSlugId: statement.opinionSlugId,
        sourceVersion: "source",
        voteAction: "agree",
        previousVote: undefined,
      })
    ).toBeUndefined();
    expect(
      session.prepareVote({
        opinionSlugId: second.opinionSlugId,
        sourceVersion: "source",
        voteAction: "agree",
        previousVote: undefined,
      })
    ).toBeDefined();
    firstVote?.confirm();
    expect(session.hasInFlightActions.value).toBe(false);
    expect(session.canUndo.value).toBe(true);
  });

  it("does not claim completion before the final Valkey acceptance response", () => {
    const session = usePolisVotingSession();
    acceptResult({
      session,
      response: { status: "ready", opinion: statement, remainingCount: 1 },
    });
    acceptResult({
      session,
      response: { status: "caught_up", remainingCount: 0 },
    });
    const vote = session.prepareVote({
      opinionSlugId: statement.opinionSlugId,
      sourceVersion: "source",
      voteAction: "agree",
      previousVote: undefined,
    });
    vote?.optimistic();
    expect(session.isCaughtUp.value).toBe(false);
    expect(session.isWaitingForOpinion.value).toBe(true);
    vote?.confirm();
    expect(session.isCaughtUp.value).toBe(true);
  });

  it("keeps the current statement stable and attaches rejection feedback to the later review", () => {
    const session = usePolisVotingSession();
    acceptResult({
      session,
      response: { status: "ready", opinion: statement, remainingCount: 2 },
    });
    const second = { ...statement, opinionSlugId: "second" };
    acceptResult({
      session,
      response: { status: "ready", opinion: second, remainingCount: 1 },
    });
    const vote = session.prepareVote({
      opinionSlugId: statement.opinionSlugId,
      sourceVersion: "source",
      voteAction: "agree",
      previousVote: undefined,
    });
    vote?.optimistic();
    vote?.reject("changed");
    const refreshed = {
      ...statement,
      displayContent: {
        ...statement.displayContent,
        sourceVersion: "new-source",
      },
    };
    session.acceptRecoveredOpinions({
      opinions: [refreshed],
      captured: session.recoveries.value,
    });
    expect(session.currentOpinion.value).toEqual(second);
    expect(session.takeFeedback()).toBeUndefined();
    confirmVote({ session, opinion: second });
    expect(session.currentOpinion.value).toEqual(refreshed);
    expect(session.takeFeedback()).toBe("changed");
    expect(session.takeFeedback()).toBeUndefined();
  });

  it("never resurrects a removed recovery through a late response", () => {
    const session = usePolisVotingSession();
    acceptResult({
      session,
      response: { status: "ready", opinion: statement, remainingCount: 1 },
    });
    const vote = session.prepareVote({
      opinionSlugId: statement.opinionSlugId,
      sourceVersion: "source",
      voteAction: "agree",
      previousVote: undefined,
    });
    vote?.optimistic();
    vote?.reject("changed");
    const captured = session.recoveries.value;
    session.discard((item) => item.opinionSlugId === statement.opinionSlugId);
    session.acceptRecoveredOpinions({ opinions: [statement], captured });
    expect(session.currentOpinion.value).toBeUndefined();
    expect(session.recoveries.value.size).toBe(0);
  });

  it("does not revive an earlier in-flight vote when a later Undo fails", () => {
    const session = usePolisVotingSession();
    acceptResult({
      session,
      response: { status: "ready", opinion: statement, remainingCount: 2 },
    });
    const second = { ...statement, opinionSlugId: "second" };
    acceptResult({
      session,
      response: { status: "ready", opinion: second, remainingCount: 1 },
    });
    const firstVote = session.prepareVote({
      opinionSlugId: statement.opinionSlugId,
      sourceVersion: "source",
      voteAction: "agree",
      previousVote: undefined,
    });
    firstVote?.optimistic();
    confirmVote({ session, opinion: second });
    const undo = session.prepareUndo();
    firstVote?.confirm();
    undo?.rollback();
    expect(session.hasInFlightActions.value).toBe(false);
  });

  it("updates edited content without advancing and does not let a stale response undo the edit", () => {
    const session = usePolisVotingSession();
    acceptResult({
      session,
      response: { status: "ready", opinion: statement, remainingCount: 1 },
    });
    const edited: DisplayedOpinionItem = {
      ...statement,
      opinion: "Edited statement",
      isEdited: true,
      displayContent: {
        ...statement.displayContent,
        sourceVersion: "edited-source",
      },
    };
    session.updateCurrentOpinion(edited);
    acceptResult({
      session,
      response: { status: "ready", opinion: statement, remainingCount: 1 },
      excludedOpinionSlugIds: [],
    });
    expect(session.currentOpinion.value?.opinion).toBe("Edited statement");
    expect(
      session.prepareVote({
        opinionSlugId: statement.opinionSlugId,
        sourceVersion: "edited-source",
        voteAction: "agree",
        previousVote: undefined,
      })?.params.sourceVersion
    ).toBe("edited-source");
  });

  it("records cancellation as an undoable action without advancing away from the statement", () => {
    const session = usePolisVotingSession();
    acceptResult({
      session,
      response: { status: "ready", opinion: statement, remainingCount: 1 },
    });
    session
      .prepareVote({
        opinionSlugId: statement.opinionSlugId,
        sourceVersion: statement.displayContent.sourceVersion,
        voteAction: "cancel",
        previousVote: "agree",
      })
      ?.confirm();
    expect(session.currentOpinion.value).toEqual(statement);
    expect(session.hasPendingWrites.value).toBe(true);
    expect(session.canUndo.value).toBe(true);
    expect(session.isWaitingForOpinion.value).toBe(false);
    expect(session.prepareUndo()?.params.voteAction).toBe("agree");
  });

  it("does not let an old reconciliation acknowledge a later cancellation of the same statement", () => {
    const session = votedSession();
    session.prepareUndo();
    const oldRead = session.capturePendingWrites();
    confirmVote({ session, opinion: statement });
    acceptResult({
      session,
      response: { status: "caught_up", remainingCount: 0 },
    });
    session.prepareUndo();
    expect(session.confirmPendingWrites({ votes: [], captured: oldRead })).toBe(
      false
    );
    expect(session.hasPendingWrites.value).toBe(true);
    expect(
      session.confirmPendingWrites({
        votes: [],
        captured: session.capturePendingWrites(),
      })
    ).toBe(true);
  });

  it("preserves a simultaneously authored statement's exclusion when Undo fails", () => {
    const session = votedSession();
    const undo = session.prepareUndo();
    session.excludeCreatedOpinion("created");
    undo?.rollback();
    expect(session.currentOpinion.value).toBeUndefined();
    expect(session.remainingCount.value).toBe(0);
    expect(session.canUndo.value).toBe(true);
    expect(session.fetchExcludedOpinionSlugIds.value).toContain("created");
  });

  it("does not resurrect a discarded statement or another session through a late rollback", () => {
    const session = votedSession();
    const undo = session.prepareUndo();
    session.discard(
      (opinion) => opinion.opinionSlugId === statement.opinionSlugId
    );
    undo?.rollback();
    expect(session.currentOpinion.value).toBeUndefined();
    expect(session.canUndo.value).toBe(false);
    const newSession = votedSession();
    const oldUndo = newSession.prepareUndo();
    newSession.reset();
    oldUndo?.rollback();
    expect(newSession.currentOpinion.value).toBeUndefined();
    expect(newSession.remainingCount.value).toBeUndefined();
  });

  it("does not restore an auto-agreed buffered statement when Undo fails", () => {
    const session = usePolisVotingSession();
    acceptResult({
      session,
      response: { status: "ready", opinion: statement, remainingCount: 3 },
    });
    const second = { ...statement, opinionSlugId: "second" };
    acceptResult({
      session,
      response: { status: "ready", opinion: second, remainingCount: 2 },
    });
    confirmVote({ session, opinion: statement });
    const created = { ...statement, opinionSlugId: "created" };
    acceptResult({
      session,
      response: { status: "ready", opinion: created, remainingCount: 1 },
    });
    const undo = session.prepareUndo();
    session.excludeCreatedOpinion("created");
    undo?.rollback();
    expect(session.remainingCount.value).toBe(1);
    confirmVote({ session, opinion: second });
    expect(session.currentOpinion.value).toBeUndefined();
    expect(session.needsNextOpinion.value).toBe(true);
  });

  it("removes discarded statements from the visible card, next slot, and waiting fallback", () => {
    const session = usePolisVotingSession();
    acceptResult({
      session,
      response: { status: "ready", opinion: statement, remainingCount: 2 },
    });
    const second = { ...statement, opinionSlugId: "second" };
    acceptResult({
      session,
      response: { status: "ready", opinion: second, remainingCount: 1 },
    });
    session.discard((opinion) => opinion.username === "author");
    expect(session.currentOpinion.value).toBeUndefined();
    expect(session.previousOpinion.value).toBeUndefined();
    expect(session.remainingCount.value).toBe(0);

    const third = { ...statement, opinionSlugId: "third" };
    acceptResult({
      session,
      response: { status: "ready", opinion: third, remainingCount: 1 },
    });
    confirmVote({ session, opinion: third });
    expect(session.previousOpinion.value).toEqual(third);
    session.discard((opinion) => opinion.opinionSlugId === "third");
    expect(session.previousOpinion.value).toBeUndefined();
  });

  it("counts only the held statements excluded by a bounded request after extensive Undo", () => {
    const session = usePolisVotingSession();
    const total = 102;
    for (let index = 0; index < total; index += 1) {
      const item = { ...statement, opinionSlugId: `statement-${index}` };
      acceptResult({
        session,
        response: {
          status: "ready",
          opinion: item,
          remainingCount: total - index,
        },
      });
      confirmVote({ session, opinion: item });
    }
    acceptResult({
      session,
      response: { status: "caught_up", remainingCount: 0 },
    });
    for (let index = 0; index < total; index += 1) session.prepareUndo();
    session.confirmPendingWrites({
      votes: [],
      captured: session.capturePendingWrites(),
    });
    expect(session.fetchExcludedOpinionSlugIds.value).toHaveLength(100);
    acceptResult({
      session,
      response: {
        status: "ready",
        opinion: { ...statement, opinionSlugId: "new" },
        remainingCount: 3,
      },
    });
    expect(session.remainingCount.value).toBe(103);
  });
});
