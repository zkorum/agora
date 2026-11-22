<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import type { ComponentProps } from "svelte";

  import Field from "$ui/shared/field.svelte";

  type Args = ComponentProps<typeof Field> & { dir?: "ltr" | "rtl" };

  const { Story } = defineMeta({
    title: "Shared/Field",
    component: Field,
    render: template,
    args: { label: "Project name", placeholder: "Give your project a name" },
  });
</script>

{#snippet template({ dir = "ltr", ...args }: Args)}
  <div {dir} class="w-full max-w-120">
    <Field {...args} />
  </div>
{/snippet}

<Story name="Empty" />
<Story name="Populated" args={{ value: "A Greener Riverside" }} />
<Story
  name="Multiline"
  args={{
    label: "Description",
    multiline: true,
    hint: "Explain what this project is about.",
  }}
/>
<Story
  name="Read only"
  args={{ value: "A Greener Riverside", readonly: true }}
/>
<Story
  name="RTL"
  args={{ dir: "rtl", label: "اسم المشروع", value: "مستقبل أكثر اخضرارًا" }}
/>
