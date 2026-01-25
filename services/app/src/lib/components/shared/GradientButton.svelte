<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    href?: string;
    target?: string;
    rel?: string;
    variant?: "primary" | "secondary";
    children: Snippet;
  }

  let { href, target, rel, variant = "primary", children }: Props = $props();

  const baseClasses =
    "inline-flex items-center justify-center w-[192px] h-10 rounded-button px-4 text-base font-medium leading-[1.4] tracking-[-0.16px] whitespace-nowrap no-underline cursor-pointer border-none";
  const primaryClasses = `${baseClasses} bg-gradient-to-b from-brand-purple to-brand-blue text-white`;
  const secondaryClasses = `${baseClasses} bg-white`;

  // Compute rel attribute: add "external" for external URLs and fragment links
  const isExternalOrFragment = $derived(
    href?.startsWith("http") === true || href?.startsWith("#") === true,
  );
  const computedRel = $derived(
    isExternalOrFragment ? (rel ? `external ${rel}` : "external") : rel,
  );
</script>

{#if href}
  <a
    {href}
    {target}
    rel={computedRel}
    class={variant === "primary" ? primaryClasses : secondaryClasses}
  >
    {#if variant === "secondary"}
      <span
        class="
          bg-linear-to-r from-brand-purple to-brand-blue bg-clip-text
          text-transparent
        "
      >
        {@render children()}
      </span>
    {:else}
      {@render children()}
    {/if}
  </a>
{:else}
  <button class={variant === "primary" ? primaryClasses : secondaryClasses}>
    {#if variant === "secondary"}
      <span
        class="
          bg-linear-to-r from-brand-purple to-brand-blue bg-clip-text
          text-transparent
        "
      >
        {@render children()}
      </span>
    {:else}
      {@render children()}
    {/if}
  </button>
{/if}
