<script lang="ts">
  import type { Snippet } from "svelte";

  import Button from "./button.svelte";
  import GradientText from "./gradient-text.svelte";

  interface Props {
    href?: string;
    target?: string;
    rel?: string;
    variant?: "primary" | "secondary" | "soft";
    size?: "sm" | "md" | "lg" | "block";
    disabled?: boolean;
    class?: string;
    trailingIcon?: string;
    children: Snippet;
  }

  let {
    href,
    target,
    rel,
    variant = "primary",
    size = "md",
    disabled = false,
    class: className = "",
    trailingIcon,
    children,
  }: Props = $props();

  const buttonVariant = $derived(
    variant === "primary"
      ? "primary"
      : variant === "soft"
        ? "soft"
        : "secondary",
  );
</script>

<Button
  {href}
  {target}
  {rel}
  variant={buttonVariant}
  {size}
  {disabled}
  {trailingIcon}
  class={className}
>
  {#if variant === "secondary" || variant === "soft"}
    <GradientText>
      {@render children()}
    </GradientText>
  {:else}
    {@render children()}
  {/if}
</Button>
