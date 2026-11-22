<script lang="ts">
  import { untrack } from "svelte";

  import Button from "$ui/shared/button.svelte";
  import Combobox from "$ui/shared/combobox.svelte";
  import Dialog from "$ui/shared/dialog.svelte";
  import Select from "$ui/shared/select.svelte";
  import type { SelectionPresentationProps } from "$ui/shared/selection.js";
  import type { SelectItem } from "$ui/shared/view-types.js";

  let {
    component,
    items,
    multiple = false,
    variant = "field",
    disabled = false,
    dir = "ltr",
    insideDialog = false,
    initialValue = "apple",
    initialValues = ["apple"],
    initiallyOpen = false,
    status,
    clearable = false,
    hint,
    error,
    requiredForm = false,
  }: {
    component: "select" | "combobox";
    items: readonly SelectItem[];
    multiple?: boolean;
    variant?: "field" | "compact";
    disabled?: boolean;
    dir?: "ltr" | "rtl";
    insideDialog?: boolean;
    initialValue?: string;
    initialValues?: string[];
    initiallyOpen?: boolean;
    status?: SelectionPresentationProps<SelectItem>["status"];
    clearable?: boolean;
    hint?: string;
    error?: string;
    requiredForm?: boolean;
  } = $props();

  let singleValue = $state(untrack(() => initialValue));
  let multipleValue = $state(untrack(() => [...initialValues]));
  let submittedValues = $state<string[]>([]);
  let controlDisabled = $derived(disabled);
  let controlOpen = $derived(initiallyOpen);
  let dialogOpen = $state(true);
  const label = $derived(multiple ? "Fruits" : "Fruit");
  const rootProps = $derived(
    requiredForm ? { name: "fruit", required: true } : undefined,
  );

  function changeSingle(next: string | undefined): void {
    singleValue = next ?? "";
  }

  function changeMultiple(next: string[]): void {
    multipleValue = next;
  }

  function submit(event: SubmitEvent): void {
    event.preventDefault();
    const form = event.currentTarget;
    if (!(form instanceof HTMLFormElement)) return;
    submittedValues = new FormData(form)
      .getAll("fruit")
      .filter((value) => typeof value === "string");
  }
</script>

{#snippet controls()}
  {#if component === "select"}
    {#if multiple}
      <Select
        type="multiple"
        {items}
        {variant}
        disabled={controlDisabled}
        bind:open={controlOpen}
        {dir}
        {clearable}
        {status}
        {hint}
        {error}
        {label}
        {rootProps}
        placeholder="Choose fruits"
        value={multipleValue}
        onValueChange={changeMultiple}
      />
    {:else}
      <Select
        type="single"
        {items}
        {variant}
        disabled={controlDisabled}
        bind:open={controlOpen}
        {dir}
        {clearable}
        {status}
        {hint}
        {error}
        {label}
        {rootProps}
        placeholder="Choose a fruit"
        value={singleValue || undefined}
        onValueChange={changeSingle}
      />
    {/if}
  {:else if multiple}
    <Combobox
      type="multiple"
      {items}
      {variant}
      disabled={controlDisabled}
      bind:open={controlOpen}
      {dir}
      {clearable}
      {status}
      {hint}
      {error}
      {label}
      {rootProps}
      placeholder="Search fruits"
      value={multipleValue}
      onValueChange={changeMultiple}
    />
  {:else}
    <Combobox
      type="single"
      {items}
      {variant}
      disabled={controlDisabled}
      bind:open={controlOpen}
      {dir}
      {clearable}
      {status}
      {hint}
      {error}
      {label}
      {rootProps}
      placeholder="Search fruits"
      value={singleValue || undefined}
      onValueChange={changeSingle}
    />
  {/if}
  <output class="wrap-anywhere" aria-label="Selected values"
    >{multiple ? multipleValue.join(",") : singleValue}</output
  >
  <div class="flex flex-wrap gap-2">
    <Button
      variant="neutral"
      onclick={() => {
        singleValue = "cherry";
        multipleValue = ["cherry"];
      }}>Choose Cherry</Button
    >
    <Button variant="neutral">Outside action</Button>
    {#if multiple}
      <Button
        variant="neutral"
        onclick={() => {
          multipleValue.splice(0, multipleValue.length, "cherry");
        }}>Mutate selection</Button
      >
      <Button
        variant="neutral"
        onclick={() => {
          multipleValue.splice(0, multipleValue.length, "apple");
        }}>Mutate selection back</Button
      >
    {/if}
    <Button
      variant="neutral"
      onclick={() => {
        controlOpen = !controlOpen;
      }}>Toggle popup</Button
    >
    {#if initiallyOpen}
      <Button
        variant="neutral"
        onclick={() => {
          controlDisabled = true;
        }}>Disable control</Button
      >
    {/if}
  </div>
{/snippet}

{#snippet example()}
  <div class="flex w-full max-w-[724px] flex-col items-start gap-4" {dir}>
    {#if requiredForm}
      <form
        class="flex w-full flex-col items-start gap-4"
        aria-label="Selection form"
        onsubmit={submit}
      >
        {@render controls()}
        <Button type="submit">Submit selection</Button>
        <output class="wrap-anywhere" aria-label="Submitted values"
          >{submittedValues.join(",")}</output
        >
      </form>
    {:else}
      {@render controls()}
    {/if}
  </div>
{/snippet}

{#if insideDialog}
  <Button
    onclick={() => {
      dialogOpen = true;
    }}>Open selection dialog</Button
  >
  <Dialog
    title="Selection dialog"
    description="Choose a fruit."
    {dir}
    bind:open={dialogOpen}
  >
    {@render example()}
  </Dialog>
{:else}
  {@render example()}
{/if}
