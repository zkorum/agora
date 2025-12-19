<template>
  <div class="editor">
    <!-- Static toolbar for desktop and adaptive mode -->
    <div v-if="editor && showToolbar" class="toolbar toolbar-mobile-hidden">
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
      <PrimeDivider layout="vertical" class="toolbar-divider" />
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

    <!-- Bubble menu for mobile -->
    <BubbleMenu
      v-if="editor"
      v-show="showToolbar"
      :editor="editor"
      :options="{ placement: 'bottom', offset: 10 }"
    >
      <div class="bubble-menu-content">
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
      </div>
    </BubbleMenu>
    <div class="editor-wrapper">
      <EditorContent :editor="editor" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch, onBeforeUnmount } from "vue";
import { useEditor, EditorContent } from "@tiptap/vue-3";
import { BubbleMenu } from "@tiptap/vue-3/menus";
import StarterKit from "@tiptap/starter-kit";
import BubbleMenuExtension from "@tiptap/extension-bubble-menu";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import EditorToolbarButton from "./EditorToolbarButton.vue";

const modelText = defineModel<string>({ required: true });

const props = defineProps<{
  showToolbar: boolean;
  placeholder: string;
  minHeight: string;
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
    BubbleMenuExtension,
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

.toolbar {
  display: flex;
  gap: 0.25rem;
  padding: 0.5rem;
  flex-wrap: wrap;

  // Hide on mobile when bubble menu is used
  &.toolbar-mobile-hidden {
    @media (max-width: 768px) {
      display: none;
    }
  }
}

.bubble-menu-content {
  display: flex;
  gap: 0.25rem;
  padding: 0.5rem;
  flex-wrap: wrap;
  background-color: var(--p-content-background);
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
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
  padding: 0.5rem;
  outline: none;
  font-size: 1rem;
  line-height: normal;
}

.editor :deep(.ProseMirror p) {
  margin-bottom: 0.5rem;
}

.toolbar-divider {
  margin: 0 0.5rem;
}
</style>
