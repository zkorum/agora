<script lang="ts">
  import type { Snippet } from "svelte";

  import Button from "$ui/shared/button.svelte";
  import Icon from "$ui/shared/icon.svelte";

  import type { ProjectView } from "./view-types.js";

  let {
    project,
    onopen,
    href,
    organization,
    metadata,
    layout = "grid",
  }: {
    project: ProjectView;
    organization?: Snippet;
    metadata?: Snippet;
    layout?: "grid" | "list";
  } & (
    | { href: string; onopen?: never }
    | { href?: never; onopen: () => void }
  ) = $props();
</script>

<article
  class={[
    `
      relative flex min-w-0 flex-col rounded-xl border border-sky-lighter
      bg-sky-white p-2 shadow-(--shadow-surface-subtle)
      hover:shadow-[0_2px_5px_#0000000d]
    `,
    layout === "list"
      ? `
        max-md:min-h-(--project-card-min-height,417px)
        md:flex-row
      `
      : "min-h-(--project-card-min-height,417px)",
  ]}
>
  <div
    class={[
      "h-32 shrink-0 rounded-md",
      layout === "list" && "md:h-auto md:min-h-32.5 md:w-40",
      project.cover === "coral"
        ? "bg-(--organization-coral)"
        : project.cover === "mint"
          ? "bg-project-mint"
          : `
            bg-[linear-gradient(165deg,var(--primary-base)_30%,var(--brand-blue))]
          `,
    ]}
    aria-hidden="true"
  ></div>
  <div class="flex flex-1 flex-col gap-2 px-3 py-4">
    <div
      class="
        flex min-h-5 flex-wrap items-center gap-2 text-sm/none-base
        text-ink-light
      "
    >
      {#if organization}{@render organization()}{:else}{project.organization}{/if}
    </div>
    <h2 class="m-0 text-lg/6 font-semibold wrap-anywhere">
      {#if href !== undefined}
        <Button
          variant="unstyled"
          class="
            cursor-pointer bg-transparent p-0 text-start text-ink-dark
            no-underline
            after:absolute after:inset-0 after:rounded-xl
            focus-visible:after:outline-3 focus-visible:after:outline-offset-2
            focus-visible:after:outline-primary-light
          "
          {href}>{project.title}</Button
        >
      {:else}
        <Button
          variant="unstyled"
          class="
            cursor-pointer bg-transparent p-0 text-start text-ink-dark
            no-underline
            after:absolute after:inset-0 after:rounded-xl
            focus-visible:after:outline-3 focus-visible:after:outline-offset-2
            focus-visible:after:outline-primary-light
          "
          onclick={onopen}>{project.title}</Button
        >
      {/if}
    </h2>
    <p
      class="
        mt-1 line-clamp-5 flex-1 text-sm/5.25 wrap-anywhere whitespace-pre-wrap
        text-ink-light
      "
    >
      {project.description}
    </p>
    <footer
      class="
        mt-4 flex min-h-[47px] gap-3 border-t border-sky-lighter pt-4 text-sm
        text-ink-light
      "
    >
      {#if metadata}{@render metadata()}{:else if project.participantCount}<span
          class="inline-flex items-center gap-1.25"
        >
          <Icon name="list" size={14} />
          {project.conversationCount}
          <span class="sr-only">activities</span>
        </span>
        <span class="inline-flex items-center gap-1.25">
          <Icon name="people" size={14} />
          {project.participantCount}
          <span class="sr-only">participants</span>
        </span>{/if}
    </footer>
  </div>
</article>
