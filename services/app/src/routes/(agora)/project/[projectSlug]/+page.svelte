<script lang="ts">
  import ProjectDetail from "$components/agora/project-detail.svelte";

  import type { PageProps } from "./$types.js";

  let { params }: PageProps = $props();
</script>

{#key params.projectSlug}
  <ProjectDetail projectSlug={params.projectSlug} />
{/key}
