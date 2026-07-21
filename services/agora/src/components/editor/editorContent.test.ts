import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";

import { serializeEditorContent } from "./editorContent";

const editors: Editor[] = [];

function createEditor(content: string): Editor {
  const editor = new Editor({ content, extensions: [StarterKit] });
  editors.push(editor);
  return editor;
}

afterEach(() => {
  for (const editor of editors.splice(0)) {
    editor.destroy();
  }
});

describe("serializeEditorContent", () => {
  it("serializes the canonical empty paragraph as an empty model", () => {
    const editor = createEditor("");

    expect(editor.getHTML()).toBe("<p></p>");
    expect(serializeEditorContent({ editor, singleLine: false })).toBe("");
  });

  it("preserves an empty list because it carries formatting state", () => {
    const editor = createEditor("<ul><li><p></p></li></ul>");

    expect(editor.isEmpty).toBe(true);
    expect(serializeEditorContent({ editor, singleLine: false })).toBe(
      "<ul><li><p></p></li></ul>"
    );
  });

  it("preserves rich text HTML", () => {
    const editor = createEditor("<p><strong>Statement</strong></p>");

    expect(serializeEditorContent({ editor, singleLine: false })).toBe(
      "<p><strong>Statement</strong></p>"
    );
  });

  it("serializes single-line content as plain text", () => {
    const editor = createEditor("<p><strong>Statement</strong></p>");

    expect(serializeEditorContent({ editor, singleLine: true })).toBe(
      "Statement"
    );
  });
});
