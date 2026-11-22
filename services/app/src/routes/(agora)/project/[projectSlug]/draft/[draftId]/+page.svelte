<script lang="ts">
  import ProjectConversationDraftHandoff from "$components/agora/project-conversation-draft-handoff.svelte";

  import type { PageProps } from "./$types.js";

  let { params }: PageProps = $props();
</script>

<ProjectConversationDraftHandoff
  projectSlug={params.projectSlug}
  draftId={params.draftId}
/>
