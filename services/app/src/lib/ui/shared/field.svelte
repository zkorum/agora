<script lang="ts">
  import { Label } from "bits-ui";
  import type {
    HTMLInputAttributes,
    HTMLTextareaAttributes,
  } from "svelte/elements";

  let {
    label,
    value = $bindable(""),
    placeholder = "",
    multiline = false,
    hint,
    readonly = false,
    labelProps = {},
    inputProps = {},
    textareaProps = {},
    labelRef = $bindable(null),
  }: {
    label: string;
    value?: string;
    placeholder?: string;
    multiline?: boolean;
    hint?: string;
    readonly?: boolean;
    labelProps?: Omit<Label.RootProps, "children" | "class" | "ref">;
    inputProps?: Omit<
      HTMLInputAttributes,
      "value" | "type" | "children" | "placeholder" | "readonly"
    >;
    textareaProps?: Omit<
      HTMLTextareaAttributes,
      "value" | "children" | "placeholder" | "readonly"
    >;
    labelRef?: Label.RootProps["ref"];
  } = $props();
  const id = $props.id();
  const hintId = `${id}-hint`;
</script>

<Label.Root {...labelProps} bind:ref={labelRef} class="agora-field">
  <span>{label}</span>
  {#if multiline}<textarea
      {...textareaProps}
      bind:value
      {placeholder}
      {readonly}
      aria-describedby={hint
        ? `${hintId} ${textareaProps["aria-describedby"] ?? ""}`.trim()
        : textareaProps["aria-describedby"]}
      rows={textareaProps.rows ?? 4}
    ></textarea>{:else}<input
      {...inputProps}
      bind:value
      {placeholder}
      {readonly}
      aria-describedby={hint
        ? `${hintId} ${inputProps["aria-describedby"] ?? ""}`.trim()
        : inputProps["aria-describedby"]}
    />{/if}
  {#if hint}<small id={hintId}>{hint}</small>{/if}
</Label.Root>

<style>
  :global(.agora-field) {
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 14px;
    color: var(--ink-base);
    min-width: 0;
  }
  input,
  textarea {
    width: 100%;
    padding: 12px 14px;
    border: 1px solid var(--sky-lighter);
    border-radius: 8px;
    background: white;
    color: var(--ink-dark);
    font: inherit;
  }
  textarea {
    resize: vertical;
    min-height: 110px;
  }
  small {
    color: var(--ink-light);
    font-size: 12px;
  }
  input::placeholder,
  textarea::placeholder {
    color: var(--sky-dark);
  }
</style>
