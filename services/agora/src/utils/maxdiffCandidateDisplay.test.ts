import { describe, expect, it } from "vitest";

import {
  createMaxDiffCandidateDisplaySnapshot,
  type MaxDiffCandidateDisplayItem,
} from "./maxdiffCandidateDisplay";

function item({
  slugId,
  title,
  body = null,
}: {
  slugId: string;
  title: string;
  body?: string | null;
}): MaxDiffCandidateDisplayItem {
  return {
    slugId,
    title,
    body,
    displayContent: {
      sourceVersion: `00000000-0000-4000-8000-${slugId.padStart(12, "0")}`,
      status: "available",
      mode: "original",
      content: { title, bodyHtml: body ?? undefined },
      translationControl: null,
    },
    externalUrl: null,
  };
}

describe("createMaxDiffCandidateDisplaySnapshot", () => {
  it("keeps candidate order and copies current display content", () => {
    const source = new Map([
      ["a", item({ slugId: "a", title: "Original A" })],
      ["b", item({ slugId: "b", title: "Original B", body: "<p>Body B</p>" })],
    ]);

    const snapshot = createMaxDiffCandidateDisplaySnapshot({
      candidateSlugIds: ["b", "a"],
      itemBySlugId: source,
    });

    expect(snapshot.map((candidate) => candidate.slugId)).toEqual(["b", "a"]);
    expect(snapshot.map((candidate) => candidate.title)).toEqual([
      "Original B",
      "Original A",
    ]);
    expect(snapshot[0]?.body).toBe("<p>Body B</p>");
  });

  it("does not mutate when source items update after snapshot creation", () => {
    const original = item({ slugId: "a", title: "English title" });
    const source = new Map([["a", original]]);

    const snapshot = createMaxDiffCandidateDisplaySnapshot({
      candidateSlugIds: ["a"],
      itemBySlugId: source,
    });

    source.set("a", item({ slugId: "a", title: "Titre francais" }));
    if (original.displayContent.status === "available") {
      original.displayContent.content.title = "Mutated original object";
    }

    expect(snapshot[0]?.title).toBe("English title");
    expect(snapshot[0]?.displayContent.status).toBe("available");
    if (snapshot[0]?.displayContent.status === "available") {
      expect(snapshot[0].displayContent.content.title).toBe("English title");
    }
  });

  it("omits missing candidate items from the display snapshot", () => {
    const snapshot = createMaxDiffCandidateDisplaySnapshot({
      candidateSlugIds: ["missing"],
      itemBySlugId: new Map(),
    });

    expect(snapshot).toEqual([]);
  });
});
