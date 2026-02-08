<script lang="ts">
  import type { Snippet } from "svelte";

  type TextSize = "3xl" | "2xl" | "xl" | "lg" | "base" | "sm" | "xs";
  type TextWeight = "regular" | "medium" | "semibold" | "bold";
  type TextLeading = "normal" | "tight" | "none";

  interface Props {
    size?: TextSize;
    weight?: TextWeight;
    leading?: TextLeading;
    element?: "p" | "span" | "h1" | "h2" | "h3" | "h4" | "div";
    class?: string;
    children: Snippet;
  }

  let {
    size = "base",
    weight = "regular",
    leading = "normal",
    element = "p",
    class: className = "",
    children,
  }: Props = $props();

  const sizeClasses: Record<TextSize, string> = {
    "3xl": "text-3xl tracking-3xl",
    "2xl": "text-2xl tracking-2xl",
    xl: "text-xl tracking-xl",
    lg: "text-lg tracking-lg",
    base: "text-base tracking-base",
    sm: "text-sm tracking-sm",
    xs: "text-xs tracking-xs",
  };

  const titleSizes = new Set<TextSize>(["3xl", "2xl", "xl"]);

  /* Title sizes: default line-height is bundled via --font-size-*--line-height,
   * so no extra leading class is needed. */

  const bodyLeadingClasses: Record<
    "lg" | "base" | "sm" | "xs",
    Record<TextLeading, string>
  > = {
    lg: {
      normal: "",
      tight: "leading-tight-lg",
      none: "leading-none-lg",
    },
    base: {
      normal: "",
      tight: "leading-tight-base",
      none: "leading-none-base",
    },
    sm: {
      normal: "",
      tight: "leading-tight-sm",
      none: "leading-none-sm",
    },
    xs: {
      normal: "",
      tight: "leading-tight-xs",
      none: "leading-none-xs",
    },
  };

  const weightClasses: Record<TextWeight, string> = {
    regular: "font-normal",
    medium: "font-medium",
    semibold: "font-semibold",
    bold: "font-bold",
  };

  let computedClass = $derived.by(() => {
    const sizeClass = sizeClasses[size];
    const weightClass = weightClasses[weight];

    // Title sizes: line-height is bundled with text-*, no extra class needed.
    // Body sizes: "normal" is bundled too; only "tight" and "none" need a class.
    const leadingClass = titleSizes.has(size)
      ? ""
      : bodyLeadingClasses[size as "lg" | "base" | "sm" | "xs"][leading];

    return [sizeClass, weightClass, leadingClass, className]
      .filter(Boolean)
      .join(" ");
  });
</script>

<svelte:element this={element} class={computedClass}>
  {@render children()}
</svelte:element>
