<script lang="ts">
  import { Button } from "bits-ui";
  import type { Snippet } from "svelte";

  type ButtonVariant = "primary" | "secondary" | "soft" | "outline" | "ghost";
  type ButtonSize = "sm" | "md" | "lg" | "block";

  interface Props {
    variant?: ButtonVariant;
    size?: ButtonSize;
    disabled?: boolean;
    class?: string;
    children: Snippet;
    href?: string;
    target?: string;
    rel?: string;
    type?: "button" | "submit" | "reset";
    onclick?: (event: MouseEvent) => void;
  }

  let {
    variant = "primary",
    size = "md",
    disabled = false,
    href,
    target,
    rel,
    type = "button",
    onclick,
    class: className = "",
    children,
  }: Props = $props();

  const baseClasses =
    "inline-flex items-center justify-center font-medium whitespace-nowrap no-underline cursor-pointer transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none";

  const variantClasses: Record<ButtonVariant, string> = {
    primary: "gradient-primary text-sky-white border-none",
    secondary: "bg-white text-primary-base border-none hover:bg-black/5",
    soft: "gradient-secondary text-primary-base border-none",
    outline:
      "bg-transparent text-primary-base border border-primary-base hover:bg-primary-lightest",
    ghost:
      "bg-transparent text-primary-base border-none hover:bg-primary-lightest",
  };

  const sizeClasses: Record<ButtonSize, string> = {
    sm: "h-8 px-4 text-sm rounded-button-sm",
    md: "h-10 px-6 text-base rounded-button-md",
    lg: "h-12 px-8 text-lg rounded-button-lg",
    block: "h-12 w-full px-8 text-lg rounded-button-lg",
  };

  let computedClass = $derived(
    `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`.trim(),
  );

  let anchorClass = $derived(
    disabled
      ? `${computedClass} opacity-60 pointer-events-none`
      : computedClass,
  );
</script>

{#if href}
  <a
    {href}
    {target}
    {rel}
    class={anchorClass}
    aria-disabled={disabled || undefined}
    {onclick}
  >
    {@render children()}
  </a>
{:else}
  <Button.Root {disabled} {type} class={computedClass} {onclick}>
    {@render children()}
  </Button.Root>
{/if}
