<script lang="ts">
  import Icon from "$ui/shared/icon.svelte";

  import type {
    ConversationViewKind,
    ConversationViewStatus,
  } from "./view-types.js";

  let {
    kind,
    status,
  }: { kind?: ConversationViewKind; status?: ConversationViewStatus } =
    $props();

  const labels = {
    gathering: "Gathering",
    polis: "Mapping",
    prioritizing: "Prioritizing",
  };
</script>

{#if kind}
  <span class="badge"
    ><span
      class="
        kind-icon
        {kind}"><Icon name={kind} size={14} /></span
    >{labels[kind]}</span
  >
{:else if status}
  <span class="badge status"
    ><span
      class="
        dot
        {status}"
    ></span>{status === "open"
      ? "Open"
      : status === "closed"
        ? "Closed"
        : "Draft"}</span
  >
{/if}

<style>
  .badge {
    display: inline-flex;
    gap: 6px;
    align-items: center;
    width: fit-content;
    padding: 3px 7px;
    background: var(--sky-lightest);
    border-radius: 6px;
    font-size: 12px;
    color: var(--ink-base);
    white-space: nowrap;
  }
  .kind-icon {
    display: inline-flex;
    padding: 4px;
    border-radius: 5px;
    color: white;
    margin-inline-start: -4px;
  }
  .gathering {
    background: var(--yellow-base);
  }
  .polis {
    background: var(--primary-base);
  }
  .prioritizing {
    background: #2fbaa3;
  }
  .status {
    padding: 5px 10px;
  }
  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }
  .open {
    background: var(--green-base);
  }
  .closed {
    background: var(--red-base);
  }
  .draft {
    background: var(--sky-dark);
  }
</style>
