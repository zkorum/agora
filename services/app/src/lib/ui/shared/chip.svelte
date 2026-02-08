<script lang="ts">
  import type { Snippet } from "svelte";

  import GradientText from "$ui/shared/gradient-text.svelte";

  interface Props {
    class?: string;
    variant?: "label" | "nav";
    border?: boolean;
    gradient?: boolean;
    children: Snippet;
  }

  let {
    class: className = "",
    variant = "label",
    border = false,
    gradient = true,
    children,
  }: Props = $props();

  const variantClasses = $derived(
    variant === "nav"
      ? "font-medium gradient-chip"
      : `bg-sky-lighter font-normal${gradient ? "" : " text-foreground"}`,
  );

  const borderClass = $derived(border ? "border border-primary-base" : "");
</script>

<span
  class="
    inline-flex w-fit items-center rounded-chip px-2 py-[7px] text-sm/[14px]
    tracking-sm
    {variantClasses}
    {borderClass}
    {className}
  "
>
  {#if gradient}
    <GradientText angle={134}>
      {@render children()}
    </GradientText>
  {:else}
    {@render children()}
  {/if}
</span>
