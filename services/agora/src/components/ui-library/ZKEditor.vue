<template>
  <div>
    <form
      autocorrect="off"
      autocapitalize="off"
      autocomplete="off"
      spellcheck="false"
    >
      <q-editor
        ref="editorRef"
        v-model="commentText"
        :class="{
          whiteBackground: addBackgroundColor,
          plainBackground: !addBackgroundColor,
        }"
        :placeholder="placeholder"
        :min-height="minHeight"
        flat
        :toolbar="showToolbar ? toolbarButtons : []"
        @paste="onPaste"
        @focus="editorFocused()"
      />
    </form>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";

const modelText = defineModel<string>();

defineProps<{
  showToolbar: boolean;
  placeholder: string;
  minHeight: string;
  focusEditor: boolean;
  addBackgroundColor: boolean;
}>();

const emit = defineEmits(["manuallyFocused"]);

const editorRef = ref<HTMLElement | null>(null);

const commentText = ref("");

const toolbarButtons = [
  ["bold", "italic", "strike", "underline"],
  ["undo", "redo"],
];

onMounted(() => {
  // processFocus();
});

/*
watch(() => props.focusEditor, () => {
  if (props.focusEditor) {
    processFocus();
  }
})
  */

watch(commentText, () => {
  modelText.value = commentText.value;
});

function editorFocused() {
  emit("manuallyFocused");
}

/*
function processFocus() {
  if (props.focusEditor == true) {
    editorRef.value?.focus();
  }
}
*/

function onPaste(evt: Event) {
  // Let inputs do their thing, so we don't break pasting of links.
  /* @ts-expect-error Event definition is missing */
  if (evt.target?.nodeName === "INPUT") return;
  let text, onPasteStripFormattingIEPaste;
  evt.preventDefault();
  evt.stopPropagation();
  /* @ts-expect-error Event definition is missing */
  if (evt.originalEvent && evt.originalEvent.clipboardData.getData) {
    /* @ts-expect-error Event definition is missing */
    text = evt.originalEvent.clipboardData.getData("text/plain");
    /* @ts-expect-error Element not properly defined */
    editorRef.value?.runCmd("insertText", text);
    // @ts-expect-error Type error
  } else if (evt.clipboardData && evt.clipboardData.getData) {
    /* @ts-expect-error Event definition is missing */
    text = evt.clipboardData.getData("text/plain");
    /* @ts-expect-error Element not properly defined */
    editorRef.value?.runCmd("insertText", text);
    // @ts-expect-error Type error
  } else if (window.clipboardData && window.clipboardData.getData) {
    if (!onPasteStripFormattingIEPaste) {
      onPasteStripFormattingIEPaste = true;
      /* @ts-expect-error Element not properly defined */
      editorRef.value?.runCmd("ms-pasteTextOnly", text);
    }
    onPasteStripFormattingIEPaste = false;
  }
}
</script>

<style lang="scss" scoped>
.whiteBackground {
  background-color: white;
}

.plainBackground {
  background-color: $app-background-color;
}
</style>
