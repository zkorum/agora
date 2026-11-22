<script lang="ts">
  import type { ProjectsApi } from "#lib/api/agora/projects.js";
  import * as m from "#lib/paraglide/messages.js";
  import type { WorkspaceProject } from "$logic/agora/project-creation.js";
  import Button from "$ui/shared/button.svelte";
  import Icon from "$ui/shared/icon.svelte";
  import Popover from "$ui/shared/popover.svelte";
  import Spinner from "$ui/shared/spinner.svelte";
  import Tabs, { type Tab } from "$ui/shared/tabs.svelte";

  import ParticipantLinkActions from "./participant-link-actions.svelte";

  type ShareTab = "share" | "publish";

  let {
    project,
    direction,
    pending,
    onDirectoryVisibilityChange,
    open = $bindable(),
  }: {
    project: Pick<WorkspaceProject, "projectSlug" | "directoryVisibility">;
    direction: "ltr" | "rtl";
    pending: boolean;
    onDirectoryVisibilityChange: ProjectsApi["setProjectDirectoryVisibility"];
    open: boolean;
  } = $props();

  const id = $props.id();
  let tab = $state<ShareTab>("share");
  let failed = $state(false);
  let submitting = $state(false);
  let triggerRef = $state<HTMLButtonElement | null>(null);
  let opening = 0;
  const listed = $derived(project.directoryVisibility === "listed");
  const publicationBlocked = $derived(submitting || pending);
  const tabs = $derived<readonly Tab<ShareTab>[]>([
    { value: "share", label: m.project_detail_share() },
    {
      value: "publish",
      label: m.project_workspace_publish_tab(),
      status: { label: m.project_workspace_published(), active: listed },
    },
  ]);

  function handleOpenChange(next: boolean): void {
    if (!next) return;
    opening += 1;
    tab = "share";
    failed = false;
    // Bits UI restores the element focused on open, including when a tap
    // doesn't focus the trigger by default.
    triggerRef?.focus({ preventScroll: true });
  }

  function selectTab(value: ShareTab): void {
    tab = value;
  }

  async function changeDirectoryVisibility(): Promise<void> {
    if (publicationBlocked) return;
    const submissionOpening = opening;
    failed = false;
    submitting = true;
    let saved: boolean;
    try {
      saved =
        (await onDirectoryVisibilityChange({
          projectSlug: project.projectSlug,
          directoryVisibility: listed ? "unlisted" : "listed",
        })) !== undefined;
    } catch {
      saved = false;
    } finally {
      submitting = false;
    }
    if (open && opening === submissionOpening) failed = !saved;
  }
</script>

<Popover
  label={m.project_workspace_share_title()}
  triggerProps={{ class: "header-control" }}
  contentProps={{
    dir: direction,
    class: "w-[334px] max-w-[calc(100vw-2rem)]",
    collisionPadding: 16,
  }}
  bind:open
  bind:triggerRef
  onOpenChange={handleOpenChange}
>
  {#snippet trigger()}
    <Icon name="link" size={20} />
    {m.project_detail_share()}
  {/snippet}

  <Tabs
    value={tab}
    onValueChange={selectTab}
    {tabs}
    rootProps={{ dir: direction }}
    label={m.project_workspace_share_title()}
  >
    {#snippet panel(value)}
      {#if value === "share"}
        <div class="grid gap-3 px-4 pt-3 pb-4 wrap-anywhere">
          <ParticipantLinkActions />
        </div>
      {:else}
        <div class="grid gap-3 px-4 pt-3 pb-4 text-sm wrap-anywhere">
          {#if !listed}
            <div
              class="
                grid justify-items-center gap-1.5 px-1 pt-2 pb-1 text-center
              "
            >
              <span
                class="
                  mb-1 grid size-11 place-items-center rounded-xl
                  bg-primary-lightest text-primary-dark
                "><Icon name="globe" size={24} /></span
              >
              <h2 class="text-lg font-[650] text-ink-darker">
                {m.project_workspace_explore_prompt()}
              </h2>
              <p class="text-ink-light">
                {m.project_workspace_explore_description()}
              </p>
            </div>
          {/if}
          <div
            class="
              flex items-start gap-2 rounded-lg bg-sky-lightest px-3 py-2.5
              text-xs/none-base text-ink-light
            "
            role="status"
          >
            <span
              class={[
                "size-4 flex-none",
                listed
                  ? "icon-[lucide--circle-check] text-green-darkest"
                  : "icon-[lucide--info]",
              ]}
              aria-hidden="true"
            ></span>
            <div>
              {#if listed}
                <p class="mb-0.5 text-sm font-semibold text-ink-dark">
                  {m.project_workspace_published()}
                </p>
              {/if}
              <p>
                {listed
                  ? m.project_workspace_published_description()
                  : m.project_workspace_unpublished_description()}
              </p>
            </div>
          </div>
          {#if listed}
            <div
              class="
                flex items-start gap-2 rounded-lg border border-sky-lighter
                bg-sky-white px-3 py-2.5 text-xs/none-base text-ink-light
              "
            >
              <span class="size-4 flex-none"
                ><Icon name="link" size={16} /></span
              >
              <div>
                <p class="mb-0.5 text-sm font-semibold text-ink-dark">
                  {m.project_workspace_live_page()}
                </p>
                <p id={`${id}-listed-link-note`}>
                  {m.project_workspace_participant_link_unavailable()}
                </p>
              </div>
            </div>
          {/if}
          {#if failed}
            <p role="alert" class="text-red-darkest">
              {m.project_workspace_publication_error()}
            </p>
          {/if}
          <div class="flex flex-wrap gap-2" aria-busy={submitting}>
            <Button
              variant={listed ? "neutral" : "solid"}
              size="control"
              class="
                min-w-0 flex-[1_1_7.5rem] whitespace-normal
                aria-disabled:cursor-wait aria-disabled:opacity-60
              "
              aria-disabled={publicationBlocked || undefined}
              onclick={changeDirectoryVisibility}
            >
              {#if submitting}<Spinner />{/if}
              {listed
                ? m.project_workspace_unpublish()
                : m.project_workspace_publish()}
            </Button>
            {#if listed}
              <Button
                variant="neutral"
                size="control"
                class="
                  min-w-0 flex-[1_1_7.5rem] whitespace-normal
                  aria-disabled:cursor-wait aria-disabled:opacity-60
                "
                aria-describedby={`${id}-listed-link-note`}
                disabled
              >
                <span
                  class="icon-[lucide--external-link] size-4 shrink-0"
                  aria-hidden="true"
                ></span>
                {m.project_workspace_view_live_page()}
              </Button>
            {/if}
          </div>
        </div>
      {/if}
    {/snippet}
  </Tabs>
</Popover>
