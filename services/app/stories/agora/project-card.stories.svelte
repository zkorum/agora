<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import type { ComponentProps } from "svelte";

  import { projects } from "#lib/mock-data.js";
  import ProjectCard from "$ui/agora/project-card.svelte";

  type Args = ComponentProps<typeof ProjectCard> & { dir?: "ltr" | "rtl" };

  const { Story } = defineMeta({
    title: "Agora/Project card",
    component: ProjectCard,
    render: template,
    args: { project: projects[0], onopen: () => undefined },
  });
</script>

{#snippet template({ dir = "ltr", ...args }: Args)}
  <div {dir} class={args.layout === "list" ? "max-w-225" : "max-w-105"}>
    <ProjectCard {...args} />
  </div>
{/snippet}

<Story name="Grid" />
<Story name="List" args={{ layout: "list" }} />
<Story name="Long title" args={{ project: projects[1] }} />
<Story
  name="Long description"
  args={{
    project: {
      ...projects[0],
      description: Array.from(
        { length: 8 },
        () =>
          "Help shape safer, greener everyday journeys. Read the plans, share your experiences and discuss how our neighbourhood can work better for everyone.",
      ).join("\n\n"),
    },
  }}
/>
<Story name="RTL" args={{ dir: "rtl" }} />
