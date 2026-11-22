<script module lang="ts">
  import { defineMeta } from "@storybook/addon-svelte-csf";
  import type { ComponentProps } from "svelte";

  import Button from "$ui/shared/button.svelte";
  import TopBar from "$ui/shared/top-bar.svelte";

  type Args = Omit<ComponentProps<typeof TopBar>, "start" | "nav" | "end"> & {
    minimal?: boolean;
    dir?: "ltr" | "rtl";
  };

  const { Story } = defineMeta({
    title: "Shared/Top bar",
    component: TopBar,
    render: template,
    parameters: { layout: "fullscreen" },
  });
</script>

{#snippet template({ minimal = false, dir = "ltr", ...args }: Args)}
  <div {dir} class={args.hideOnScroll ? "min-h-[220vh]" : "min-h-55"}>
    <TopBar {...args}>
      {#snippet start()}<span>Agora</span>{/snippet}
      {#snippet nav()}{#if !minimal}<li>
            <Button variant="quiet" size="control" disabled
              >Navigation item</Button
            >
          </li>{/if}{/snippet}
      {#snippet end()}{#if !minimal}<Button
            variant="solid"
            size="control"
            disabled>Action</Button
          >{/if}{/snippet}
    </TopBar>
    <p class="px-8 pt-30 pb-8">
      Neutral content for observing the shared top bar.
    </p>
  </div>
{/snippet}

<Story name="With snippets" />
<Story name="Minimal" args={{ minimal: true }} />
<Story name="Hide on scroll" args={{ hideOnScroll: true }} />
<Story name="RTL" args={{ dir: "rtl" }} />
