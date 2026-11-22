<script lang="ts">
  import { Label } from "bits-ui";
  import type {
    HTMLInputAttributes,
    HTMLTextareaAttributes,
  } from "svelte/elements";

  import FieldLabel from "./field-label.svelte";

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
      "value" | "children" | "placeholder" | "readonly"
    >;
    textareaProps?: Omit<
      HTMLTextareaAttributes,
      "value" | "children" | "placeholder" | "readonly"
    >;
    labelRef?: Label.RootProps["ref"];
  } = $props();
  const id = $props.id();
  const hintId = `${id}-hint`;
  const controlClass =
    "w-full rounded-(--field-radius,8px) border border-sky-lighter bg-sky-white p-(--field-padding,12px_14px) text-ink-dark placeholder:text-sky-dark";
</script>

<Label.Root
  {...labelProps}
  bind:ref={labelRef}
  class="
    flex min-w-0 flex-col gap-2 text-(length:--field-font-size,14px)
    text-ink-base
  "
>
  <FieldLabel
    text={label}
    id={`${id}-label`}
    required={(multiline ? textareaProps.required : inputProps.required) ===
      true}
  />
  {#if multiline}<textarea
      {...textareaProps}
      class={[
        controlClass,
        "min-h-(--field-textarea-min-height,110px) resize-y",
        textareaProps.class,
      ]}
      bind:value
      {placeholder}
      {readonly}
      aria-labelledby={textareaProps["aria-labelledby"] ??
        (textareaProps["aria-label"] ? undefined : `${id}-label`)}
      aria-describedby={hint
        ? `${hintId} ${textareaProps["aria-describedby"] ?? ""}`.trim()
        : textareaProps["aria-describedby"]}
      rows={textareaProps.rows ?? 4}
    ></textarea>{:else}<input
      {...inputProps}
      class={[controlClass, inputProps.class]}
      bind:value
      {placeholder}
      {readonly}
      aria-labelledby={inputProps["aria-labelledby"] ??
        (inputProps["aria-label"] ? undefined : `${id}-label`)}
      aria-describedby={hint
        ? `${hintId} ${inputProps["aria-describedby"] ?? ""}`.trim()
        : inputProps["aria-describedby"]}
    />{/if}
  {#if hint}<small class="text-xs text-ink-light" id={hintId}>{hint}</small
    >{/if}
</Label.Root>
