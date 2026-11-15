import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("QV command UUID browser compatibility", () => {
  it("creates distinct save and withdrawal IDs without native crypto.randomUUID", async () => {
    const nativeCrypto = globalThis.crypto;
    vi.stubGlobal("crypto", {
      getRandomValues: nativeCrypto.getRandomValues.bind(nativeCrypto),
    });
    vi.resetModules();
    const { useQvResponseState } = await import("./useQvResponseState");
    const state = useQvResponseState();
    const itemId = "proposal";
    const sourceVersion = "00000000-0000-4000-8000-000000000001";
    state.receive({
      statementSetRevision: 0,
      allowOpposition: true,
      isClosed: false,
      response: { revision: 0 },
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
    });
    state.allocations.value = [{ itemId, votes: 3 }];
    const save = state.begin({
      action: "save",
      conversationSlugId: "qvtest01",
    });
    expect(z.uuidv4().safeParse(save?.request.commandId).success).toBe(true);
    expect(
      state.begin({ action: "save", conversationSlugId: "qvtest01" })
    ).toBe(save);

    state.accept({
      revision: 1,
      saved: {
        savedAt: new Date(),
        creditsSpent: 9,
        allocations: [{ itemId, sourceVersion, votes: 3 }],
      },
    });
    const withdrawal = state.begin({
      action: "withdraw",
      conversationSlugId: "qvtest01",
    });
    expect(z.uuidv4().safeParse(withdrawal?.request.commandId).success).toBe(
      true
    );
    expect(withdrawal?.request.commandId).not.toBe(save?.request.commandId);
  });
});
