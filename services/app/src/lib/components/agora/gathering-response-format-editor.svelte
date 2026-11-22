<script lang="ts">
  import { tick } from "svelte";

  import * as m from "#lib/paraglide/messages.js";
  import { gatheringAnswerLimits } from "$logic/agora/gathering-format.js";
  import Button from "$ui/shared/button.svelte";
  import CheckboxField from "$ui/shared/checkbox-field.svelte";
  import Dialog from "$ui/shared/dialog.svelte";
  import Field from "$ui/shared/field.svelte";
  import Icon from "$ui/shared/icon.svelte";
  import NumberField from "$ui/shared/number-field.svelte";
  import Select from "$ui/shared/select.svelte";

  import { gatheringResponseFormat } from "../../../../../shared/src/gathering.js";
  import {
    MAX_GATHERING_FIELDS,
    MAX_GATHERING_TEXT_LENGTH,
  } from "../../../../../shared/src/gatheringLimits.js";

  type Format = ReturnType<typeof gatheringResponseFormat.parse>;
  type Draft = Omit<Format[number], "characterLimit"> & {
    characterLimit: number | undefined;
    expanded: boolean;
  };
  let {
    fields,
    onsave,
    disabled = false,
    dir = "ltr",
  }: {
    fields: readonly Format[number][];
    onsave: (format: Format) => void;
    disabled?: boolean;
    dir?: "ltr" | "rtl";
  } = $props();
  const { short, long } = gatheringAnswerLimits;
  const id = $props.id();
  let draft = $state<Draft[]>([]);
  let open = $state(false);
  let attemptedSave = $state(false);
  let opener: HTMLElement | null = $state(null);
  const parsed = $derived(
    gatheringResponseFormat.safeParse(
      draft.map(({ fieldId, label, required, characterLimit }) => ({
        fieldId,
        label,
        required,
        characterLimit,
      })),
    ),
  );
  const issues = $derived(
    attemptedSave && !parsed.success ? parsed.error.issues : [],
  );
  const errorId = `${id}-error`;
  const formId = `${id}-form`;
  const presets = $derived([
    { value: "short", label: m.gathering_format_short() },
    { value: "long", label: m.gathering_format_long() },
  ]);

  function start() {
    draft = fields.map((field) => ({ ...field, expanded: true }));
    attemptedSave = false;
    open = true;
  }
  async function add() {
    const fieldId = crypto.randomUUID();
    draft.push({
      fieldId,
      label: "",
      required: false,
      characterLimit: short,
      expanded: true,
    });
    await tick();
    document.getElementById(`${id}-${fieldId}-label`)?.focus();
  }
  async function focusFieldToggle(fieldId: string) {
    await tick();
    document.getElementById(`${id}-${fieldId}-toggle`)?.focus();
  }
  async function move({ index, offset }: { index: number; offset: 1 | -1 }) {
    if (index + offset >= 0 && index + offset < draft.length) {
      const field = draft[index];
      draft.splice(index, 1);
      draft.splice(index + offset, 0, field);
      await focusFieldToggle(field.fieldId);
    }
  }
  async function remove(index: number) {
    if (draft.length <= 1) return;
    const adjacent = draft[index === draft.length - 1 ? index - 1 : index + 1];
    draft.splice(index, 1);
    await focusFieldToggle(adjacent.fieldId);
  }
  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (disabled) return;
    if (!parsed.success) {
      attemptedSave = true;
      let firstInvalid: string | undefined;
      for (const issue of parsed.error.issues) {
        const [index, property] = issue.path;
        const field = typeof index === "number" ? draft.at(index) : undefined;
        if (field) {
          field.expanded = true;
          if (property === "label" || property === "characterLimit")
            firstInvalid ??= `${id}-${field.fieldId}-${property}`;
        }
      }
      await tick();
      if (firstInvalid) document.getElementById(firstInvalid)?.focus();
      return;
    }
    onsave(parsed.data);
    open = false;
  }
</script>

<Button
  variant="neutral"
  size="control"
  bind:ref={opener}
  aria-haspopup="dialog"
  {disabled}
  onclick={start}>{m.gathering_format_edit()}</Button
>
<Dialog
  bind:open
  {dir}
  wide
  title={m.gathering_format_edit()}
  description={m.gathering_format_help()}
  closeLabel={m.workspace_dialog_close()}
  contentProps={{
    onCloseAutoFocus: (event: Event) => {
      if (opener?.isConnected && !disabled) {
        event.preventDefault();
        opener.focus({ preventScroll: true });
      }
    },
  }}
>
  <form class="grid gap-4" id={formId} novalidate onsubmit={save}>
    {#each draft as field, index (field.fieldId)}
      {@const name = m.gathering_format_field({ number: index + 1 })}
      {@const invalidLabel = issues.some(
        (issue) => issue.path[0] === index && issue.path[1] === "label",
      )}
      {@const invalidLimit = issues.some(
        (issue) =>
          issue.path[0] === index && issue.path[1] === "characterLimit",
      )}
      <section
        class="
          grid gap-4 rounded-xl border border-sky-lighter bg-sky-off-white
          p-[clamp(12px,3vw,24px)] shadow-(--shadow-surface-subtle)
        "
        aria-label={name}
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="quiet"
            size="control"
            id={`${id}-${field.fieldId}-toggle`}
            aria-expanded={field.expanded}
            onclick={() => (field.expanded = !field.expanded)}
            >{name}<Icon name="chevron" size={16} /></Button
          >
          <div class="flex flex-wrap items-center gap-2">
            <Button
              variant="quiet"
              size="icon"
              aria-label={m.gathering_format_up({ name })}
              disabled={index === 0}
              onclick={() => move({ index, offset: -1 })}
              ><span class="icon-[lucide--arrow-up]" aria-hidden="true"
              ></span></Button
            >
            <Button
              variant="quiet"
              size="icon"
              aria-label={m.gathering_format_down({ name })}
              disabled={index === draft.length - 1}
              onclick={() => move({ index, offset: 1 })}
              ><span class="icon-[lucide--arrow-down]" aria-hidden="true"
              ></span></Button
            >
            <Button
              variant="quiet"
              size="icon"
              aria-label={m.selector_remove_selection({ name })}
              disabled={draft.length <= 1}
              onclick={() => remove(index)}
              ><span class="icon-[lucide--trash-2]" aria-hidden="true"
              ></span></Button
            >
          </div>
        </div>
        {#if field.expanded}
          <Field
            label={m.gathering_format_label()}
            bind:value={field.label}
            inputProps={{
              id: `${id}-${field.fieldId}-label`,
              "aria-invalid": invalidLabel || undefined,
              "aria-describedby": invalidLabel ? errorId : undefined,
              maxlength: 200,
              required: true,
            }}
          />
          <div
            class="
              flex flex-wrap items-end gap-4
              [&>.selection-root]:max-w-88 [&>.selection-root]:flex-[1_1_14rem]
            "
          >
            <Select
              type="single"
              variant="field"
              {dir}
              label={m.gathering_format_preset()}
              items={presets}
              placeholder={m.gathering_format_custom()}
              value={field.characterLimit === short
                ? "short"
                : field.characterLimit === long
                  ? "long"
                  : undefined}
              onValueChange={(value) => {
                if (value === "short") field.characterLimit = short;
                else if (value === "long") field.characterLimit = long;
              }}
            />
            <NumberField
              label={m.gathering_format_limit()}
              id={`${id}-${field.fieldId}-characterLimit`}
              aria-invalid={invalidLimit || undefined}
              aria-describedby={invalidLimit ? errorId : undefined}
              min={1}
              max={MAX_GATHERING_TEXT_LENGTH}
              step={1}
              required
              bind:value={field.characterLimit}
            />
            <CheckboxField
              label={m.gathering_format_required()}
              bind:checked={field.required}
            />
          </div>
        {:else}<p class="wrap-anywhere">{field.label}</p>{/if}
      </section>
    {/each}
    <div>
      <Button
        variant="quiet"
        size="control"
        disabled={draft.length >= MAX_GATHERING_FIELDS}
        onclick={add}
        ><Icon name="plus" size={16} />{m.gathering_format_add()}</Button
      >
    </div>
    {#if issues.length}<p class="text-red-darkest" role="alert" id={errorId}>
        {m.gathering_format_invalid({ max: MAX_GATHERING_TEXT_LENGTH })}
      </p>{/if}
  </form>
  {#snippet footer()}<Button
      variant="solid"
      {disabled}
      type="submit"
      form={formId}>{m.gathering_format_save()}</Button
    >{/snippet}
</Dialog>
