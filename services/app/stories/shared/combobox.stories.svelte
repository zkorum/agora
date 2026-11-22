<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import type { ComponentProps, Snippet } from "svelte";

  import Combobox from "$ui/shared/combobox.svelte";

  import SelectionFixture from "./selection-fixture.svelte";

  type Args = Omit<ComponentProps<typeof SelectionFixture>, "component">;
  const { Story } = defineMeta<Snippet<[Args, unknown]>, typeof Combobox>({
    title: "Shared/Combobox",
    component: Combobox,
    args: {
      items: [
        { value: "apple", label: "Apple" },
        { value: "banana", label: "Banana" },
        { value: "cherry", label: "Cherry" },
        { value: "date", label: "Date", disabled: true },
      ],
    },
  });
</script>

{#snippet template(args: Args)}
  <SelectionFixture {...args} component="combobox" />
{/snippet}

<Story name="Default" {template} />
<Story
  name="Untrusted text"
  args={{
    items: [
      {
        value: "unsafe",
        label: "<img src=x onerror=alert(1)>",
        description: "\u003Cscript>alert(1)\u003C/script>",
      },
      { value: "safe", label: "Safe" },
    ],
    initialValue: "unsafe",
  }}
  {template}
/>
<Story name="Multiple" args={{ multiple: true }} {template} />
<Story
  name="Disabled selected"
  args={{ multiple: true, initialValues: ["apple", "date"] }}
  {template}
/>
<Story
  name="Long options"
  args={{
    items: Array.from({ length: 40 }, (_, index) => ({
      value: `option-${index.toString()}`,
      label: `Option ${index.toString()}`,
    })),
    initialValue: "option-0",
  }}
  {template}
/>
<Story
  name="Required form single"
  args={{ requiredForm: true, initialValue: "" }}
  {template}
/>
<Story
  name="Required form multiple"
  args={{ requiredForm: true, multiple: true, initialValues: [] }}
  {template}
/>
<Story name="Compact" args={{ variant: "compact" }} {template} />
<Story name="Disabled" args={{ disabled: true }} {template} />
<Story name="Disabled while open" args={{ initiallyOpen: true }} {template} />
<Story
  name="Loading cached options"
  args={{ status: { kind: "loading" } }}
  {template}
/>
<Story
  name="Search aliases"
  args={{
    items: [
      { value: "en", label: "English", searchText: "English en" },
      {
        value: "fr",
        label: "Français",
        searchText: "French fr",
        description: "Langue française",
      },
      { value: "ja", label: "日本語", searchText: "Japanese ja" },
    ],
    initialValue: "en",
  }}
  {template}
/>
<Story name="Empty" args={{ items: [], initialValue: "" }} {template} />
<Story
  name="Loading"
  args={{ items: [], status: { kind: "loading" }, initialValue: "" }}
  {template}
/>
<Story
  name="Error"
  args={{
    items: [],
    status: { kind: "error", message: "Options could not be loaded." },
    initialValue: "",
  }}
  {template}
/>
<Story name="RTL" args={{ dir: "rtl" }} {template} />
<Story name="Inside dialog" args={{ insideDialog: true }} {template} />
<Story name="External update" {template} />
<Story name="Clearable" args={{ clearable: true }} {template} />
