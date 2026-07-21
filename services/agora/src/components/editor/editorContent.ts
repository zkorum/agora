import type { Editor } from "@tiptap/core";

interface SerializeEditorContentParams {
  editor: Editor;
  singleLine: boolean;
}

export function serializeEditorContent({
  editor,
  singleLine,
}: SerializeEditorContentParams): string {
  if (singleLine) {
    return editor.getText();
  }

  const { doc } = editor.state;
  const firstChild = doc.firstChild;
  const isEmptyParagraph =
    doc.childCount === 1 &&
    firstChild?.type.name === "paragraph" &&
    firstChild.content.size === 0;

  return isEmptyParagraph ? "" : editor.getHTML();
}
