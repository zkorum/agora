import type { Dto } from "src/shared/types/dto";
import { describe, expect, it } from "vitest";
import type { z } from "zod";

import { useQvResponseState } from "./useQvResponseState";

const itemId = "proposal";
const sourceVersion = "00000000-0000-4000-8000-000000000001";
function saved({
  revision = 1,
  votes = 3,
}: { revision?: number; votes?: number } = {}) {
  return {
    revision,
    saved: {
      savedAt: new Date(),
      creditsSpent: votes ** 2,
      allocations: [{ itemId, sourceVersion, votes }],
    },
  };
}
function snapshot(
  response: z.infer<typeof Dto.qvSavedResponse> = { revision: 0 }
): z.infer<typeof Dto.qvLoadResponse> {
  return {
    statementSetRevision: 0,
    allowOpposition: true,
    isClosed: false,
    response,
    items: [
      {
        slugId: itemId,
        displayContent: {
          sourceVersion,
          status: "available",
          mode: "original",
          content: { title: "Proposal" },
          translationControl: null,
        },
      },
    ],
  };
}

describe("QV saved baseline and explicit commands", () => {
  it("updates translated display without discarding unsaved allocations or advancing source revisions", () => {
    const state = useQvResponseState();
    state.receive(snapshot(saved()));
    state.allocations.value = [{ itemId, votes: 5 }];
    const translated: z.infer<typeof Dto.qvLoadResponse> = {
      ...snapshot(saved()),
      items: [
        {
          slugId: itemId,
          displayContent: {
            sourceVersion,
            status: "available",
            mode: "translated",
            content: { title: "Proposition traduite" },
            translationControl: {
              status: "completed",
              alternateMode: "original",
              canRequestAlternate: true,
            },
          },
        },
      ],
    };
    state.receive(translated);
    expect(state.snapshot.value?.items[0]?.displayContent).toMatchObject({
      mode: "translated",
    });
    expect(state.allocations.value).toEqual([{ itemId, votes: 5 }]);
    expect(state.baseline.value.saved?.allocations[0]?.votes).toBe(3);
    expect(state.itemsChanged.value).toBe(false);
    expect(
      state.begin({ action: "save", conversationSlugId: "qvtest01" })?.request
    ).toMatchObject({
      expectedStatementSetRevision: 0,
      allocations: [{ itemId, sourceVersion, votes: 5 }],
    });
  });

  it("loads a saved response as a clean baseline and keeps local edits separate", () => {
    const state = useQvResponseState();
    state.receive(snapshot(saved()));
    expect(state.hasUnsavedChanges.value).toBe(false);
    expect(state.canSave.value).toBe(false);
    state.allocations.value = [{ itemId, votes: 5 }];
    expect(state.baseline.value.saved?.allocations[0]?.votes).toBe(3);
    expect(state.hasUnsavedChanges.value).toBe(true);
    expect(state.canSave.value).toBe(true);
    state.discard();
    expect(state.allocations.value).toEqual([{ itemId, votes: 3 }]);
    expect(state.hasUnsavedChanges.value).toBe(false);
  });
  it("treats clearing a saved response as dirty without allowing empty saves", () => {
    const state = useQvResponseState();
    state.receive(snapshot(saved()));
    state.allocations.value = [];
    expect(state.hasUnsavedChanges.value).toBe(true);
    expect(state.canSave.value).toBe(false);
    expect(
      state.begin({ action: "save", conversationSlugId: "qvtest01" })
    ).toBeUndefined();
    expect(
      state.begin({ action: "withdraw", conversationSlugId: "qvtest01" })
        ?.action
    ).toBe("withdraw");
  });
  it("updates the baseline only, preserving newer edits during a save", () => {
    const state = useQvResponseState();
    state.receive(snapshot());
    state.allocations.value = [{ itemId, votes: 3 }];
    const command = state.begin({
      action: "save",
      conversationSlugId: "qvtest01",
    });
    expect(command?.request).toMatchObject({
      expectedResponseRevision: 0,
      expectedStatementSetRevision: 0,
      allocations: [{ itemId, sourceVersion, votes: 3 }],
    });
    state.allocations.value = [{ itemId, votes: 4 }];
    state.accept(saved());
    expect(state.baseline.value.saved?.allocations[0]?.votes).toBe(3);
    expect(state.allocations.value).toEqual([{ itemId, votes: 4 }]);
    expect(state.hasUnsavedChanges.value).toBe(true);
    state.discard();
    expect(state.allocations.value).toEqual([{ itemId, votes: 3 }]);
  });
  it("retries the exact command after an uncertain result, not the newer local allocations", () => {
    const state = useQvResponseState();
    state.receive(snapshot());
    state.allocations.value = [{ itemId, votes: 3 }];
    const original = state.begin({
      action: "save",
      conversationSlugId: "qvtest01",
    });
    state.allocations.value = [{ itemId, votes: 4 }];
    expect(
      state.begin({ action: "save", conversationSlugId: "qvtest01" })
    ).toBe(original);
    state.discard();
    expect(state.allocations.value).toEqual([{ itemId, votes: 4 }]);
    state.accept(saved());
    expect(state.hasUnsavedChanges.value).toBe(true);
  });
  it("does not overwrite dirty state when another tab saves; discard explicitly adopts its baseline", () => {
    const state = useQvResponseState();
    state.receive(snapshot(saved()));
    state.allocations.value = [{ itemId, votes: 4 }];
    state.receive(snapshot(saved({ revision: 2, votes: 7 })));
    expect(state.conflict.value).toBe(true);
    expect(state.canSave.value).toBe(false);
    expect(state.baseline.value.revision).toBe(1);
    expect(state.allocations.value).toEqual([{ itemId, votes: 4 }]);
    state.discard();
    expect(state.allocations.value).toEqual([{ itemId, votes: 7 }]);
    expect(state.baseline.value.revision).toBe(2);
  });
  it("preserves stale statement snapshots until explicit discard and ignores late pre-save reads", () => {
    const state = useQvResponseState();
    state.receive(snapshot());
    state.allocations.value = [{ itemId, votes: 3 }];
    state.receive({ ...snapshot(), statementSetRevision: 1, items: [] });
    expect(state.itemsChanged.value).toBe(true);
    expect(state.snapshot.value?.items).toHaveLength(1);
    expect(state.canSave.value).toBe(false);
    state.discard();
    expect(state.snapshot.value?.items).toEqual([]);
    state.receive(snapshot());
    expect(state.snapshot.value?.statementSetRevision).toBe(1);
  });
  it("ignores late reads from before an accepted save", () => {
    const state = useQvResponseState();
    state.receive(snapshot());
    state.allocations.value = [{ itemId, votes: 3 }];
    state.begin({ action: "save", conversationSlugId: "qvtest01" });
    state.accept(saved());
    state.receive(snapshot());
    expect(state.baseline.value.revision).toBe(1);
    expect(state.allocations.value).toEqual([{ itemId, votes: 3 }]);
  });
  it.each([false, true])(
    "withdrawal clears only the sent edit generation (newer edits: %s)",
    (newerEdits) => {
      const state = useQvResponseState();
      state.receive(snapshot(saved()));
      state.begin({ action: "withdraw", conversationSlugId: "qvtest01" });
      if (newerEdits) state.allocations.value = [{ itemId, votes: 4 }];
      state.accept({ revision: 2 });
      expect(state.allocations.value).toEqual(
        newerEdits ? [{ itemId, votes: 4 }] : []
      );
      expect(state.baseline.value).toEqual({ revision: 2 });
      expect(state.hasUnsavedChanges.value).toBe(newerEdits);
    }
  );
  it("does not roll back a known newer server baseline on an old command receipt", () => {
    const state = useQvResponseState();
    state.receive(snapshot());
    state.allocations.value = [{ itemId, votes: 3 }];
    state.begin({ action: "save", conversationSlugId: "qvtest01" });
    state.receive(snapshot(saved({ revision: 2, votes: 7 })));
    state.receive(snapshot(saved()));
    state.accept(saved());
    expect(state.conflict.value).toBe(true);
    state.discard();
    expect(state.baseline.value.revision).toBe(2);
    expect(state.allocations.value).toEqual([{ itemId, votes: 7 }]);
  });
  it("clears a rejected command without discarding work or changing the baseline", () => {
    const state = useQvResponseState();
    state.receive(snapshot());
    state.allocations.value = [{ itemId, votes: 3 }];
    state.begin({ action: "save", conversationSlugId: "qvtest01" });
    state.reject("response_conflict");
    expect(state.pending.value).toBeUndefined();
    expect(state.conflict.value).toBe(true);
    expect(state.baseline.value.revision).toBe(0);
    expect(state.allocations.value).toEqual([{ itemId, votes: 3 }]);
  });
  it.each([false, true])(
    "settles a navigation discard without resurrecting local edits (newer edits: %s)",
    (newerEdits) => {
      const state = useQvResponseState();
      state.receive(snapshot());
      state.allocations.value = [{ itemId, votes: 3 }];
      state.begin({ action: "save", conversationSlugId: "qvtest01" });
      state.allocations.value = [{ itemId, votes: 4 }];
      state.discardForNavigation();
      expect(state.allocations.value).toEqual([]);
      if (newerEdits) state.allocations.value = [{ itemId, votes: 5 }];
      state.accept(saved());
      expect(state.allocations.value).toEqual([
        { itemId, votes: newerEdits ? 5 : 3 },
      ]);
      expect(state.hasUnsavedChanges.value).toBe(newerEdits);
    }
  );
});
