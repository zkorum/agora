<template>
  <div class="editor">
    <div v-if="editor && showToolbar" class="toolbar">
      <EditorToolbarButton
        icon="mdi:format-bold"
        :is-active="editor.isActive('bold')"
        @click="editor.chain().focus().toggleBold().run()"
      />
      <EditorToolbarButton
        icon="mdi:format-italic"
        :is-active="editor.isActive('italic')"
        @click="editor.chain().focus().toggleItalic().run()"
      />
      <EditorToolbarButton
        icon="mdi:format-strikethrough"
        :is-active="editor.isActive('strike')"
        @click="editor.chain().focus().toggleStrike().run()"
      />
      <EditorToolbarButton
        icon="mdi:format-underline"
        :is-active="editor.isActive('underline')"
        @click="editor.chain().focus().toggleUnderline().run()"
      />
      <EditorToolbarButton
        icon="mdi:undo"
        :disabled="!editor.can().undo()"
        @click="editor.chain().focus().undo().run()"
      />
      <EditorToolbarButton
        icon="mdi:redo"
        :disabled="!editor.can().redo()"
        @click="editor.chain().focus().redo().run()"
      />
    </div>
    <div
      class="editor-wrapper"
      :class="{
        whiteBackground: addBackgroundColor,
        plainBackground: !addBackgroundColor,
      }"
    >
      <EditorContent :editor="editor" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch, onBeforeUnmount } from "vue";
import { useEditor, EditorContent } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import EditorToolbarButton from "./EditorToolbarButton.vue";

const modelText = defineModel<string>({ required: true });

const props = defineProps<{
  showToolbar: boolean;
  placeholder: string;
  minHeight: string;
  addBackgroundColor: boolean;
}>();

const emit = defineEmits<{
  manuallyFocused: [];
}>();

const editor = useEditor({
  content: modelText.value,
  extensions: [
    StarterKit.configure({
      // Disable features we don't need
      heading: false,
      blockquote: false,
      codeBlock: false,
      horizontalRule: false,
      bulletList: false,
      orderedList: false,
      listItem: false,
    }),
    Underline,
    Placeholder.configure({
      placeholder: props.placeholder,
    }),
  ],
  editorProps: {
    attributes: {
      style: `min-height: ${props.minHeight}`,
    },
    // Handle paste to strip formatting
    transformPastedHTML(html) {
      // Strip all HTML tags and keep only text content
      const div = document.createElement("div");
      div.innerHTML = html;
      return div.textContent || div.innerText || "";
    },
  },
  onUpdate: ({ editor }) => {
    const html = editor.getHTML();
    // Clean up empty content
    if (html === "<p></p>" || html === "<br>" || html === "") {
      modelText.value = "";
    } else {
      modelText.value = html;
    }
  },
  onFocus: () => {
    emit("manuallyFocused");
  },
});

onBeforeUnmount(() => {
  editor.value?.destroy();
});

// Watch for external changes to modelText using getter function
watch(
  () => modelText.value,
  (newValue) => {
    if (editor.value) {
      const currentContent = editor.value.getHTML();
      // Only update if the content is actually different
      if (
        newValue !== currentContent &&
        !(
          (newValue === "" || newValue === "<p></p>") &&
          (currentContent === "" || currentContent === "<p></p>")
        )
      ) {
        editor.value.commands.setContent(newValue);
      }
    }
  }
);
</script>

<style lang="scss" scoped>
.editor {
  padding-bottom: 1rem;
}

.whiteBackground {
  background-color: white;
}

.plainBackground {
  background-color: $app-background-color;
}

.toolbar {
  display: flex;
  gap: 0.25rem;
  padding: 0.5rem;
  flex-wrap: wrap;
}

/* Tiptap Placeholder styling - required for the Placeholder extension to display */
.editor :deep(.tiptap p.is-editor-empty:first-child::before) {
  color: $color-text-weak;
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}

.editor :deep(.ProseMirror) {
  padding: 0.75rem;
  border-radius: 10px;
}
</style>
