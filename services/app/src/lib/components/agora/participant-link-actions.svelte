<script lang="ts">
  import * as m from "#lib/paraglide/messages.js";
  import Button from "$ui/shared/button.svelte";

  const note = $props.id();
  const actions = $derived([
    { icon: "icon-[lucide--copy]", label: m.project_workspace_copy_link() },
    {
      icon: "icon-[lucide--qr-code]",
      label: m.project_workspace_show_qr_code(),
    },
    { icon: "icon-[lucide--share-2]", label: m.project_workspace_share_via() },
    {
      icon: "icon-[lucide--external-link]",
      label: m.project_workspace_view_live_page(),
    },
  ]);
</script>

<div class="grid gap-0.5">
  {#each actions as action (action.icon)}
    <Button
      variant="quiet"
      size="control"
      class="
        disabled:min-h-[34px] disabled:justify-start disabled:px-1
        disabled:py-0.5 disabled:text-start disabled:whitespace-normal
        disabled:text-ink-light disabled:opacity-100
      "
      aria-describedby={note}
      disabled
    >
      <span
        class="
          grid size-7 flex-none place-items-center rounded-md bg-sky-lightest
        "
      >
        <span class={[action.icon, "size-4"]} aria-hidden="true"></span>
      </span>
      {action.label}
    </Button>
  {/each}
</div>
<p
  class="
    flex items-start gap-2 rounded-lg bg-sky-lightest px-3 py-2.5
    text-xs/none-base text-ink-light
  "
  id={note}
>
  <span class="icon-[lucide--info] size-4 flex-none" aria-hidden="true"></span>
  {m.project_workspace_participant_link_unavailable()}
</p>
