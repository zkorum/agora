import type { Combobox, Select } from "bits-ui";
import type { Snippet } from "svelte";

import type { SelectItem } from "./view-types.js";

type SelectionValue<Value extends string> =
  | {
      type: "single";
      value: Value | undefined;
      onValueChange?: (value: Value | undefined) => void;
    }
  | {
      type: "multiple";
      value: Value[];
      onValueChange?: (value: Value[]) => void;
    };

type RootOwnedProps =
  | "type"
  | "value"
  | "onValueChange"
  | "children"
  | "disabled"
  | "items"
  | "allowDeselect"
  | "open"
  | "onOpenChange";

export interface SelectionPresentationProps<Item extends SelectItem> {
  items: readonly Item[];
  placeholder: string;
  label?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  clearable?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  dir?: "ltr" | "rtl";
  variant?: "compact" | "field";
  triggerClass?: string;
  contentClass?: string;
  leading?: Snippet<[Item | undefined]>;
  indicator?: Snippet;
  triggerLabel?: Snippet<[Item]>;
  selectionLabel?: Snippet<[readonly Item[]]>;
  itemLabel?: Snippet<[Item]>;
  status?: { kind: "loading" } | { kind: "error"; message: string };
}

export type SelectProps<Item extends SelectItem> =
  SelectionPresentationProps<Item> &
    SelectionValue<NoInfer<Item["value"]>> & {
      rootProps?: Omit<Select.RootProps, RootOwnedProps>;
      triggerProps?: Omit<
        Select.TriggerProps,
        "children" | "class" | "ref" | "disabled" | "dir" | "form" | "name"
      >;
      contentProps?: Omit<Select.ContentProps, "children" | "class" | "ref">;
      portalProps?: Omit<Select.PortalProps, "children">;
      triggerRef?: Select.TriggerProps["ref"];
      contentRef?: Select.ContentProps["ref"];
    };

export type ComboboxProps<Item extends SelectItem> = Omit<
  SelectionPresentationProps<Item>,
  "triggerLabel"
> &
  SelectionValue<NoInfer<Item["value"]>> & {
    rootProps?: Omit<Combobox.RootProps, RootOwnedProps | "inputValue">;
    inputProps?: Omit<
      Combobox.InputProps,
      | "children"
      | "class"
      | "ref"
      | "defaultValue"
      | "placeholder"
      | "disabled"
      | "dir"
      | "name"
      | "required"
      | "form"
      | "clearOnDeselect"
    >;
    triggerProps?: Omit<
      Combobox.TriggerProps,
      "children" | "class" | "ref" | "disabled" | "dir" | "form" | "name"
    >;
    contentProps?: Omit<Combobox.ContentProps, "children" | "class" | "ref">;
    portalProps?: Omit<Combobox.PortalProps, "children">;
    inputRef?: Combobox.InputProps["ref"];
    triggerRef?: Combobox.TriggerProps["ref"];
    contentRef?: Combobox.ContentProps["ref"];
  };

export function findSelectionItem<Item extends SelectItem>({
  items,
  value,
}: {
  items: readonly Item[];
  value: string | undefined;
}): Item | undefined {
  // Empty strings belong to Bits UI's unselected state, not option identifiers.
  return value ? items.find((item) => item.value === value) : undefined;
}

export type SelectionChange<Value> =
  | { accepted: false }
  | { accepted: true; value: Value };

export function resolveSingleSelectionChange<Item extends SelectItem>({
  items,
  previous,
  value,
}: {
  items: readonly Item[];
  previous: string | undefined;
  value: string;
}): SelectionChange<Item["value"] | undefined> {
  if (value === "") {
    const current = findSelectionItem({ items, value: previous });
    return current?.disabled
      ? { accepted: false }
      : { accepted: true, value: undefined };
  }
  const item = findSelectionItem({ items, value });
  return !item || item.disabled
    ? { accepted: false }
    : { accepted: true, value: item.value };
}

export function resolveMultipleSelectionChange<Item extends SelectItem>({
  items,
  previous,
  values,
}: {
  items: readonly Item[];
  previous: readonly string[];
  values: readonly string[];
}): SelectionChange<Item["value"][]> {
  const byValue = new Map<string, Item>();
  for (const item of items) {
    if (item.value !== "" && !byValue.has(item.value)) {
      byValue.set(item.value, item);
    }
  }
  const before = new Set(previous);
  const after = new Set(values);
  const selected: Item["value"][] = [];
  for (const value of after) {
    const item = byValue.get(value);
    if (!item || (item.disabled && !before.has(value))) {
      return { accepted: false };
    }
    selected.push(item.value);
  }
  for (const value of before) {
    if (!after.has(value) && byValue.get(value)?.disabled) {
      return { accepted: false };
    }
  }
  return { accepted: true, value: selected };
}

export function getSelectionItems<Item extends SelectItem>({
  items,
  values,
}: {
  items: readonly Item[];
  values: readonly string[];
}): Item[] {
  const selected = new Set(values);
  return items.filter((item) => selected.has(item.value));
}

export function normalizeSelectionSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLocaleLowerCase();
}

export function filterSelectionItems<Item extends SelectItem>({
  items,
  query,
}: {
  items: readonly Item[];
  query: string;
}): readonly Item[] {
  const terms = normalizeSelectionSearch(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return items;
  return items.filter((item) => {
    const searchable = normalizeSelectionSearch(
      `${item.label} ${item.description ?? ""} ${item.searchText ?? ""}`,
    );
    return terms.every((term) => searchable.includes(term));
  });
}
