<script lang="ts">
  import type { Editor } from "@tiptap/core";
  import type { BubbleMenuPlugin } from "@tiptap/extension-bubble-menu";
  import type { EditorView } from "@tiptap/pm/view";
  import { onMount } from "svelte";

  import * as m from "#lib/paraglide/messages.js";

  import { sanitizeRichTextContent } from "../../../../../shared/src/richTextHtml.js";
  import Button from "./button.svelte";
  import FieldLabel from "./field-label.svelte";

  let {
    value,
    onValueChange,
    label,
    disabled,
    placeholder,
    invalidMessage,
    countLabel,
    id,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    label: string;
    disabled: boolean;
    placeholder: string;
    invalidMessage: string | undefined;
    countLabel: string;
    id?: string;
  } = $props();

  const uid = $props.id();
  const labelId = `${uid}-label`;
  const countId = `${uid}-count`;
  const errorId = `${uid}-error`;
  const menuKey = "bubbleMenu";
  const inlineToolbarMinWidth = 384;

  const controls = [
    {
      name: "bold",
      command: "toggleBold",
      label: m.rich_text_bold,
      icon: "icon-[lucide--bold]",
      shortcuts: "Control+B Meta+B",
    },
    {
      name: "italic",
      command: "toggleItalic",
      label: m.rich_text_italic,
      icon: "icon-[lucide--italic]",
      shortcuts: "Control+I Meta+I",
    },
    {
      name: "underline",
      command: "toggleUnderline",
      label: m.rich_text_underline,
      icon: "icon-[lucide--underline]",
      shortcuts: "Control+U Meta+U",
    },
    {
      name: "strike",
      command: "toggleStrike",
      label: m.rich_text_strike,
      icon: "icon-[lucide--strikethrough]",
      shortcuts: "Control+Shift+S Meta+Shift+S",
    },
    {
      name: "bulletList",
      command: "toggleBulletList",
      label: m.rich_text_bullet_list,
      icon: "icon-[lucide--list]",
      shortcuts: "Control+Shift+8 Meta+Shift+8",
    },
    {
      name: "orderedList",
      command: "toggleOrderedList",
      label: m.rich_text_ordered_list,
      icon: "icon-[lucide--list-ordered]",
      shortcuts: "Control+Shift+7 Meta+Shift+7",
    },
  ] as const;

  type Control = (typeof controls)[number];

  let shell: HTMLDivElement;
  let editorHost: HTMLDivElement;
  let bubble: HTMLDivElement;
  let runtime = $state.raw<{
    editor: Editor;
    createBubbleMenuPlugin: typeof BubbleMenuPlugin;
  }>();
  const editor = $derived(runtime?.editor);
  let loadFailed = $state(false);
  let compact = $state(true);
  let controlState = $state.raw(
    new Map<Control["name"], { active: boolean; available: boolean }>(),
  );
  let appliedValue = "";

  function sanitizeEditorHtml(htmlString: string): string {
    return sanitizeRichTextContent({ htmlString, mode: "input" });
  }

  function updateControls(instance: Editor): void {
    const can = instance.can();
    controlState = new Map(
      controls.map(({ name, command }) => [
        name,
        {
          active: instance.isActive(name),
          available: can[command](),
        },
      ]),
    );
  }

  const editorProps = $derived<Editor["options"]["editorProps"]>({
    attributes: {
      id: id ?? uid,
      // Safari zooms focused editables below 16px; keep compact inputs at that floor.
      class: [
        "agora-rich-text min-h-27.5 max-h-[min(22rem,max(110px,40dvh))] overflow-y-auto p-(--field-padding,12px_14px) wrap-anywhere outline-none [&_p.is-editor-empty:first-child]:before:pointer-events-none [&_p.is-editor-empty:first-child]:before:block [&_p.is-editor-empty:first-child]:before:h-0 [&_p.is-editor-empty:first-child]:before:text-sky-dark [&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]",
        compact && "text-base leading-normal",
      ]
        .filter(Boolean)
        .join(" "),
      role: "textbox",
      "aria-multiline": "true",
      "aria-labelledby": labelId,
      "aria-describedby": invalidMessage ? `${errorId} ${countId}` : countId,
      "aria-invalid": String(Boolean(invalidMessage)),
      "aria-disabled": String(disabled),
      "aria-placeholder": placeholder,
      tabindex: disabled ? "-1" : "0",
    },
    // Sanitize before ProseMirror parses clipboard HTML, without trimming fragments.
    transformPastedHTML: sanitizeEditorHtml,
    handleDOMEvents: {
      // With text selected, keep native Tab navigation instead of re-indenting
      // the selection via StarterKit's list shortcuts.
      keydown: (view: EditorView, event: KeyboardEvent) =>
        event.key === "Tab" && !view.state.selection.empty,
    },
  });

  onMount(() => {
    let disposed = false;
    let instance: Editor | undefined;
    const measure = (width: number) => {
      compact = width < inlineToolbarMinWidth;
    };
    measure(shell.clientWidth);
    const observer = new ResizeObserver((entries) => {
      for (const { contentRect } of entries) measure(contentRect.width);
    });
    observer.observe(shell);

    async function initialize(): Promise<void> {
      try {
        // Keep the editor runtime off the workspace's initial bundle.
        const [
          { Editor },
          { BubbleMenuPlugin },
          { Placeholder },
          { StarterKit },
        ] = await Promise.all([
          import("@tiptap/core"),
          import("@tiptap/extension-bubble-menu"),
          import("@tiptap/extension-placeholder"),
          import("@tiptap/starter-kit"),
        ]);
        if (disposed) return;

        appliedValue = value;
        instance = new Editor({
          element: null,
          content: sanitizeEditorHtml(appliedValue),
          editable: !disabled,
          editorProps,
          extensions: [
            StarterKit.configure({
              blockquote: false,
              code: false,
              codeBlock: false,
              heading: false,
              horizontalRule: false,
              link: false,
              trailingNode: false,
            }),
            Placeholder.configure({ placeholder: () => placeholder }),
          ],
          onTransaction: ({
            editor: current,
            transaction,
            appendedTransactions,
          }) => {
            if (
              [transaction, ...appendedTransactions].some(
                (change) =>
                  change.docChanged ||
                  change.selectionSet ||
                  change.storedMarksSet,
              )
            ) {
              updateControls(current);
            }
          },
          onUpdate: ({ editor: current }) => {
            appliedValue = current.isEmpty ? "" : current.getHTML();
            onValueChange(appliedValue);
          },
          onBlur: ({ event }) => {
            hideBubbleOnFocusLeave(event);
          },
        });
        instance.mount(editorHost);
        updateControls(instance);
        runtime = {
          editor: instance,
          createBubbleMenuPlugin: BubbleMenuPlugin,
        };
      } catch {
        instance?.destroy();
        instance = undefined;
        if (!disposed) loadFailed = true;
      }
    }

    void initialize();
    return () => {
      disposed = true;
      observer.disconnect();
      instance?.destroy();
    };
  });

  $effect(() => {
    if (editor && value !== appliedValue) {
      appliedValue = value;
      editor
        .chain()
        .setMeta("addToHistory", false)
        .setContent(sanitizeEditorHtml(value), { emitUpdate: false })
        .run();
    }
  });

  $effect(() => {
    editor?.setOptions({
      editable: !disabled,
      editorProps,
    });
  });

  $effect(() => {
    if (!runtime || !compact || disabled) return;
    const { editor: instance, createBubbleMenuPlugin } = runtime;
    const editorDom = instance.view.dom;
    let active = true;
    let frame: number | undefined;

    // Register only in compact editors; the editor instance and its undo history stay mounted.
    instance.registerPlugin(
      createBubbleMenuPlugin({
        pluginKey: menuKey,
        editor: instance,
        element: bubble,
        appendTo: shell,
        updateDelay: 120,
        // The plugin's queued focus/selection callbacks may run after unregistering.
        shouldShow: ({ view, state, from, to }) =>
          active &&
          instance.isEditable &&
          !state.selection.empty &&
          (view.hasFocus() || bubble.contains(document.activeElement)) &&
          state.doc.textBetween(from, to).length > 0,
        options: {
          // The editor's own scroll and its ancestors are handled together below.
          scrollTarget: editorHost,
          strategy: "fixed",
          // Match the Vue editor's preference without using the OS to select the mode.
          placement: /Android/i.test(navigator.userAgent) ? "bottom" : "top",
          offset: 16,
          flip: { padding: 8 },
          shift: { padding: 8 },
          onShow: () => {
            bubble.tabIndex = -1;
          },
        },
      }),
    );

    function reposition(): void {
      if (frame !== undefined || bubble.parentNode !== shell) return;
      frame = requestAnimationFrame(() => {
        frame = undefined;
        if (bubble.parentNode === shell && !instance.isDestroyed) {
          instance.view.dispatch(
            instance.state.tr.setMeta(menuKey, "updatePosition"),
          );
        }
      });
    }

    function followScroll(event: Event): void {
      const target = event.target;
      if (
        target === window ||
        target === editorDom ||
        (target instanceof Node && target.contains(editorHost))
      ) {
        reposition();
      }
    }

    // Form dialogs and the editor can both scroll; keep the bubble with its selection.
    window.addEventListener("scroll", followScroll, true);
    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", reposition);
    viewport?.addEventListener("scroll", reposition);
    return () => {
      active = false;
      if (frame !== undefined) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", followScroll, true);
      viewport?.removeEventListener("resize", reposition);
      viewport?.removeEventListener("scroll", reposition);
      if (!instance.isDestroyed) instance.unregisterPlugin(menuKey);
    };
  });

  function run(control: Control): void {
    if (!disabled) editor?.chain().focus()[control.command]().run();
  }

  function preserveSelection(event: MouseEvent): void {
    // Mouse users keep their selection; keyboard users can still Tab to the buttons.
    event.preventDefault();
  }

  function hideBubbleOnFocusLeave(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (
      editor &&
      bubble.parentNode === shell &&
      !editor.isDestroyed &&
      !(
        next instanceof Node &&
        (bubble.contains(next) || editorHost.contains(next))
      )
    ) {
      editor.view.dispatch(editor.state.tr.setMeta(menuKey, "hide"));
    }
  }
</script>

{#snippet toolbarControls()}
  {#each controls as control (control.name)}
    {@const active = controlState.get(control.name)?.active ?? false}
    <Button
      variant="quiet"
      size="icon"
      disabled={disabled || !controlState.get(control.name)?.available}
      class={active ? "bg-primary-lightest text-primary-base" : undefined}
      aria-label={control.label()}
      aria-pressed={active}
      aria-keyshortcuts={control.shortcuts}
      title={control.label()}
      onmousedown={preserveSelection}
      onclick={() => {
        run(control);
      }}
    >
      <span class={[control.icon, "size-4"]} aria-hidden="true"></span>
    </Button>
  {/each}
{/snippet}

<div class="flex min-w-0 flex-col gap-2 text-sm text-ink-base">
  <FieldLabel text={label} id={labelId} />
  <div
    bind:this={shell}
    data-editor-shell
    class={[
      `
        rounded-(--field-radius,8px) border text-ink-dark
        focus-within:outline-2 focus-within:outline-offset-2
        focus-within:outline-primary-base
      `,
      invalidMessage ? "border-red-darkest" : "border-sky-lighter",
      disabled ? "bg-sky-lightest" : "bg-sky-white",
    ]}
  >
    {#if !compact}
      <div
        class="flex flex-wrap gap-0.5 border-b border-sky-lighter p-1"
        role="group"
        aria-label={m.rich_text_formatting()}
      >
        {@render toolbarControls()}
      </div>
    {/if}
    <div
      data-editor-host
      class="min-h-27.5"
      data-compact={compact}
      aria-busy={!editor && !loadFailed}
      bind:this={editorHost}
    >
      {#if loadFailed}
        <p class="px-3.5 py-3 text-red-darkest" role="status">
          {m.rich_text_unavailable()}
        </p>
      {/if}
    </div>
    <!-- Tiptap moves this element out of the hidden staging area while visible. -->
    <div hidden>
      <div
        bind:this={bubble}
        data-editor-bubble
        class="
          fixed z-20 flex max-w-[calc(100vw-16px)] flex-wrap gap-0.5 rounded-lg
          border border-sky-lighter bg-sky-white p-1 shadow-md
          [&_button]:min-h-11 [&_button]:min-w-11
        "
        role="group"
        aria-label={m.rich_text_formatting()}
        onfocusout={hideBubbleOnFocusLeave}
      >
        {@render toolbarControls()}
      </div>
    </div>
  </div>
  <div class="flex flex-wrap items-start gap-x-3 gap-y-1 text-xs">
    <div id={errorId} aria-live="polite" class="text-red-darkest">
      {invalidMessage}
    </div>
    <span
      id={countId}
      class={[
        "ms-auto",
        invalidMessage ? "text-red-darkest" : "text-ink-light",
      ]}>{countLabel}</span
    >
  </div>
</div>
