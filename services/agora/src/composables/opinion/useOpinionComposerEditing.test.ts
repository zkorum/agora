import { zodDisplayedOpinionItem } from "src/shared/types/zod";
import { describe, expect, it } from "vitest";
import { effectScope, nextTick, ref } from "vue";

import { useOpinionComposerEditing } from "./useOpinionComposerEditing";

const opinion = zodDisplayedOpinionItem.parse({
  opinionSlugId: "editstat",
  opinion: "<p>Published statement</p>",
  sourceLanguageCode: "en",
  username: "author",
  isSeed: false,
  isEdited: false,
  createdAt: "2026-10-10T10:00:00Z",
  updatedAt: "2026-10-10T10:00:00Z",
  numParticipants: 0,
  numAgrees: 0,
  numDisagrees: 0,
  numPasses: 0,
  moderation: { status: "unmoderated" },
  management: { editing: { allowed: true }, canDelete: true },
  displayContent: {
    sourceVersion: "00000000-0000-4000-8000-000000000001",
    status: "available",
    mode: "original",
    content: { content: "<p>Published statement</p>" },
    translationControl: null,
  },
});

describe("composer edit sessions", () => {
  it("initializes an already-selected statement and restores the independent creation draft", async () => {
    const scope = effectScope();
    const body = ref("<p>Creation draft</p>");
    const target = ref<typeof opinion | undefined>(opinion);
    const editing = scope.run(() =>
      useOpinionComposerEditing({
        target,
        body,
        saveCreationDraft: () => {},
        activate: () => {},
        deactivate: () => {},
      })
    );
    if (editing === undefined) throw new Error("Missing edit session");
    expect(body.value).toBe(opinion.opinion);
    expect(editing.isInitializing.value).toBe(true);
    editing.ready(opinion.opinion);
    body.value = "<p>Unsaved edit</p>";
    expect(editing.isDirty.value).toBe(true);
    target.value = undefined;
    await nextTick();
    expect(body.value).toBe("<p>Creation draft</p>");
    scope.stop();
  });

  it("does not overwrite typing when only permissions or counts change", async () => {
    const scope = effectScope();
    const body = ref("");
    const target = ref(opinion);
    const editing = scope.run(() =>
      useOpinionComposerEditing({
        target,
        body,
        saveCreationDraft: () => {},
        activate: () => {},
        deactivate: () => {},
      })
    );
    if (editing === undefined) throw new Error("Missing edit session");
    editing.ready(opinion.opinion);
    body.value = "<p>Working draft</p>";
    target.value = {
      ...opinion,
      numAgrees: 1,
      management: {
        editing: { allowed: false, reason: "has_votes" },
        canDelete: true,
      },
    };
    await nextTick();
    expect(body.value).toBe("<p>Working draft</p>");
    expect(editing.isDirty.value).toBe(true);
    scope.stop();
  });

  it("distinguishes two sessions for the same source version", async () => {
    const scope = effectScope();
    const body = ref("");
    const target = ref<typeof opinion | undefined>(opinion);
    const editing = scope.run(() =>
      useOpinionComposerEditing({
        target,
        body,
        saveCreationDraft: () => {},
        activate: () => {},
        deactivate: () => {},
      })
    );
    if (editing === undefined) throw new Error("Missing edit session");
    editing.ready(opinion.opinion);
    const original = editing.capture();
    if (original === undefined) throw new Error("Missing ready session");
    target.value = undefined;
    await nextTick();
    target.value = opinion;
    await nextTick();
    editing.ready(opinion.opinion);
    expect(editing.isCurrent(original)).toBe(false);
    scope.stop();
  });
});
