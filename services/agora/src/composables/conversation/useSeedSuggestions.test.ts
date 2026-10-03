import type { GenerateSeedSuggestionsRequest } from "src/shared/types/dto";
import type { GenerateSeedSuggestionsResult } from "src/utils/api/seedSuggestion/seedSuggestion";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

import { createEmptyDraft } from "./draft/conversationDraft.utils";
import {
  buildExistingStatements,
  plainTextToStatementHtml,
  useSeedSuggestions,
} from "./useSeedSuggestions";

const mocks = vi.hoisted(() => ({
  generateSeedSuggestions: vi.fn((_request: GenerateSeedSuggestionsRequest) =>
    Promise.resolve<GenerateSeedSuggestionsResult>({
      status: "error",
      reason: "failed",
    })
  ),
  recordSeedSuggestionUse: vi.fn(),
}));

vi.mock("src/utils/api/seedSuggestion/seedSuggestion", () => ({
  useBackendSeedSuggestionApi: () => ({
    generateSeedSuggestions: mocks.generateSeedSuggestions,
    recordSeedSuggestionUse: mocks.recordSeedSuggestionUse,
  }),
}));
vi.mock("src/stores/user", () => ({
  useUserStore: () => ({
    profileData: { organizationList: [] },
    loadUserProfile: () => Promise.resolve(),
  }),
}));

describe("plainTextToStatementHtml", () => {
  it("wraps the text in a paragraph", () => {
    expect(
      plainTextToStatementHtml("Night buses should run on weekdays.")
    ).toBe("<p>Night buses should run on weekdays.</p>");
  });

  it("escapes characters that would otherwise be read as HTML", () => {
    expect(
      plainTextToStatementHtml("Fares < 2€ & free for <b>students</b>")
    ).toBe("<p>Fares &lt; 2€ &amp; free for &lt;b&gt;students&lt;/b&gt;</p>");
  });
});

describe("buildExistingStatements", () => {
  it("sends the author's statements as plain text, then earlier suggestions", () => {
    expect(
      buildExistingStatements({
        seedOpinions: ["<p>Run every <strong>30</strong> minutes.</p>"],
        shownSuggestionTexts: ["Add security staff.", "Light the stops."],
      })
    ).toEqual([
      "Run every 30 minutes.",
      "Add security staff.",
      "Light the stops.",
    ]);
  });

  it("leaves out empty statements and repeats", () => {
    expect(
      buildExistingStatements({
        seedOpinions: ["", "<p></p>", "<p>Light the stops.</p>"],
        shownSuggestionTexts: ["Light the stops.", "  "],
      })
    ).toEqual(["Light the stops."]);
  });

  it("stays within what the API accepts", () => {
    const statements = buildExistingStatements({
      seedOpinions: [],
      shownSuggestionTexts: [
        "x".repeat(1500),
        ...Array.from({ length: 150 }, (_, index) => `Suggestion ${index}`),
      ],
    });

    expect(statements).toHaveLength(100);
    expect(statements.every((statement) => statement.length <= 1000)).toBe(
      true
    );
    expect(statements.at(-1)).toBe("Suggestion 149");
  });
});

let suggestionCounter = 0;

function confidentAnswer(texts: string[]): GenerateSeedSuggestionsResult {
  const generationId = crypto.randomUUID();
  return {
    status: "success",
    data: {
      generationId,
      confident: true,
      suggestions: texts.map((text) => {
        suggestionCounter += 1;
        return {
          suggestionId: `suggestion-${String(suggestionCounter)}`,
          text,
        };
      }),
    },
  };
}

function setUp(seedOpinions: string[] = []) {
  const conversationDraft = ref({
    ...createEmptyDraft(),
    title: "Night buses",
    seedOpinions,
  });
  return {
    conversationDraft,
    suggestions: useSeedSuggestions({ conversationDraft }),
  };
}

describe("useSeedSuggestions", () => {
  beforeEach(() => {
    mocks.generateSeedSuggestions.mockReset();
    mocks.recordSeedSuggestionUse.mockReset();
  });

  it("adds a suggestion to the statements and records it with the draft", async () => {
    mocks.generateSeedSuggestions.mockResolvedValueOnce(
      confidentAnswer(["Run every 30 minutes.", "Light the stops."])
    );
    const { conversationDraft, suggestions } = setUp(["<p>Mine.</p>"]);

    await suggestions.generate();
    const [first] = suggestions.pendingSuggestions.value;
    const position = suggestions.add(first?.suggestionId ?? "");

    expect(position).toBe(1);
    expect(conversationDraft.value.seedOpinions).toEqual([
      "<p>Mine.</p>",
      "<p>Run every 30 minutes.</p>",
    ]);
    expect(suggestions.pendingSuggestions.value.map((s) => s.text)).toEqual([
      "Light the stops.",
    ]);
    expect(mocks.recordSeedSuggestionUse).toHaveBeenCalledWith({
      draftId: conversationDraft.value.aiSuggestionDraftId,
      generationId: first?.generationId,
      suggestionId: first?.suggestionId,
    });
  });

  it("discards a suggestion without touching the statements or the log", async () => {
    mocks.generateSeedSuggestions.mockResolvedValueOnce(
      confidentAnswer(["Run every 30 minutes."])
    );
    const { conversationDraft, suggestions } = setUp();

    await suggestions.generate();
    suggestions.discard(
      suggestions.pendingSuggestions.value[0]?.suggestionId ?? ""
    );

    expect(suggestions.pendingSuggestions.value).toEqual([]);
    expect(conversationDraft.value.seedOpinions).toEqual([]);
    expect(mocks.recordSeedSuggestionUse).not.toHaveBeenCalled();
  });

  it("adds a second generation to the box and sends what was already shown", async () => {
    mocks.generateSeedSuggestions
      .mockResolvedValueOnce(confidentAnswer(["First."]))
      .mockResolvedValueOnce(confidentAnswer(["Second."]));
    const { conversationDraft, suggestions } = setUp();

    await suggestions.generate();
    suggestions.discard(
      suggestions.pendingSuggestions.value[0]?.suggestionId ?? ""
    );
    await suggestions.generate();

    expect(suggestions.pendingSuggestions.value.map((s) => s.text)).toEqual([
      "Second.",
    ]);
    expect(mocks.generateSeedSuggestions).toHaveBeenLastCalledWith(
      expect.objectContaining({
        draftId: conversationDraft.value.aiSuggestionDraftId,
        existingStatements: ["First."],
      })
    );
  });

  it("shows the tip and blocks new requests when the model is not confident", async () => {
    mocks.generateSeedSuggestions
      .mockResolvedValueOnce(confidentAnswer(["Kept."]))
      .mockResolvedValueOnce({
        status: "success",
        data: {
          generationId: crypto.randomUUID(),
          confident: false,
          tip: "Say which city this is about.",
        },
      });
    const { suggestions } = setUp();

    await suggestions.generate();
    await suggestions.generate();

    expect(suggestions.notConfidentTip.value).toBe(
      "Say which city this is about."
    );
    expect(suggestions.pendingSuggestions.value.map((s) => s.text)).toEqual([
      "Kept.",
    ]);
    expect(suggestions.canGenerate.value).toBe(false);
    await suggestions.generate();
    expect(mocks.generateSeedSuggestions).toHaveBeenCalledTimes(2);
  });

  it("stops offering suggestions above 20 statements", () => {
    const twenty = Array.from({ length: 20 }, (_, i) => `<p>${String(i)}</p>`);
    const { conversationDraft, suggestions } = setUp(twenty);

    expect(suggestions.canGenerate.value).toBe(true);
    conversationDraft.value.seedOpinions.push("<p>21</p>");
    expect(suggestions.canGenerate.value).toBe(false);
  });

  it("stops adding suggestions at 50 statements", async () => {
    mocks.generateSeedSuggestions.mockResolvedValueOnce(
      confidentAnswer(["One too many."])
    );
    const { conversationDraft, suggestions } = setUp();
    await suggestions.generate();
    conversationDraft.value.seedOpinions = Array.from(
      { length: 50 },
      (_, i) => `<p>${String(i)}</p>`
    );

    expect(suggestions.canTakeSuggestion.value).toBe(false);
    expect(
      suggestions.add(
        suggestions.pendingSuggestions.value[0]?.suggestionId ?? ""
      )
    ).toBeUndefined();
    expect(conversationDraft.value.seedOpinions).toHaveLength(50);
  });
});
