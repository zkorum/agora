<script lang="ts" generics="Item extends SelectItem">
  import { Select } from "bits-ui";

  import * as m from "#lib/paraglide/messages.js";

  import Button from "./button.svelte";
  import Icon from "./icon.svelte";
  import {
    findSelectionItem,
    getSelectionItems,
    resolveMultipleSelectionChange,
    resolveSingleSelectionChange,
    type SelectProps,
  } from "./selection.js";
  import { selectionClasses } from "./selection-classes.js";
  import SelectionOption from "./selection-option.svelte";
  import SelectionSurface from "./selection-surface.svelte";
  import type { SelectItem } from "./view-types.js";

  let {
    value = $bindable(),
    open = $bindable(false),
    triggerRef = $bindable(null),
    contentRef = $bindable(null),
    ...props
  }: SelectProps<Item> = $props();

  const uid = $props.id();
  const variant = $derived(props.variant ?? "compact");
  const disabled = $derived(props.disabled ?? false);
  const selectionDisabled = $derived(disabled || props.status !== undefined);
  const triggerProps = $derived(props.triggerProps ?? {});
  const contentProps = $derived(props.contentProps ?? {});
  const rootProps = $derived(props.rootProps ?? {});
  const id = $derived(triggerProps.id ?? uid);
  const dir = $derived(props.dir ?? contentProps.dir ?? "ltr");
  const items = $derived([...props.items]);
  const rootItems = $derived(
    items.map((item) => ({
      value: item.value,
      label: item.label,
      disabled: selectionDisabled || item.disabled === true,
    })),
  );
  const singleValue = $derived(typeof value === "string" ? value : undefined);
  const multipleValue = $derived(Array.isArray(value) ? value : []);
  const selectedItem = $derived(
    findSelectionItem({ items, value: singleValue }),
  );
  const selectedItems = $derived(
    props.type === "multiple"
      ? getSelectionItems({ items, values: multipleValue })
      : selectedItem
        ? [selectedItem]
        : [],
  );
  const describedby = $derived(
    [
      triggerProps["aria-describedby"],
      props.hint ? `${id}-hint` : undefined,
      props.error ? `${id}-error` : undefined,
    ]
      .filter(Boolean)
      .join(" ") || undefined,
  );

  function commitSingle(next: Item["value"] | undefined): void {
    if (props.type !== "single" || selectionDisabled) return;
    value = next;
    props.onValueChange?.(next);
  }

  function commitMultiple(next: Item["value"][]): void {
    if (props.type !== "multiple" || selectionDisabled) return;
    value = next;
    props.onValueChange?.(next);
  }

  function changeSingle(next: string): void {
    const result = resolveSingleSelectionChange({
      items,
      previous: singleValue,
      value: next,
    });
    if (result.accepted) commitSingle(result.value);
  }

  function changeMultiple(next: string[]): void {
    const result = resolveMultipleSelectionChange({
      items,
      previous: multipleValue,
      values: next,
    });
    if (result.accepted) commitMultiple(result.value);
  }

  function removeSelection(removed: string): void {
    if (selectionDisabled || props.type !== "multiple") return;
    commitMultiple(multipleValue.filter((item) => item !== removed));
    triggerRef?.focus({ preventScroll: true });
  }

  function changeOpen(next: boolean): void {
    open = next;
    props.onOpenChange?.(next);
  }

  function clear(): void {
    if (selectionDisabled) return;
    if (props.type === "single") commitSingle(undefined);
    else commitMultiple([]);
    triggerRef?.focus({ preventScroll: true });
  }
</script>

{#snippet control()}
  <SelectionSurface
    {id}
    {dir}
    {variant}
    disabled={selectionDisabled}
    label={props.label}
    required={rootProps.required}
    hint={props.hint}
    error={props.error}
    selected={props.type === "multiple" ? selectedItems : []}
    onRemove={props.type === "multiple" ? removeSelection : undefined}
  >
    <div class="flex min-w-0 items-stretch gap-1.5">
      <Select.Trigger
        {...triggerProps}
        {id}
        {dir}
        bind:ref={triggerRef}
        aria-labelledby={triggerProps["aria-labelledby"] ??
          (triggerProps["aria-label"] || !props.label
            ? undefined
            : `${id}-label`)}
        aria-describedby={describedby}
        aria-invalid={props.error ? "true" : triggerProps["aria-invalid"]}
        class={[
          selectionClasses.control,
          variant === "field"
            ? selectionClasses.fieldControl
            : selectionClasses.compactControl,
          props.triggerClass,
        ]}
      >
        {@render props.leading?.(selectedItem)}
        <span class="min-w-0 flex-1 wrap-anywhere">
          {#if props.selectionLabel && selectedItems.length > 0}
            {@render props.selectionLabel(selectedItems)}
          {:else if props.type === "multiple" && selectedItems.length > 0}
            {m.selector_selected_count({ count: selectedItems.length })}
          {:else if selectedItem}
            {#if props.triggerLabel}{@render props.triggerLabel(
                selectedItem,
              )}{:else}{selectedItem.label}{/if}
          {:else}
            <span class="text-sky-dark">{props.placeholder}</span>
          {/if}
        </span>
        {#if props.indicator}{@render props.indicator()}{:else}<Icon
            name="chevron"
            size={16}
          />{/if}
      </Select.Trigger>
      {#if props.clearable && !rootProps.required && selectedItems.length > 0}
        <Button
          variant="unstyled"
          class={selectionClasses.action}
          disabled={selectionDisabled}
          aria-label={m.selector_clear()}
          onclick={clear}><Icon name="close" size={16} /></Button
        >
      {/if}
    </div>
  </SelectionSurface>
  <Select.Portal {...props.portalProps}>
    <Select.Content
      {...contentProps}
      bind:ref={contentRef}
      {dir}
      align={contentProps.align ?? "start"}
      sideOffset={contentProps.sideOffset ?? 6}
      collisionPadding={contentProps.collisionPadding ?? 12}
      hideWhenDetached={contentProps.hideWhenDetached ?? true}
      class={[
        `
          [--selection-anchor-width:var(--bits-select-anchor-width)]
          [--selection-available-height:var(--bits-select-content-available-height)]
          [--selection-available-width:var(--bits-select-content-available-width)]
        `,
        selectionClasses.content,
        variant === "field"
          ? selectionClasses.fieldContent
          : selectionClasses.compactContent,
        props.contentClass,
      ]}
    >
      {#if props.status?.kind === "loading"}
        <p class={selectionClasses.status} role="status">
          {m.selector_loading()}
        </p>
      {:else if props.status?.kind === "error"}
        <p class={selectionClasses.status} role="alert">
          {props.status.message}
        </p>
      {:else if items.length === 0}
        <p class={selectionClasses.status} role="status">
          {m.selector_empty()}
        </p>
      {:else}
        <Select.Viewport class={selectionClasses.viewport}>
          {#each items as item (item.value)}
            {#snippet customLabel()}{@render props.itemLabel?.(item)}{/snippet}
            <Select.Item
              value={item.value}
              label={item.label}
              disabled={selectionDisabled || item.disabled}
              aria-disabled={selectionDisabled || item.disabled === true
                ? true
                : undefined}
              class={selectionClasses.option}
            >
              {#snippet children({ selected })}
                <SelectionOption
                  label={item.label}
                  description={item.description}
                  {selected}
                  children={props.itemLabel ? customLabel : undefined}
                />
              {/snippet}
            </Select.Item>
          {/each}
        </Select.Viewport>
      {/if}
    </Select.Content>
  </Select.Portal>
{/snippet}

{#if props.type === "single"}
  <Select.Root
    {...rootProps}
    type="single"
    items={rootItems}
    {disabled}
    allowDeselect={props.clearable === true && !rootProps.required}
    bind:value={() => singleValue ?? "", changeSingle}
    bind:open={() => open, changeOpen}>{@render control()}</Select.Root
  >
{:else}
  <Select.Root
    {...rootProps}
    type="multiple"
    items={rootItems}
    {disabled}
    bind:value={() => multipleValue, changeMultiple}
    bind:open={() => open, changeOpen}>{@render control()}</Select.Root
  >
{/if}
