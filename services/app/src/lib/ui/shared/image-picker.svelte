<script lang="ts">
  import { Label } from "bits-ui";
  import type { Snippet } from "svelte";
  import type { Attachment } from "svelte/attachments";

  import * as m from "#lib/paraglide/messages.js";

  import Button from "./button.svelte";
  import FieldLabel from "./field-label.svelte";

  const generatedId = $props.id();
  let {
    id = generatedId,
    label,
    value,
    onValueChange,
    disabled = false,
    maxBytes = 5 * 1024 * 1024,
    hint,
    hasImage = false,
    actions,
    renderPreview,
    onPendingChange,
  }: {
    id?: string;
    label: string;
    value: File | undefined;
    onValueChange: (file: File | undefined) => void;
    disabled?: boolean;
    maxBytes?: number;
    hint?: string;
    hasImage?: boolean;
    actions?: Snippet;
    renderPreview?: Snippet<[Attachment<HTMLImageElement> | undefined]>;
    onPendingChange?: (pending: boolean) => void;
  } = $props();

  const acceptedTypes = [
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "image/avif",
  ];
  type Issue = "invalid" | "unreadable";
  const selection = $derived({ value, disabled, maxBytes, hasImage });
  const previewScope = $derived({ file: value, maxBytes });
  let failure = $state.raw<{ scope: typeof selection; issue: Issue }>();
  let failedPreview = $state.raw<typeof previewScope>();
  let pending: { scope: typeof selection; dispose: () => void } | undefined;
  let input: HTMLInputElement | undefined;
  const previewIssue = $derived(
    previewScope.file && !isAllowed(previewScope.file)
      ? "invalid"
      : failedPreview === previewScope
        ? "unreadable"
        : undefined,
  );
  const issue = $derived(
    (failure?.scope === selection ? failure.issue : undefined) ?? previewIssue,
  );
  const requirements = $derived(
    m.image_picker_invalid({ maxSizeMb: maxBytes / (1024 * 1024) }),
  );
  const showRequirements = $derived(
    renderPreview !== undefined && issue !== "invalid",
  );
  const error = $derived(
    issue === "invalid"
      ? requirements
      : issue === "unreadable"
        ? m.image_picker_unreadable()
        : undefined,
  );
  const describedby = $derived(
    `${id}-hint${showRequirements ? ` ${id}-requirements` : ""}${error ? ` ${id}-error` : ""}`,
  );

  function trackCandidate(
    scope: typeof selection,
  ): Attachment<HTMLInputElement> {
    return () => () => {
      if (pending?.scope === scope) pending.dispose();
    };
  }
  const attachInput: Attachment<HTMLInputElement> = (node) => {
    input = node;
    return () => {
      input = undefined;
      pending?.dispose();
    };
  };

  function isAllowed(file: File): boolean {
    return (
      acceptedTypes.includes(file.type) &&
      file.size > 0 &&
      file.size <= maxBytes
    );
  }

  function isPending(dispose: () => void): boolean {
    return pending?.dispose === dispose;
  }

  async function select(
    event: Event & { currentTarget: HTMLInputElement },
  ): Promise<void> {
    const file = event.currentTarget.files?.item(0);
    // Reset only the native picker so choosing the same file again emits change.
    event.currentTarget.value = "";
    if (!file || disabled) return;
    pending?.dispose();
    failure = undefined;
    const scope = selection;
    if (!isAllowed(file)) {
      failure = { scope, issue: "invalid" };
      return;
    }

    const candidate = new Image();
    const url = URL.createObjectURL(file);
    function dispose(): void {
      if (!isPending(dispose)) return;
      pending = undefined;
      candidate.removeAttribute("src");
      URL.revokeObjectURL(url);
      onPendingChange?.(false);
    }
    pending = { scope, dispose };
    onPendingChange?.(true);
    candidate.src = url;

    try {
      await candidate.decode();
      if (!isPending(dispose) || scope !== selection) return;
    } catch {
      if (isPending(dispose) && scope === selection) {
        failure = { scope, issue: "unreadable" };
      }
      return;
    } finally {
      dispose();
    }
    onValueChange(file);
  }

  function preview(scope: typeof previewScope): Attachment<HTMLImageElement> {
    return (image) => {
      const { file } = scope;
      if (!file) return;
      const url = URL.createObjectURL(file);
      function handleError(): void {
        if (
          scope === previewScope &&
          image.complete &&
          image.naturalWidth === 0
        ) {
          failedPreview = scope;
        }
      }
      image.addEventListener("error", handleError);
      image.src = url;
      return () => {
        image.removeEventListener("error", handleError);
        image.removeAttribute("src");
        URL.revokeObjectURL(url);
      };
    };
  }
</script>

<div
  class="
    flex min-w-0 flex-col gap-2 text-(length:--field-font-size,14px)
    text-ink-base
  "
>
  <Label.Root for={id}><FieldLabel text={label} /></Label.Root>
  {#snippet hintText()}
    <small class="text-xs wrap-anywhere text-ink-light" id={`${id}-hint`}
      >{hint ?? m.image_picker_local_hint()}</small
    >
  {/snippet}
  {#if renderPreview}
    {@render hintText()}
    {@render renderPreview(
      value && !previewIssue ? preview(previewScope) : undefined,
    )}
  {/if}
  <div class="flex flex-wrap items-center gap-3">
    <div
      class="
        relative overflow-hidden rounded-lg border border-sky-light bg-sky-white
        px-4 py-3
        focus-within:outline-2 focus-within:outline-offset-2
        focus-within:outline-primary-base
        data-disabled:opacity-50
      "
      data-disabled={disabled ? "" : undefined}
    >
      <span aria-hidden="true"
        >{value || hasImage
          ? m.image_picker_replace()
          : m.image_picker_choose()}</span
      >
      <input
        class="
          absolute inset-0 size-full cursor-pointer opacity-0
          disabled:cursor-not-allowed
        "
        {id}
        type="file"
        accept={acceptedTypes.join(",")}
        {disabled}
        aria-describedby={describedby}
        aria-invalid={error ? "true" : undefined}
        onchange={select}
        {@attach attachInput}
        {@attach trackCandidate(selection)}
      />
    </div>
    {#if actions}
      {@render actions()}
    {:else if value}
      <Button
        variant="quiet"
        {disabled}
        aria-label={m.image_picker_remove_label({ label })}
        onclick={() => {
          pending?.dispose();
          failure = undefined;
          input?.focus();
          onValueChange(undefined);
        }}>{m.image_picker_remove()}</Button
      >
    {/if}
  </div>
  {#if renderPreview}
    {#if showRequirements}<small
        class="text-xs wrap-anywhere text-ink-light"
        id={`${id}-requirements`}>{requirements}</small
      >{/if}
    <div class="empty:absolute" role="status">
      {#if value && !previewIssue}<small
          class="text-xs wrap-anywhere text-ink-light">{value.name}</small
        >{/if}
    </div>
  {:else}
    {@render hintText()}
    {#if value && !previewIssue}
      <figure class="m-0 flex items-center gap-3">
        <img
          class="size-20 rounded-lg object-contain"
          {@attach preview(previewScope)}
          alt={m.image_picker_preview({ label })}
        />
        <figcaption class="text-xs wrap-anywhere text-ink-light">
          {value.name}
        </figcaption>
      </figure>
    {/if}
  {/if}
  {#if error}<small
      id={`${id}-error`}
      class="text-xs wrap-anywhere text-red-darkest"
      role="alert">{error}</small
    >{/if}
</div>
