import type { DisplayedOpinionItem } from "src/shared/types/zod";
import { describe, expect, it } from "vitest";

import { usePolisVotingSession } from "./usePolisVotingSession";

const statement: DisplayedOpinionItem = {
  opinionSlugId: "opinion", opinion: "A statement", username: "author", sourceLanguageCode: "en",
  createdAt: new Date(), updatedAt: new Date(), numParticipants: 0,
  numAgrees: 0, numDisagrees: 0, numPasses: 0, isSeed: false,
  moderation: { status: "unmoderated" },
  displayContent: { sourceVersion: "source", status: "available", mode: "original", content: { content: "A statement" }, translationControl: null },
};

function votedSession() {
  const session = usePolisVotingSession();
  session.acceptQueryResult({ status: "ready", opinion: statement, remainingCount: 1 });
  session.prepareVote({ opinionSlugId: statement.opinionSlugId, voteAction: "agree", previousVote: undefined })?.confirm();
  session.acceptQueryResult({ status: "caught_up", remainingCount: 0 });
  return session;
}

describe("atomic Polis session state", () => {
  it("records cancellation as an undoable action without advancing away from the statement", () => {
    const session = usePolisVotingSession();
    session.acceptQueryResult({ status: "ready", opinion: statement, remainingCount: 1 });
    const cancel = session.prepareVote({ opinionSlugId: statement.opinionSlugId, voteAction: "cancel", previousVote: "agree" });
    cancel?.confirm();
    expect(session.currentOpinion.value).toEqual(statement);
    expect(session.hasPendingWrites.value).toBe(true);
    expect(session.canUndo.value).toBe(true);
    expect(session.isAdvancing.value).toBe(false);
    expect(session.prepareUndo()?.params.voteAction).toBe("agree");
  });

  it("does not let an old reconciliation acknowledge a later cancellation of the same statement", () => {
    const session = votedSession();
    session.prepareUndo();
    const oldRead = session.capturePendingWrites();
    session.prepareVote({ opinionSlugId: statement.opinionSlugId, voteAction: "agree", previousVote: undefined })?.confirm();
    session.acceptQueryResult({ status: "caught_up", remainingCount: 0 });
    session.prepareUndo();
    expect(session.confirmPendingWrites({ votes: [], captured: oldRead })).toBe(false);
    expect(session.hasPendingWrites.value).toBe(true);
    expect(session.confirmPendingWrites({ votes: [], captured: session.capturePendingWrites() })).toBe(true);
  });

  it("preserves a simultaneously authored statement's exclusion when Undo fails", () => {
    const session = votedSession();
    const undo = session.prepareUndo();
    session.excludeCreatedOpinion("created");
    undo?.rollback();
    expect(session.currentOpinion.value).toBeUndefined();
    expect(session.remainingCount.value).toBe(0);
    expect(session.canUndo.value).toBe(true);
    expect(session.excludedOpinionSlugIds.value).toContain("created");
  });

  it("does not resurrect a discarded statement or another session through a late rollback", () => {
    const session = votedSession();
    const undo = session.prepareUndo();
    session.discard(opinion => opinion.opinionSlugId === statement.opinionSlugId);
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
});
