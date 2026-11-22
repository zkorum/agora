<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import type { ComponentProps, Snippet } from "svelte";

  import Select from "$ui/shared/select.svelte";

  import SelectionFixture from "./selection-fixture.svelte";

  type Args = Omit<ComponentProps<typeof SelectionFixture>, "component">;
  const { Story } = defineMeta<Snippet<[Args, unknown]>, typeof Select>({
    title: "Shared/Select",
    component: Select,
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
  <SelectionFixture {...args} component="select" />
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
<Story name="Empty" args={{ items: [], initialValue: "" }} {template} />
<Story
  name="Loading"
  args={{ items: [], status: { kind: "loading" }, initialValue: "" }}
  {template}
/>
<Story
  name="Rich options"
  args={{
    items: [
      { value: "apple", label: "Apple", description: "A crisp orchard fruit." },
      {
        value: "banana",
        label: "Banana",
        description:
          "A long description that wraps onto another line in a narrow menu without hiding the option label.",
      },
      { value: "cherry", label: "Cherry", description: "A small stone fruit." },
      {
        value: "date",
        label: "Date",
        description: "Currently unavailable.",
        disabled: true,
      },
    ],
  }}
  {template}
/>
<Story name="RTL" args={{ dir: "rtl" }} {template} />
<Story name="Inside dialog" args={{ insideDialog: true }} {template} />
<Story name="Clearable" args={{ clearable: true }} {template} />
<Story
  name="Validation"
  args={{ hint: "Choose one fruit.", error: "A different fruit is required." }}
  {template}
/>
