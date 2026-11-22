<script lang="ts">
  import WorkspaceLayout from "$components/agora/workspace-layout.svelte";

  import type { LayoutProps } from "./$types.js";

  let { children }: LayoutProps = $props();
</script>

<WorkspaceLayout>
  {@render children()}
</WorkspaceLayout>
