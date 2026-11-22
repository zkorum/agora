<script lang="ts">
  import { Button } from "bits-ui";

  import type {
    ButtonAnchorProps,
    ButtonProps,
    ButtonSize,
    ButtonVariant,
  } from "./view-types.js";

  let {
    variant = "primary",
    size = "md",
    disabled = false,
    trailingIcon,
    class: className = "",
    children,
    ref = $bindable(null),
    ...attributes
  }: ButtonProps = $props();

  const baseClasses =
    "inline-flex items-center justify-center font-medium whitespace-nowrap no-underline cursor-pointer transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-base focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none";

  const variantClasses: Record<ButtonVariant, string> = {
    unstyled: "",
    primary: "gradient-primary text-sky-white border-none",
    secondary: "bg-white text-primary-base border-none hover:bg-black/5",
    soft: "gradient-secondary border border-gradient-border-light-purple text-primary-base shadow-md hover:shadow-card",
    outline:
      "bg-transparent text-primary-base border border-primary-base hover:bg-primary-lightest",
    ghost:
      "bg-transparent text-primary-base border-none hover:bg-primary-lightest",
    solid:
      "border border-primary-base bg-primary-base text-white hover:bg-primary-dark",
    neutral:
      "border border-sky-lighter bg-white text-ink-dark hover:bg-sky-lightest",
    quiet:
      "border border-transparent bg-transparent text-ink-dark hover:bg-sky-lighter",
    danger:
      "border border-sky-lighter bg-white text-red-darkest hover:bg-red-lightest",
  };

  const sizeClasses: Record<ButtonSize, string> = {
    sm: "h-8 px-4 text-sm rounded-button-sm",
    md: "h-10 px-6 text-base rounded-button-md",
    lg: "h-12 px-8 text-lg rounded-button-lg",
    block: "h-12 w-full px-8 text-lg rounded-button-lg",
    control: "min-h-10 gap-2 rounded-lg px-4 py-2 text-sm",
    icon: "size-10 shrink-0 gap-2 rounded-lg p-2 text-sm",
  };

  let computedClass = $derived(
    variant === "unstyled"
      ? className
      : [baseClasses, variantClasses[variant], sizeClasses[size], className],
  );

  let anchorClass = $derived([
    computedClass,
    disabled && "opacity-60 pointer-events-none",
  ]);

  function handleAnchorClick(
    event: Parameters<NonNullable<ButtonAnchorProps["onclick"]>>[0],
  ): void {
    if (disabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (attributes.href !== undefined) attributes.onclick?.(event);
  }
</script>

{#if attributes.href !== undefined}
  <Button.Root
    {...attributes}
    bind:ref
    {disabled}
    role={disabled ? "link" : attributes.role}
    tabindex={disabled ? -1 : attributes.tabindex}
    rel={attributes.rel ??
      (attributes.target === "_blank" ? "noopener noreferrer" : undefined)}
    class={anchorClass}
    aria-disabled={disabled ? true : undefined}
    onclick={handleAnchorClick}
  >
    {@render children()}
    {#if trailingIcon}
      <span class={trailingIcon} aria-hidden="true"></span>
    {/if}
  </Button.Root>
{:else}
  <Button.Root
    {...attributes}
    bind:ref
    {disabled}
    type={attributes.type ?? "button"}
    class={computedClass}
  >
    {@render children()}
    {#if trailingIcon}
      <span class={trailingIcon} aria-hidden="true"></span>
    {/if}
  </Button.Root>
{/if}
