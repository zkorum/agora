<script lang="ts">
  import type { ProjectOrganization } from "$logic/agora/project-creation.js";
  import Avatar from "$ui/shared/avatar.svelte";

  let {
    organization,
    compact = false,
    markOnly = false,
  }: {
    organization: ProjectOrganization;
    compact?: boolean;
    markOnly?: boolean;
  } = $props();
</script>

{#if organization.logo}
  <span
    class={[
      "inline-flex min-w-0 items-center",
      compact ? "gap-2 text-sm/none-base font-normal text-ink-light" : "gap-3",
    ]}
  >
    <span
      class={[
        "grid shrink-0 place-items-center border-[0.5px] border-black/10",
        compact ? "size-5 rounded-sm" : "size-8 rounded-lg",
        organization.logo.tone === "coral"
          ? "bg-(--organization-coral)"
          : "bg-primary-base",
      ]}
      ><img
        class={[
          "object-contain",
          compact && !organization.logo.compactSrc
            ? "max-h-[70%] max-w-[70%]"
            : "max-h-full max-w-full",
        ]}
        src={compact
          ? (organization.logo.compactSrc ?? organization.logo.src)
          : organization.logo.src}
        alt=""
      /></span
    >
    {#if !markOnly}<span>{organization.name}</span>{/if}
  </span>
{:else}
  <span
    class={[
      "min-w-0 [--avatar-detail-display:none]",
      compact
        ? `
          text-sm/none-base font-normal text-ink-light [--avatar-gap:8px]
          [--avatar-initials-size:8px] [--avatar-name-color:var(--ink-light)]
          [--avatar-name-line-height:16px] [--avatar-name-size:14px]
          [--avatar-radius:4px] [--avatar-size:20px]
        `
        : "[--avatar-gap:12px] [--avatar-name-size:16px] [--avatar-size:32px]",
      markOnly && "[--avatar-copy-display:none]",
    ]}
    ><Avatar
      author={{
        name: organization.name,
        initials: organization.initials,
        detail: "",
      }}
    /></span
  >
{/if}
