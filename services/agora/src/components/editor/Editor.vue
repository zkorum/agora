<template>
  <div class="editor">
    <!-- Static toolbar for desktop and adaptive mode -->
    <div
      v-if="editor && showToolbar && !$q.platform.is.mobile"
      class="toolbar"
      @mousedown.prevent
    >
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
      <div class="button-group">
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
    </div>

    <!-- Bubble menu for mobile -->
    <BubbleMenu
      v-if="editor"
      v-show="showToolbar"
      :editor="editor"
      :options="{
        placement: $q.platform.is.ios ? 'top' : 'bottom',
        offset: 10,
      }"
    >
      <div class="bubble-menu-content" @mousedown.prevent>
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
import { useQuasar } from "quasar";
import { useEditor, EditorContent } from "@tiptap/vue-3";
import { BubbleMenu } from "@tiptap/vue-3/menus";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import EditorToolbarButton from "./EditorToolbarButton.vue";
import { MAX_LENGTH_BODY } from "src/shared/shared";
import sanitizeHtml from "sanitize-html";

const $q = useQuasar();
const modelText = defineModel<string>({ required: true });

const props = defineProps<{
  showToolbar: boolean;
  placeholder: string;
  minHeight: string;
  disabled: boolean;
}>();

const emit = defineEmits<{
  manuallyFocused: [];
  blur: [];
}>();

const editor = useEditor({
  content: modelText.value,
  editable: !props.disabled,
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
    CharacterCount.configure({
      limit: MAX_LENGTH_BODY,
    }),
  ],
  editorProps: {
    attributes: {
      style: `min-height: ${props.minHeight}`,
    },
    // Handle paste to preserve only TipTap-enabled formatting
    transformPastedHTML(html) {
      // Only allow tags that TipTap supports: b, strong, i, em, strike, s, u, p, br
      const options: sanitizeHtml.IOptions = {
        allowedTags: ["b", "strong", "i", "em", "strike", "s", "u", "p", "br"],
        allowedAttributes: {},
      };
      return sanitizeHtml(html, options);
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
  onBlur: () => {
    emit("blur");
  },
});

onBeforeUnmount(() => {
  editor.value?.destroy();
});

// Expose focus method for parent components
defineExpose({
  focus: () => {
    editor.value?.chain().focus().run();
  },
});

// Watch for external changes to modelText
watch(
  () => modelText.value,
  (newValue) => {
    if (editor.value) {
      const currentContent = editor.value.getHTML();
      // Only update if the content is actually different
      if (newValue !== currentContent) {
        editor.value.commands.setContent(newValue);
      }
    }
  }
);

// Watch for disabled prop changes to update editor
watch(
  () => props.disabled,
  (newDisabled) => {
    if (editor.value) {
      editor.value.setEditable(!newDisabled);
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

.editor :deep(.ProseMirror p:empty) {
  min-height: 1.2em;
}

.toolbar-divider {
  margin: 0 0.5rem;
}

.button-group {
  display: flex;
  gap: 0.25rem;
}
</style>
