<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    title,
    description,
    icon,
    badge,
    children,
  }: {
    title: string;
    description: string;
    icon: Snippet;
    badge?: { text: string; emphasis: boolean };
    children?: Snippet;
  } = $props();
  const headingId = $props.id();
</script>

<section
  aria-labelledby={headingId}
  class="
    @container/help-card flex min-w-0 flex-col gap-2 rounded-xl border
    border-sky-lighter bg-sky-white p-3 wrap-anywhere
  "
>
  <h3
    id={headingId}
    class="
      flex items-center gap-2.5 text-base/tight-lg font-semibold text-ink-darker
    "
  >
    <span
      class="
        grid size-9 shrink-0 place-items-center rounded-[10px]
        bg-primary-lightest text-primary-dark
      "
      aria-hidden="true"
    >
      {@render icon()}
    </span>
    {title}
  </h3>
  <p class="text-sm/tight-lg text-ink-light">{description}</p>
  {#if badge}
    <span
      class={[
        "mt-auto w-fit rounded-lg px-2 py-1 text-xs font-semibold",
        badge.emphasis
          ? "bg-primary-lightest text-primary-dark"
          : "bg-sky-lighter text-ink-dark",
      ]}>{badge.text}</span
    >
  {/if}
  {#if children}
    <div
      class="
        @container mt-1 min-w-0 flex-1 rounded-lg border border-sky-lighter
        bg-sky-off-white p-1
        @xs/help-card:p-3
      "
    >
      {@render children()}
    </div>
  {/if}
</section>
