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
      :tippy-options="{
        placement: $q.platform.is.android ? 'top' : 'bottom',
        offset: [0, $q.platform.is.mobile ? 20 : 15],
        flip: !$q.platform.is.mobile,
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
      <EditorContent v-if="editor" :editor="editor" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch, onBeforeUnmount } from "vue";
import { useQuasar } from "quasar";
import { useEditor, EditorContent } from "@tiptap/vue-3";
import { BubbleMenu } from "@tiptap/vue-3/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Underline from "@tiptap/extension-underline";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { DOMSerializer } from "@tiptap/pm/model";
import EditorToolbarButton from "./EditorToolbarButton.vue";
import sanitizeHtml from "sanitize-html";
import { htmlToCountedText } from "src/shared/shared";

const $q = useQuasar();
const modelText = defineModel<string>({ required: true });

const props = defineProps<{
  showToolbar: boolean;
  placeholder: string;
  minHeight: string;
  disabled: boolean;
  singleLine: boolean;
  maxLength: number;
}>();

const emit = defineEmits<{
  manuallyFocused: [];
  blur: [];
}>();

// Custom extension to block Enter key in single-line mode
const BlockEnterExtension = Extension.create({
  name: "blockEnter",
  addKeyboardShortcuts() {
    return {
      Enter: () => true, // Returning true prevents default behavior
    };
  },
});

// Custom extension factory to enforce character limits using transaction filtering
const createCharacterLimitExtension = (maxLength: number) =>
  Extension.create({
    name: "characterLimit",

    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: new PluginKey("characterLimit"),
          filterTransaction: (transaction, state) => {
            // Allow non-document-changing transactions
            if (!transaction.docChanged) {
              return true;
            }

            // Get the new document that would result from this transaction
            const newDoc = transaction.doc;

            // Serialize to HTML
            const fragment = DOMSerializer.fromSchema(
              state.schema
            ).serializeFragment(newDoc.content);
            const div = document.createElement("div");
            div.appendChild(fragment);
            const html = div.innerHTML;

            // Convert to plain text with our counting logic
            const plainText = htmlToCountedText(html);

            // Block transaction if it would exceed the limit
            return plainText.length <= maxLength;
          },
        }),
      ];
    },
  });

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
      // Disable hard breaks in single-line mode
      hardBreak: props.singleLine ? false : {},
    }),
    Underline,
    Placeholder.configure({
      placeholder: props.placeholder,
    }),
    CharacterCount,
    // Add character limit enforcement
    createCharacterLimitExtension(props.maxLength),
    // Add Enter key blocker for single-line mode
    ...(props.singleLine ? [BlockEnterExtension] : []),
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
    if (props.singleLine) {
      // Get plain text for single-line mode
      const text = editor.getText();
      modelText.value = text;
    } else {
      // Get HTML for multi-line mode
      const html = editor.getHTML();
      // Clean up empty content
      if (html === "<p></p>" || html === "<br>" || html === "") {
        modelText.value = "";
      } else {
        modelText.value = html;
      }
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
      const currentContent = props.singleLine
        ? editor.value.getText()
        : editor.value.getHTML();
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
  padding-bottom: 0rem;
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
