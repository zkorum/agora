<script lang="ts" generics="Item extends SelectItem">
  import { Combobox } from "bits-ui";

  import * as m from "#lib/paraglide/messages.js";

  import Button from "./button.svelte";
  import Icon from "./icon.svelte";
  import {
    type ComboboxProps,
    filterSelectionItems,
    findSelectionItem,
    getSelectionItems,
    resolveMultipleSelectionChange,
    resolveSingleSelectionChange,
  } from "./selection.js";
  import { selectionClasses } from "./selection-classes.js";
  import SelectionOption from "./selection-option.svelte";
  import SelectionSurface from "./selection-surface.svelte";
  import type { SelectItem } from "./view-types.js";

  let {
    value = $bindable(),
    open = $bindable(false),
    inputRef = $bindable(null),
    triggerRef = $bindable(null),
    contentRef = $bindable(null),
    ...props
  }: ComboboxProps<Item> = $props();

  const uid = $props.id();
  const selectionKey = $derived(JSON.stringify(value));
  // Tracking selection contents resets draft overrides, including on undo, without copying state in an effect.
  let searchDraft: { selection: string | undefined; text?: string } = $derived({
    selection: selectionKey,
  });
  let controlRef = $state<HTMLDivElement | undefined>();
  const variant = $derived(props.variant ?? "field");
  const disabled = $derived(props.disabled ?? false);
  const selectionDisabled = $derived(disabled || props.status !== undefined);
  const inputProps = $derived(props.inputProps ?? {});
  const triggerProps = $derived(props.triggerProps ?? {});
  const contentProps = $derived(props.contentProps ?? {});
  const rootProps = $derived(props.rootProps ?? {});
  const id = $derived(inputProps.id ?? uid);
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
  const query = $derived(open ? searchDraft.text : undefined);
  const visibleItems = $derived(
    filterSelectionItems({ items, query: query ?? "" }),
  );
  const inputValue = $derived(
    query ?? (props.type === "single" ? (selectedItem?.label ?? "") : ""),
  );
  const describedby = $derived(
    [
      inputProps["aria-describedby"],
      props.hint ? `${id}-hint` : undefined,
      props.error ? `${id}-error` : undefined,
    ]
      .filter(Boolean)
      .join(" ") || undefined,
  );

  function commitSingle(next: Item["value"] | undefined): void {
    if (props.type !== "single" || selectionDisabled) return;
    value = next;
    searchDraft = { selection: selectionKey };
    props.onValueChange?.(next);
  }

  function commitMultiple(next: Item["value"][]): void {
    if (props.type !== "multiple" || selectionDisabled) return;
    value = next;
    searchDraft = { selection: selectionKey };
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
    inputRef?.focus({ preventScroll: true });
  }

  function changeOpen(next: boolean): void {
    open = next;
    if (!next) searchDraft = { selection: selectionKey };
    props.onOpenChange?.(next);
    if (next) selectCommittedLabel();
  }

  function selectCommittedLabel(): void {
    if (disabled || props.type !== "single" || searchDraft.text !== undefined)
      return;
    if (inputRef && inputRef instanceof HTMLInputElement) inputRef.select();
  }

  function focus(
    event: Parameters<NonNullable<Combobox.InputProps["onfocus"]>>[0],
  ): void {
    inputProps.onfocus?.(event);
    if (!event.defaultPrevented) selectCommittedLabel();
  }

  function search(
    event: Parameters<NonNullable<Combobox.InputProps["oninput"]>>[0],
  ): void {
    inputProps.oninput?.(event);
    if (event.defaultPrevented || disabled) return;
    searchDraft = {
      selection: selectionKey,
      text: event.currentTarget.value,
    };
    if (!open) changeOpen(true);
  }

  function activate(
    event: Parameters<NonNullable<Combobox.InputProps["onclick"]>>[0],
  ): void {
    inputProps.onclick?.(event);
    if (event.defaultPrevented || disabled) return;
    if (!open) changeOpen(true);
    selectCommittedLabel();
  }

  function clear(): void {
    if (selectionDisabled) return;
    if (props.type === "single") commitSingle(undefined);
    else commitMultiple([]);
    inputRef?.focus({ preventScroll: true });
  }

  function anchor(node: HTMLDivElement): () => void {
    controlRef = node;
    return () => {
      controlRef = undefined;
    };
  }

  function completeOpen(next: boolean): void {
    if (!next && !open) searchDraft = { selection: selectionKey };
    rootProps.onOpenChangeComplete?.(next);
  }

  function focusInput(): void {
    inputRef?.focus({ preventScroll: true });
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
    {#if props.selectionLabel && selectedItems.length > 0}
      {@render props.selectionLabel(selectedItems)}
    {/if}
    <div
      {@attach anchor}
      class={[
        selectionClasses.control,
        variant === "field"
          ? selectionClasses.fieldControl
          : selectionClasses.compactControl,
        props.triggerClass,
      ]}
      data-disabled={disabled ? "" : undefined}
      aria-invalid={props.error ? "true" : undefined}
    >
      {@render props.leading?.(selectedItem)}
      <Combobox.Input
        {...inputProps}
        {id}
        {dir}
        bind:ref={inputRef}
        aria-labelledby={inputProps["aria-labelledby"] ??
          (inputProps["aria-label"] || !props.label
            ? undefined
            : `${id}-label`)}
        class="
          w-full min-w-0 flex-1 cursor-text border-0 bg-transparent p-0
          text-inherit outline-none
          placeholder:text-sky-dark placeholder:opacity-100
        "
        placeholder={props.type === "multiple" && selectedItems.length > 0
          ? m.selector_selected_count({ count: selectedItems.length })
          : props.placeholder}
        aria-describedby={describedby}
        aria-invalid={props.error ? "true" : inputProps["aria-invalid"]}
        oninput={search}
        onclick={activate}
        onfocus={focus}
      >
        {#snippet child({ props: inputAttributes })}
          {#if inputProps.child}
            {@render inputProps.child({
              props: { ...inputAttributes, value: inputValue },
            })}
          {:else}
            <!-- Bits writes the latest option label internally, including in multiple mode.
                 Keep the editable query separate while retaining its events, ARIA and ref attachment. -->
            <input {...inputAttributes} value={inputValue} />
          {/if}
        {/snippet}
      </Combobox.Input>
      {#if props.clearable && !rootProps.required && selectedItems.length > 0}
        <Button
          variant="unstyled"
          class={[selectionClasses.action, "pointer-coarse:-my-2.5"]}
          disabled={selectionDisabled}
          aria-label={m.selector_clear()}
          onclick={clear}><Icon name="close" size={16} /></Button
        >
      {/if}
      <Combobox.Trigger
        {...triggerProps}
        bind:ref={triggerRef}
        {dir}
        class={[selectionClasses.action, "pointer-coarse:-my-2.5"]}
        aria-label={triggerProps["aria-label"] ?? m.selector_search()}
        tabindex={triggerProps.tabindex ?? -1}
      >
        {#if props.indicator}{@render props.indicator()}{:else}<Icon
            name="chevron"
            size={16}
          />{/if}
      </Combobox.Trigger>
    </div>
  </SelectionSurface>
  {#if props.type === "multiple" && multipleValue.length === 0 && rootProps.required && rootProps.name}
    <!-- Bits 2.18 omits its named validation inputs for an empty multiple Combobox. -->
    <input
      class="sr-only"
      value=""
      required
      {disabled}
      tabindex="-1"
      aria-hidden="true"
      onfocus={focusInput}
      oninvalid={focusInput}
    />
  {/if}
  <Combobox.Portal {...props.portalProps}>
    <Combobox.Content
      {...contentProps}
      bind:ref={contentRef}
      {dir}
      customAnchor={contentProps.customAnchor ?? controlRef}
      align={contentProps.align ?? "start"}
      sideOffset={contentProps.sideOffset ?? 6}
      collisionPadding={contentProps.collisionPadding ?? 12}
      hideWhenDetached={contentProps.hideWhenDetached ?? true}
      class={[
        `
          [--selection-anchor-width:var(--bits-combobox-anchor-width)]
          [--selection-available-height:var(--bits-combobox-content-available-height)]
          [--selection-available-width:var(--bits-combobox-content-available-width)]
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
      {:else if visibleItems.length === 0}
        <p class={selectionClasses.status} role="status">
          {m.selector_no_results()}
        </p>
      {:else}
        <Combobox.Viewport class={selectionClasses.viewport}>
          {#each visibleItems as item (item.value)}
            {#snippet customLabel()}{@render props.itemLabel?.(item)}{/snippet}
            <Combobox.Item
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
            </Combobox.Item>
          {/each}
        </Combobox.Viewport>
      {/if}
    </Combobox.Content>
  </Combobox.Portal>
{/snippet}

{#if props.type === "single"}
  <Combobox.Root
    {...rootProps}
    type="single"
    items={rootItems}
    {inputValue}
    {disabled}
    allowDeselect={props.clearable === true && !rootProps.required}
    onOpenChangeComplete={completeOpen}
    bind:value={() => singleValue ?? "", changeSingle}
    bind:open={() => open, changeOpen}>{@render control()}</Combobox.Root
  >
{:else}
  <Combobox.Root
    {...rootProps}
    type="multiple"
    items={rootItems}
    {inputValue}
    {disabled}
    onOpenChangeComplete={completeOpen}
    bind:value={() => multipleValue, changeMultiple}
    bind:open={() => open, changeOpen}>{@render control()}</Combobox.Root
  >
{/if}
