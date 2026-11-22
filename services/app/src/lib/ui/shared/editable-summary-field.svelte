<script lang="ts">
  import type { Snippet } from "svelte";

  import Button from "./button.svelte";
  import Icon from "./icon.svelte";

  let {
    variant,
    label,
    onedit,
    children,
  }: {
    variant: "title" | "description" | "add";
    label: string;
    onedit?: (event: MouseEvent) => void;
    children: Snippet;
  } = $props();
</script>

<div
  class={[
    "relative isolate max-w-full min-w-0",
    variant === "description" ? "w-full" : "w-fit",
    onedit &&
      variant !== "add" &&
      `
        min-h-10 rounded-lg py-1 pe-10
        has-[button:hover]:bg-sky-lightest
      `,
  ]}
>
  {#if variant === "title"}
    <h1
      class="
        text-[22px] leading-[1.3] font-semibold wrap-anywhere text-ink-darker
      "
    >
      {@render children()}
    </h1>
  {:else if variant !== "add" || !onedit}
    <!-- Links remain independently focusable and clickable above the edit target. -->
    <div
      class="
        max-w-[76ch] leading-[1.55] wrap-anywhere text-ink-light
        [&_a]:relative [&_a]:z-1
      "
    >
      {@render children()}
    </div>
  {/if}
  {#if onedit}
    <Button
      variant="unstyled"
      class={[
        `
          cursor-pointer rounded-lg text-ink-light
          focus-visible:outline-2 focus-visible:outline-offset-2
          focus-visible:outline-primary-base
        `,
        variant === "add"
          ? `
            inline-flex min-h-10 max-w-full items-center gap-2 ps-1 pe-2
            text-start text-sm
            hover:bg-sky-lightest
          `
          : "absolute inset-0 flex items-start justify-end p-2",
      ]}
      aria-label={label}
      aria-haspopup="dialog"
      onclick={onedit}
    >
      {#if variant === "add"}<Icon name="plus" size={16} />{label}
      {:else}<span class="icon-[lucide--pencil] size-4" aria-hidden="true"
        ></span>{/if}
    </Button>
  {/if}
</div>
