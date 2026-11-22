<script lang="ts">
  import type { Snippet } from "svelte";

  import * as m from "#lib/paraglide/messages.js";
  import Icon from "$ui/shared/icon.svelte";

  import type {
    ConversationViewKind,
    ConversationViewStatus,
  } from "./view-types.js";

  let {
    kind,
    status,
    label,
    artwork,
    variant = "compact",
  }: {
    kind?: ConversationViewKind;
    status?: ConversationViewStatus;
    label?: string;
    artwork?: Snippet;
    variant?: "compact" | "guidance" | "icon";
  } = $props();

  const base =
    "inline-flex w-fit items-center whitespace-nowrap bg-sky-lightest text-ink-base";
  const labels = {
    gathering: m.project_detail_gathering,
    polis: m.project_detail_polis,
    prioritizing: m.project_detail_prioritization,
  };
</script>

{#if kind}
  <span
    class={[
      base,
      variant === "guidance"
        ? "rounded-lg p-0.5 text-sm leading-none font-medium"
        : variant === "icon"
          ? "rounded-md"
          : "gap-1.5 rounded-md px-1.75 py-0.75 text-xs",
    ]}
    role={variant === "icon" ? "img" : undefined}
    aria-label={variant === "icon" ? (label ?? labels[kind]()) : undefined}
    ><span
      class={[
        "inline-flex text-sky-white",
        variant === "compact" ? "-ms-1 rounded-sm p-1" : "rounded-md p-1.5",
        kind === "gathering"
          ? "bg-yellow-base"
          : kind === "polis"
            ? "bg-primary-base"
            : "bg-green-base",
      ]}
      >{#if artwork}{@render artwork()}{:else}<Icon
          name={kind}
          size={14}
        />{/if}</span
    >{#if variant !== "icon"}<span class={{ "p-1.5": variant === "guidance" }}
        >{label ?? labels[kind]()}</span
      >{/if}</span
  >
{:else if status}
  <span class={[base, "gap-1.5 rounded-md px-2.5 py-1.25 text-xs"]}
    ><span
      class={[
        "size-1.5 rounded-full",
        status === "open"
          ? "bg-green-base"
          : status === "closed"
            ? "bg-red-base"
            : "bg-sky-dark",
      ]}
    ></span>{label ??
      (status === "open"
        ? m.conversation_status_open()
        : status === "closed"
          ? m.conversation_status_closed()
          : m.project_workspace_activity_draft())}</span
  >
{/if}
