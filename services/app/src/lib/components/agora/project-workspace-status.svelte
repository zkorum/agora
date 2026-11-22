<script lang="ts">
  import * as m from "#lib/paraglide/messages.js";
  import type { WorkspaceProjects } from "$state/agora/workspace-projects.svelte.js";
  import Button from "$ui/shared/button.svelte";
  import Spinner from "$ui/shared/spinner.svelte";

  let { workspace }: { workspace: WorkspaceProjects } = $props();
</script>

<div class="flex flex-col items-start gap-4 py-6 text-ink-light">
  {#if workspace.status.kind === "idle" || workspace.status.kind === "loading"}
    <p class="flex items-center gap-2" role="status">
      <Spinner />
      {m.project_create_loading()}
    </p>
  {:else if workspace.status.kind === "unavailable"}
    <p role="status">{m.project_create_unavailable()}</p>
  {:else if workspace.status.kind === "error"}
    <p role="alert">{m.project_create_workspace_error()}</p>
    <Button variant="neutral" onclick={() => workspace.initialize()}
      >{m.project_create_retry()}</Button
    >
  {/if}
</div>
