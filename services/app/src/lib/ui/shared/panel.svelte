<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    title,
    description,
    actions,
    labelledby,
    appearance,
    children,
  }: {
    title?: string;
    description?: string;
    actions?: Snippet;
    appearance?: "activity" | "activity-summary" | "project";
    labelledby?: string;
    children: Snippet;
  } = $props();
</script>

<section
  class={[
    `
      min-w-0 border border-sky-lighter
      max-md:p-(--panel-mobile-padding,20px_16px)
    `,
    appearance === "project"
      ? `
        rounded-2xl
        md:p-[clamp(16px,3vw,40px)]
      `
      : appearance
        ? `
          rounded-2xl
          md:p-10
        `
        : `
          rounded-(--panel-radius,12px)
          md:p-(--panel-padding,28px)
        `,
    appearance === "activity"
      ? "bg-sky-off-white"
      : "bg-(--panel-background,var(--sky-white))",
  ]}
  aria-labelledby={labelledby}
>
  {#if Boolean(title) || Boolean(description) || Boolean(actions)}
    <header class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        {#if title}<h2 class="text-xl font-semibold">
            {title}
          </h2>{/if}{#if description}<p class="mt-1.5 text-sm text-ink-light">
            {description}
          </p>{/if}
      </div>
      {#if actions}{@render actions()}{/if}
    </header>
  {/if}
  {@render children()}
</section>
