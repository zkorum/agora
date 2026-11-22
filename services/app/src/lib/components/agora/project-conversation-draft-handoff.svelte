<script lang="ts">
  import * as m from "#lib/paraglide/messages.js";
  import { localizeHref } from "#lib/paraglide/runtime.js";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import { getWorkspaceProjects } from "$state/agora/workspace-projects.svelte.js";
  import Panel from "$ui/shared/panel.svelte";

  import { getConversationSettings } from "./conversation-settings.js";
  import ProjectConversationDraftPreview from "./project-conversation-draft-preview.svelte";
  import ProjectWorkspaceStatus from "./project-workspace-status.svelte";

  let { projectSlug, draftId }: { projectSlug: string; draftId: string } =
    $props();
  const { projects: workspace } = getWorkspaceProjects();
  const session = getConversationSettings();
  const project = $derived(
    workspace.projects.find((p) => p.projectSlug === projectSlug),
  );
  const draft = $derived(
    workspace
      .getConversationDrafts(projectSlug)
      .find((item) => item.id === draftId),
  );
  const created = $derived(
    workspace
      .getCreatedConversations(projectSlug)
      .find((c) => c.id === draftId),
  );
  const title = $derived(
    (draft ?? created) && project
      ? (session.applied?.title ?? m.project_workspace_activity_untitled())
      : workspace.status.kind === "ready"
        ? m.project_draft_not_found()
        : m.project_workspace_details(),
  );
  async function newPrioritization(): Promise<boolean> {
    if (created?.setup.conversationType !== "polis") return false;
    const source = draftId;
    const result = await workspace.createConversationDraft({
      projectSlug,
      conversationType: "prioritizing",
    });
    if (!result) return false;
    if (page.params.draftId === source)
      await goto(
        localizeHref(
          resolve("/(agora)/project/[projectSlug]/draft/[draftId]", {
            projectSlug: result.projectSlug,
            draftId: result.id,
          }),
        ),
      );
    return true;
  }
</script>

<svelte:head>
  <title>{title} · Agora</title>
</svelte:head>

{#if workspace.status.kind === "ready" && (draft ?? created) && project && session.applied && session.content && session.review}
  {#key draftId}
    <ProjectConversationDraftPreview
      section={session.tab}
      review={session.review}
      settings={session.applied}
      onapply={session.apply}
      onedit={session.edit}
      content={session.content}
      pending={workspace.isUpdatingCreatedConversation ||
        workspace.isPublishingConversationDraft}
      status={created?.status ?? "draft"}
      onchange={session.replaceContent}
      onnextactivity={newPrioritization}
    />
  {/key}
{:else}
  <section class="mx-auto max-w-[760px] p-[clamp(16px,4vw,48px)]">
    <Panel>
      <div
        class="
          grid justify-items-start gap-3 p-[clamp(16px,4vw,32px)] text-ink-light
        "
      >
        {#if workspace.status.kind !== "ready"}
          <ProjectWorkspaceStatus {workspace} />
        {:else}
          <h1 class="text-2xl font-semibold text-ink-dark">{title}</h1>
        {/if}
      </div>
    </Panel>
  </section>
{/if}
