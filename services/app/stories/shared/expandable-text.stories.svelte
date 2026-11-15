<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import type { ComponentProps } from "svelte";

  import ExpandableText from "$ui/shared/expandable-text.svelte";

  type Args = ComponentProps<typeof ExpandableText> & { dir?: "ltr" | "rtl" };

  const longText = Array.from(
    { length: 8 },
    () =>
      "People should be able to read the full context before deciding how to respond. This proposal brings safer crossings, accessible pavements and more shade to everyday walking routes.",
  ).join("\n\n");

  const { Story } = defineMeta({
    title: "Shared/Expandable text",
    component: ExpandableText,
    render: template,
    args: { text: "A short statement needs no disclosure button." },
  });
</script>

{#snippet template({ dir = "ltr", ...args }: Args)}
  <div {dir} style="max-width: 560px; line-height: 1.5">
    <ExpandableText {...args} />
  </div>
{/snippet}

<Story name="Short text" />
<Story name="Long paragraphs" args={{ text: longText }} />
<Story name="Three-line preview" args={{ text: longText, lines: 3 }} />
<Story name="Unbroken text" args={{ text: "unbrokenstatement".repeat(100) }} />
<Story
  name="RTL"
  args={{
    dir: "rtl",
    text: Array.from(
      { length: 10 },
      () =>
        "ينبغي أن يتمكن الجميع من قراءة الاقتراح كاملاً قبل المشاركة في النقاش. نريد شوارع آمنة ومساحات عامة متاحة للجميع.",
    ).join("\n\n"),
    seeMoreLabel: "عرض المزيد",
    seeLessLabel: "عرض أقل",
  }}
/>
