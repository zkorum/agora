import type { ComponentProps } from "svelte";
import { describe, expect, expectTypeOf, test } from "vitest";

import type Combobox from "./combobox.svelte";
import type Select from "./select.svelte";
import {
  type ComboboxProps,
  filterSelectionItems,
  findSelectionItem,
  getSelectionItems,
  normalizeSelectionSearch,
  resolveMultipleSelectionChange,
  resolveSingleSelectionChange,
  type SelectProps,
} from "./selection.js";
import type { SelectItem } from "./view-types.js";

type Value = "fr" | "ja" | "es";
type Item = SelectItem<Value> & { category: string };
const items: readonly Item[] = [
  {
    value: "fr",
    label: "Français",
    searchText: "French fr",
    category: "language",
  },
  {
    value: "ja",
    label: "日本語",
    searchText: "Japanese ja",
    category: "language",
  },
  {
    value: "es",
    label: "Español",
    description: "Spanish language",
    disabled: true,
    category: "language",
  },
];

type Assignable<Source, Target> = [Source] extends [Target] ? true : false;

describe("selection contracts", () => {
  test("component props retain the correlated value mode and literal identifiers", () => {
    type SelectComponentProps = ComponentProps<typeof Select<Item>>;
    type ComboboxComponentProps = ComponentProps<typeof Combobox<Item>>;
    expectTypeOf<SelectComponentProps>().toExtend<SelectProps<Item>>();
    expectTypeOf<ComboboxComponentProps>().toExtend<ComboboxProps<Item>>();
    expectTypeOf<
      Extract<SelectProps<Item>, { type: "single" }>["value"]
    >().toEqualTypeOf<Value | undefined>();
    expectTypeOf<
      Extract<ComboboxProps<Item>, { type: "multiple" }>["value"]
    >().toEqualTypeOf<Value[]>();
    expectTypeOf<
      Assignable<
        {
          type: "single";
          value: Value[];
          items: readonly Item[];
          placeholder: string;
        },
        SelectComponentProps
      >
    >().toEqualTypeOf<false>();
    type SingleProps = Extract<SelectComponentProps, { type: "single" }>;
    type WrongCallback = Omit<SingleProps, "onValueChange"> & {
      onValueChange: (value: Value[]) => void;
    };
    expectTypeOf<
      Assignable<WrongCallback, SingleProps>
    >().toEqualTypeOf<false>();
    expectTypeOf<
      Extract<
        keyof NonNullable<SelectComponentProps["triggerProps"]>,
        "disabled" | "dir" | "name" | "form"
      >
    >().toEqualTypeOf<never>();
    expectTypeOf<
      Extract<
        keyof NonNullable<ComboboxComponentProps["inputProps"]>,
        | "disabled"
        | "dir"
        | "placeholder"
        | "name"
        | "required"
        | "form"
        | "clearOnDeselect"
      >
    >().toEqualTypeOf<never>();
    expectTypeOf<
      Assignable<
        {
          type: "multiple";
          value: Value;
          items: readonly Item[];
          placeholder: string;
        },
        ComboboxComponentProps
      >
    >().toEqualTypeOf<false>();
    expectTypeOf<
      Assignable<
        {
          type: "single";
          value: "unknown";
          items: readonly Item[];
          placeholder: string;
        },
        SelectComponentProps
      >
    >().toEqualTypeOf<false>();
  });

  test("typed lookups preserve caller metadata and explicitly represent absence", () => {
    const selected = findSelectionItem({ items, value: "fr" });
    expectTypeOf(selected).toEqualTypeOf<Item | undefined>();
    expect(selected?.category).toBe("language");
    expect(findSelectionItem({ items, value: "" })).toBeUndefined();
    expect(findSelectionItem({ items, value: undefined })).toBeUndefined();
    expect(findSelectionItem({ items, value: "unknown" })).toBeUndefined();
  });

  test("multiple changes retain order, deduplicate and preserve existing disabled values", () => {
    const change = resolveMultipleSelectionChange({
      items,
      previous: ["es"],
      values: ["ja", "fr", "ja", "es"],
    });
    expect(change.accepted).toBe(true);
    if (change.accepted) {
      expectTypeOf(change.value).toEqualTypeOf<Value[]>();
      expect(change.value).toEqual(["ja", "fr", "es"]);
    }
    expect(items.map((item) => item.value)).toEqual(["fr", "ja", "es"]);
  });

  test("single changes reject disabled or unknown choices rather than clearing valid state", () => {
    expect(
      resolveSingleSelectionChange({ items, previous: "fr", value: "es" }),
    ).toEqual({ accepted: false });
    expect(
      resolveSingleSelectionChange({ items, previous: "fr", value: "unknown" }),
    ).toEqual({ accepted: false });
    expect(
      resolveSingleSelectionChange({ items, previous: "es", value: "" }),
    ).toEqual({ accepted: false });
    expect(
      resolveSingleSelectionChange({ items, previous: "es", value: "fr" }),
    ).toEqual({ accepted: true, value: "fr" });
    expect(
      resolveSingleSelectionChange({ items, previous: "fr", value: "" }),
    ).toEqual({ accepted: true, value: undefined });
  });

  test("multiple row interactions cannot add or remove disabled values", () => {
    expect(
      resolveMultipleSelectionChange({
        items,
        previous: ["fr"],
        values: ["fr", "es"],
      }),
    ).toEqual({ accepted: false });
    expect(
      resolveMultipleSelectionChange({
        items,
        previous: ["es", "fr"],
        values: ["fr"],
      }),
    ).toEqual({ accepted: false });
    expect(
      resolveMultipleSelectionChange({
        items,
        previous: ["fr"],
        values: ["ja", "unknown"],
      }),
    ).toEqual({ accepted: false });
    expect(
      resolveMultipleSelectionChange({
        items,
        previous: ["es", "fr"],
        values: ["es", "ja"],
      }),
    ).toEqual({ accepted: true, value: ["es", "ja"] });
    expect(
      resolveMultipleSelectionChange({ items, previous: ["fr"], values: [] }),
    ).toEqual({ accepted: true, value: [] });
  });

  test("selected item presentation uses canonical order and caller metadata", () => {
    const selected = getSelectionItems({ items, values: ["ja", "fr"] });
    expectTypeOf(selected).toEqualTypeOf<Item[]>();
    expect(selected).toEqual([items[0], items[1]]);
  });

  test("option indexing treats object-property-like IDs as ordinary data", () => {
    const options = [
      { value: "__proto__", label: "First" },
      { value: "constructor", label: "Second" },
    ];
    expect(
      resolveMultipleSelectionChange({
        items: options,
        previous: [],
        values: ["__proto__", "constructor"],
      }),
    ).toEqual({ accepted: true, value: ["__proto__", "constructor"] });
  });

  test("large multiple changes do not repeatedly scan all options", () => {
    function readsFor(size: number): number {
      let reads = 0;
      const options: SelectItem[] = [];
      const values: string[] = [];
      for (let index = 0; index < size; index++) {
        const value = String(index);
        options.push({
          get value() {
            reads++;
            return value;
          },
          label: value,
        });
        values.push(value);
      }
      const result = resolveMultipleSelectionChange({
        items: options,
        previous: [],
        values,
      });
      expect(result.accepted).toBe(true);
      return reads;
    }
    expect(readsFor(128)).toBeLessThanOrEqual(readsFor(64) * 3);
  });
});

describe("selection search", () => {
  test("normalizes whitespace, case and accents without changing visible labels", () => {
    expect(normalizeSelectionSearch("  FRANÇAIS  ")).toBe("francais");
    expect(filterSelectionItems({ items, query: "francais" })).toEqual([
      items[0],
    ]);
    expect(items[0]?.label).toBe("Français");
  });

  test("searches aliases, descriptions and native-script labels", () => {
    expect(filterSelectionItems({ items, query: "french fr" })).toEqual([
      items[0],
    ]);
    expect(filterSelectionItems({ items, query: "Japanese" })).toEqual([
      items[1],
    ]);
    expect(filterSelectionItems({ items, query: "日本語" })).toEqual([
      items[1],
    ]);
    expect(filterSelectionItems({ items, query: "spanish language" })).toEqual([
      items[2],
    ]);
  });

  test("empty search keeps canonical options and no match returns an empty result", () => {
    expect(filterSelectionItems({ items, query: "   " })).toBe(items);
    expect(
      filterSelectionItems({ items, query: "unavailable-language" }),
    ).toEqual([]);
    expect(filterSelectionItems({ items: [], query: "French" })).toEqual([]);
  });
});
