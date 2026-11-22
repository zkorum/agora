<script lang="ts">
  import { onMount, type Snippet, untrack } from "svelte";

  import type { ConversationSetup } from "#lib/api/agora/conversation-setup.js";
  import type { ProjectSettingsTarget } from "#lib/api/agora/projects.js";
  import backIcon from "#lib/assets/agora/project-detail/back.svg";
  import settingsIcon from "#lib/assets/agora/project-detail/settings.svg";
  import * as m from "#lib/paraglide/messages.js";
  import { getLocale, localizeHref } from "#lib/paraglide/runtime.js";
  import {
    afterNavigate,
    beforeNavigate,
    goto,
    snapshot,
  } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import LanguageSwitcher from "$components/shared/language-switcher.svelte";
  import type { WorkspaceProject } from "$logic/agora/project-creation.js";
  import {
    createWorkspaceProjects,
    setWorkspaceProjects,
  } from "$state/agora/workspace-projects.svelte.js";
  import AppShell from "$ui/agora/app-shell.svelte";
  import ConversationHeaderStart from "$ui/agora/conversation-header-start.svelte";
  import ConversationWorkspace from "$ui/agora/conversation-workspace.svelte";
  import NavigationIcon from "$ui/agora/navigation-icon.svelte";
  import type { AppShellProps } from "$ui/agora/view-types.js";
  import Button from "$ui/shared/button.svelte";
  import Toaster from "$ui/shared/toaster.svelte";

  import {
    type AuthoringContent,
    composeSetup,
    initialContent,
  } from "./conversation-authoring.js";
  import ConversationPublicationControls from "./conversation-publication-controls.svelte";
  import {
    type ConversationSettings,
    type ConversationSettingsTarget,
    initialConversationSettings,
    setConversationSettings,
    settingsFromSetup,
    type WorkspaceTab,
  } from "./conversation-settings.js";
  import ConversationSettingsDialog from "./conversation-settings-dialog.svelte";
  import { createActivityReview } from "./opinion-moderation.js";
  import ProjectCreateDialog from "./project-create-dialog.svelte";
  import ProjectSettingsDialog from "./project-settings-dialog.svelte";
  import ProjectShareControl from "./project-share-control.svelte";
  import WorkspaceSettings from "./workspace-settings.svelte";

  let { children: pageContent }: { children: Snippet } = $props();
  const workspace = createWorkspaceProjects();
  let createOpen = $state(false);
  let settingsTarget = $state.raw<ProjectSettingsTarget | undefined>();
  let shareOpen = $state(false);
  let navigationFailedProject = $state<WorkspaceProject | undefined>();
  let contentRef = $state.raw<HTMLElement | null>(null);
  let pendingScroll: number | undefined;

  function openCreateProject(): void {
    createOpen = true;
  }

  function openProjectSettings(target: ProjectSettingsTarget): void {
    settingsTarget = target;
  }

  snapshot({
    id: "workspace-content-scroll",
    capture: () => contentRef?.scrollTop ?? 0,
    restore: (top: number) => {
      // Initial restoration can precede browser-local project loading.
      if (contentRef && workspace.status.kind === "ready") {
        contentRef.scrollTop = top;
        pendingScroll = undefined;
      } else {
        pendingScroll = top;
      }
    },
    reset: () => {
      pendingScroll = undefined;
      if (contentRef) contentRef.scrollTop = 0;
    },
  });
  setWorkspaceProjects({
    projects: workspace,
    openCreateProject,
    openProjectSettings,
  });
  $effect(() => {
    const element = contentRef;
    if (
      workspace.status.kind === "ready" &&
      element &&
      pendingScroll !== undefined
    ) {
      element.scrollTop = pendingScroll;
      pendingScroll = undefined;
    }
  });
  onMount(() => {
    void workspace.initialize();
  });
  const active = $derived<AppShellProps["active"]>(
    page.params.projectSlug
      ? { projectSlug: page.params.projectSlug }
      : page.route.id?.includes("/projects")
        ? "projects"
        : "home",
  );
  const projects = $derived(
    workspace.projects.map((project) => ({
      projectSlug: project.projectSlug,
      label: project.projectTitle,
      href: localizeHref(`/project/${project.projectSlug}`),
    })),
  );
  const isProjectDetail = $derived(page.params.projectSlug !== undefined);
  const isProjectDraft = $derived(
    page.route.id === "/(agora)/project/[projectSlug]/draft/[draftId]",
  );
  const projectsHref = $derived(localizeHref(resolve("/(agora)/projects")));
  const parentProjectHref = $derived(
    isProjectDraft && page.params.projectSlug !== undefined
      ? localizeHref(
          resolve("/(agora)/project/[projectSlug]", {
            projectSlug: page.params.projectSlug,
          }),
        )
      : undefined,
  );
  const currentProject = $derived(
    workspace.projects.find(
      (project) => project.projectSlug === page.params.projectSlug,
    ),
  );
  const activeSettings = $derived(
    page.route.id === "/(agora)/project/[projectSlug]" &&
      settingsTarget !== undefined &&
      currentProject?.projectSlug === settingsTarget.projectSlug
      ? settingsTarget
      : undefined,
  );
  const currentDraft = $derived(
    isProjectDraft && currentProject && workspace.status.kind === "ready"
      ? workspace
          .getConversationDrafts(currentProject.projectSlug)
          .find((draft) => draft.id === page.params.draftId)
      : undefined,
  );
  const settingsOpen = $derived(activeSettings !== undefined);
  const createdActivity = $derived(
    isProjectDraft && currentProject
      ? workspace
          .getCreatedConversations(currentProject.projectSlug)
          .find((c) => c.id === page.params.draftId)
      : undefined,
  );
  const activityIdentity = $derived(currentDraft ?? createdActivity);
  const kind = $derived(
    currentDraft?.conversationType ?? createdActivity?.setup.conversationType,
  );
  let selectedTab = $state<WorkspaceTab>("setup");
  const tabs = $derived(
    !activityIdentity
      ? []
      : ([
          { value: "setup", label: m.draft_preview_setup() },
          ...(kind === "polis" || kind === "gathering"
            ? ([
                { value: "moderation", label: m.opinion_feed_title() },
              ] as const)
            : []),
          { value: "analysis", label: m.draft_preview_analysis() },
        ] as const),
  );
  const editorId = $derived(activityIdentity?.id);
  const review = $derived(editorId ? createActivityReview() : undefined);
  // A record revision changes on every save. Initialize once per route identity so
  // statement keys (and the buttons/dialogs holding focus) survive those revisions.
  let content = $derived(
    editorId && kind
      ? untrack(() => initialContent(createdActivity?.setup ?? kind))
      : undefined,
  );
  let draftSettings = $derived(
    editorId && kind
      ? untrack(() =>
          createdActivity
            ? settingsFromSetup(createdActivity.setup)
            : initialConversationSettings({
                kind,
                title: m.project_workspace_activity_untitled(),
              }),
        )
      : undefined,
  );
  const pendingWrite = $derived(
    workspace.isPublishingConversationDraft ||
      workspace.isUpdatingCreatedConversation,
  );
  async function saveEditor({
    settings,
    nextContent,
  }: {
    settings: ConversationSettings;
    nextContent: AuthoringContent;
  }): Promise<boolean> {
    const id = editorId;
    if (!id || pendingWrite) return false;
    if (createdActivity) {
      const setup = composeSetup({ settings, content: nextContent });
      if (!setup) return false;
      try {
        const updated = await workspace.updateCreatedConversation({
          projectSlug: createdActivity.projectSlug,
          conversationId: id,
          expectedRevision: createdActivity.revision,
          change: { kind: "setup", setup },
        });
        if (!updated || editorId !== id) return false;
        draftSettings = settingsFromSetup(updated.setup);
      } catch {
        return false;
      }
    } else if (currentDraft) {
      draftSettings = settings;
    } else return false;
    content = nextContent;
    return true;
  }
  async function applySettings(
    settings: ConversationSettings,
  ): Promise<boolean> {
    return (
      content !== undefined &&
      (await saveEditor({ settings, nextContent: content }))
    );
  }
  async function changeStatus(status: "open" | "closed"): Promise<boolean> {
    if (!createdActivity || pendingWrite) return false;
    try {
      return (
        (await workspace.updateCreatedConversation({
          projectSlug: createdActivity.projectSlug,
          conversationId: createdActivity.id,
          expectedRevision: createdActivity.revision,
          change: { kind: "status", status },
        })) !== undefined
      );
    } catch {
      return false;
    }
  }
  let editTarget = $state.raw<ConversationSettingsTarget>();
  function editDraft(target: ConversationSettingsTarget) {
    if (activityIdentity && draftSettings && !pendingWrite) editTarget = target;
  }
  setConversationSettings({
    get review() {
      return review;
    },
    get tab() {
      return selectedTab;
    },
    get applied() {
      return draftSettings;
    },
    edit: editDraft,
    get content() {
      return content;
    },
    async replaceContent(next) {
      return (
        draftSettings !== undefined &&
        (await saveEditor({ settings: draftSettings, nextContent: next }))
      );
    },
    apply: applySettings,
  });
  async function publish(setup: ConversationSetup): Promise<boolean> {
    const draft = currentDraft;
    const submittedContent = content;
    if (!draft || !submittedContent || pendingWrite) return false;
    const created = await workspace.publishConversationDraft({
      projectSlug: draft.projectSlug,
      draftId: draft.id,
      setup,
    });
    if (!created || editorId !== draft.id) return false;
    // Back/forward can reopen the same draft while publication is pending.
    // Install what was actually submitted, not the re-opened editor's defaults.
    draftSettings = settingsFromSetup(created.setup);
    content = submittedContent;
    return true;
  }
  function editName(event: MouseEvent) {
    editDraft({
      field: "name",
      opener:
        event.currentTarget instanceof HTMLElement
          ? event.currentTarget
          : undefined,
    });
  }

  // Dispose the departing editor, not one already opened on the incoming page.
  beforeNavigate(({ from, to }) => {
    if (from?.url.pathname !== to?.url.pathname) {
      editTarget = undefined;
      selectedTab = "setup";
    }
  });
  afterNavigate(({ to }) => {
    settingsTarget = undefined;
    shareOpen = false;
    if (
      to?.route.id === "/(agora)/project/[projectSlug]" &&
      to.params?.projectSlug === navigationFailedProject?.projectSlug
    ) {
      navigationFailedProject = undefined;
    }
  });

  async function created(project: WorkspaceProject): Promise<void> {
    createOpen = false;
    navigationFailedProject = undefined;
    try {
      await goto(localizeHref(`/project/${project.projectSlug}`));
    } catch {
      navigationFailedProject = project;
    }
  }

  async function resetProjects(): Promise<void> {
    if (!workspace.reset()) return;
    createOpen = false;
    settingsTarget = undefined;
    shareOpen = false;
    navigationFailedProject = undefined;
    if (workspace.status.kind === "error") await workspace.initialize();
    if (page.params.projectSlug) {
      try {
        await goto(localizeHref("/projects"));
      } catch {
        // The current detail also derives from the cleared list and becomes unavailable.
      }
    }
  }

  const dir = $derived(
    ["ar", "fa", "he"].includes(getLocale()) ? "rtl" : "ltr",
  );
  const navigation = $derived([
    {
      id: "projects",
      label: m.app_nav_projects(),
      icon: "folder",
      group: "facilitate",
      destination: { kind: "link", href: projectsHref },
    },
    {
      id: "history",
      label: m.app_nav_history(),
      icon: "history",
      group: "participate",
      destination: { kind: "unavailable" },
    },
    {
      id: "explore",
      label: m.app_nav_explore(),
      icon: "explore",
      group: "participate",
      destination: { kind: "unavailable" },
    },
    {
      id: "notifications",
      label: m.app_nav_notifications(),
      icon: "bell",
      group: "updates",
      destination: { kind: "unavailable" },
    },
  ] satisfies AppShellProps["navigation"]);
</script>

{#snippet projectBack()}
  <Button
    variant="neutral"
    size="icon"
    class="max-h-9.5 min-h-9.5 max-w-9.5 text-base"
    href={parentProjectHref ?? projectsHref}
    aria-label={parentProjectHref
      ? m.project_draft_back_to_project()
      : m.project_create_back()}
    ><img
      class={["shrink-0", "rtl:transform-[scaleX(-1)]"]}
      src={backIcon}
      alt=""
    /></Button
  >
{/snippet}

{#snippet projectHeaderStart()}
  {#if kind && draftSettings}
    <ConversationHeaderStart
      back={projectBack}
      {kind}
      title={draftSettings.title}
      onedit={editName}
    />
  {:else}
    {@render projectBack()}
    {#if currentProject && !isProjectDraft}
      <NavigationIcon name="folder" {dir} />
      <span dir="auto" class="truncate" title={currentProject.projectTitle}
        >{currentProject.projectTitle}</span
      >
    {/if}
  {/if}
{/snippet}

{#snippet projectActions()}
  {#if activityIdentity && draftSettings && content && review}
    {#key activityIdentity.id}
      <ConversationPublicationControls
        settings={draftSettings}
        {content}
        authoredReview={review.authored}
        setup={currentDraft
          ? composeSetup({ settings: draftSettings, content })
          : undefined}
        status={createdActivity?.status ?? "draft"}
        pending={pendingWrite}
        onstatus={changeStatus}
        onvisibility={(opener: HTMLElement) => {
          editDraft({ field: "project", opener });
        }}
        oncreate={publish}
        onsettings={editName}
        {dir}
      />
    {/key}
  {:else if currentProject && page.route.id === "/(agora)/project/[projectSlug]"}
    <Button
      variant="neutral"
      size="icon"
      class="max-h-9.5 min-h-9.5 max-w-9.5 text-base"
      aria-label={m.project_detail_settings()}
      onclick={() => {
        openProjectSettings({
          projectSlug: currentProject.projectSlug,
          section: "details",
        });
      }}
    >
      <img src={settingsIcon} alt="" />
    </Button>
    {#key currentProject.projectSlug}
      <ProjectShareControl
        project={currentProject}
        direction={dir}
        pending={workspace.isUpdatingProject}
        onDirectoryVisibilityChange={workspace.setProjectDirectoryVisibility}
        bind:open={shareOpen}
      />
    {/key}
  {/if}
{/snippet}

<div
  {dir}
  class={[
    "flex h-dvh min-h-80 flex-col",
    {
      "[--app-shell-content-background:var(--sky-white)]":
        isProjectDetail && !activityIdentity,
      "[--app-shell-content-background:var(--sky-lightest)]":
        !!activityIdentity,
    },
  ]}
>
  {#if workspace.hasMockControls}
    <aside
      class="
        flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b
        border-sky-lighter bg-primary-lightest px-6 py-2 font-sans text-xs
        text-ink-dark
        [&_p]:m-0 [&_p]:min-w-[min(240px,100%)] [&_p]:flex-1
      "
      aria-label="Mock"
    >
      <p>{m.project_create_mock_warning()}</p>
      <Button
        variant="neutral"
        size="sm"
        disabled={!workspace.canReset}
        onclick={resetProjects}>{m.project_create_mock_reset()}</Button
      >
      {#if workspace.resetError}<p role="alert">
          {m.project_create_mock_reset_error()}
        </p>{/if}
    </aside>
  {/if}
  {#if navigationFailedProject}
    <p class="m-0 px-6 py-2" role="status">
      {m.project_create_navigation_error()}
      <a href={localizeHref(`/project/${navigationFailedProject.projectSlug}`)}
        >{navigationFailedProject.projectTitle}</a
      >
    </p>
  {/if}
  <div
    class="
      min-h-0 flex-1
      [&_.header-control]:h-9.5 [&_.header-control]:min-h-9.5
      [&_.header-control]:text-base [&_.header-control]:font-medium
    "
  >
    <ConversationWorkspace
      {tabs}
      value={selectedTab}
      onValueChange={(next: WorkspaceTab) => (selectedTab = next)}
      label={m.draft_preview_sections()}
      {dir}
    >
      {#snippet layout(list: Snippet, panels: Snippet)}
        <WorkspaceSettings {dir}>
          {#snippet language()}<LanguageSwitcher variant="field" />{/snippet}
          {#snippet children(onsettings: AppShellProps["onsettings"])}
            <AppShell
              {onsettings}
              {navigation}
              {dir}
              {active}
              {projects}
              bind:contentRef
              headerCenter={activityIdentity ? list : undefined}
              headerStart={isProjectDetail ? projectHeaderStart : undefined}
              header={isProjectDetail && (!isProjectDraft || activityIdentity)
                ? projectActions
                : undefined}
              oncreateproject={workspace.status.kind === "ready"
                ? openCreateProject
                : undefined}
            >
              {#if activityIdentity}{@render panels()}{:else}{@render pageContent()}{/if}
            </AppShell>
          {/snippet}
        </WorkspaceSettings>
      {/snippet}
      {#snippet panel()}{@render pageContent()}{/snippet}
    </ConversationWorkspace>
  </div>
  {#if createOpen && workspace.status.kind === "ready"}
    <ProjectCreateDialog
      api={workspace.status.api}
      oncreated={created}
      bind:open={createOpen}
    />
  {/if}
  {#if activeSettings && currentProject && workspace.status.kind === "ready"}
    <ProjectSettingsDialog
      project={currentProject}
      section={activeSettings.section}
      api={workspace.status.api}
      direction={dir}
      pending={workspace.isUpdatingProject}
      onsave={workspace.updateProject}
      bind:open={
        () => settingsOpen,
        (value: boolean) => {
          if (!value) settingsTarget = undefined;
        }
      }
    />
  {/if}
  {#if editTarget && draftSettings && activityIdentity && currentProject}
    {#key editTarget}
      <ConversationSettingsDialog
        settings={draftSettings}
        created={!!createdActivity}
        pending={pendingWrite}
        project={currentProject}
        target={editTarget}
        {dir}
        onclose={(target: ConversationSettingsTarget) => {
          if (editTarget === target) editTarget = undefined;
        }}
        onapply={applySettings}
      />
    {/key}
  {/if}
  <Toaster {dir} />
</div>
