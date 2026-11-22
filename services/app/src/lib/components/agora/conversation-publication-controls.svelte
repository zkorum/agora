<script lang="ts">
  import {
    type ConversationSetup,
    conversationSetupSchema,
  } from "#lib/api/agora/conversation-setup.js";
  import * as m from "#lib/paraglide/messages.js";
  import Button from "$ui/shared/button.svelte";
  import Dialog from "$ui/shared/dialog.svelte";
  import Icon from "$ui/shared/icon.svelte";

  import ActivitySharePopover from "./activity-share-popover.svelte";
  import type { AuthoringContent } from "./conversation-authoring.js";
  import type { ConversationSettings } from "./conversation-settings.js";
  import type { ActivityReview } from "./opinion-moderation.js";
  import ParticipantSetupPreview from "./participant-setup-preview.svelte";
  let {
    settings,
    setup,
    content,
    authoredReview,
    status,
    onstatus,
    onvisibility,
    pending,
    oncreate,
    onsettings,
    dir,
  }: {
    settings: ConversationSettings;
    setup: ConversationSetup | undefined;
    content: AuthoringContent;
    authoredReview: ActivityReview["authored"];
    status: "open" | "closed" | "draft";
    onstatus: (status: "open" | "closed") => Promise<boolean>;
    onvisibility: (opener: HTMLElement) => void;
    pending: boolean;
    oncreate: (setup: ConversationSetup) => Promise<boolean>;
    onsettings: ((e: MouseEvent) => void) | undefined;
    dir: "ltr" | "rtl";
  } = $props();
  const created = $derived(status !== "draft");
  const previewContent = $derived(
    settings.participation.kind === "polis"
      ? {
          ...content,
          statements: content.statements.filter(
            (s) => !authoredReview.get(s.id),
          ),
        }
      : content,
  );
  let shareOpen = $state(false);
  let shareAfterDialog = false;
  let showing = $state<"preview" | "create" | "more">();
  let failed = $state(false),
    busy = $state(false);
  const amending = $derived(
    settings.participation.kind === "gathering" &&
      settings.participation.gatheringMode === "amend",
  );
  const checked = $derived(conversationSetupSchema.safeParse(setup));
  const locked = $derived(busy || pending);
  let opener: HTMLElement | undefined;
  async function create() {
    if (amending || locked || created || !checked.success) return;
    busy = true;
    failed = false;
    try {
      if (await oncreate(checked.data)) toShare();
      else failed = true;
    } catch {
      failed = true;
    } finally {
      busy = false;
    }
  }
  function toShare() {
    shareAfterDialog = true;
    showing = undefined;
  }
  function open({
    next,
    event,
  }: {
    next: NonNullable<typeof showing>;
    event: MouseEvent;
  }) {
    if (amending && (next === "preview" || next === "create")) return;
    if (!showing && event.currentTarget instanceof HTMLElement)
      opener = event.currentTarget;
    showing = next;
    failed = false;
  }
</script>

<Button
  size="icon"
  variant="neutral"
  aria-label={m.authoring_preview()}
  disabled={amending}
  class="max-sm:hidden"
  aria-haspopup="dialog"
  onclick={(event: MouseEvent) => {
    open({ next: "preview", event });
  }}><Icon name="eye" /></Button
>
{#if onsettings}<Button
    size="icon"
    variant="neutral"
    disabled={pending}
    aria-label={m.conversation_settings_title()}
    aria-haspopup="dialog"
    onclick={onsettings}><Icon name="settings" /></Button
  >{/if}
{#if status !== "draft"}<ActivitySharePopover
    bind:open={shareOpen}
    {status}
    {pending}
    {dir}
    {onstatus}
    {onvisibility}
  />
{:else}<Button
    size="control"
    variant="solid"
    aria-haspopup="dialog"
    disabled={pending || amending}
    aria-label={m.authoring_create()}
    onclick={(event: MouseEvent) => {
      open({ next: "create", event });
    }}
    ><span
      class="
        hidden
        max-sm:inline
      "
      aria-hidden="true">+</span
    ><span class="max-sm:hidden">{m.authoring_create()}</span></Button
  >{/if}
<Button
  variant="quiet"
  size="icon"
  aria-label={m.authoring_more()}
  aria-haspopup="dialog"
  onclick={(event: MouseEvent) => {
    open({ next: "more", event });
  }}><Icon name="more" /></Button
>
<Dialog
  bind:open={
    () => showing !== undefined,
    (isOpen: boolean) => {
      if (!isOpen && !locked) showing = undefined;
    }
  }
  {dir}
  title={showing === "preview"
    ? m.authoring_preview()
    : showing === "more"
      ? m.authoring_more()
      : m.authoring_create()}
  description={settings.title}
  closeLabel={m.workspace_dialog_close()}
  wide={showing === "preview"}
  contentProps={{
    onCloseAutoFocus: (event: Event) => {
      if (shareAfterDialog) {
        event.preventDefault();
        shareAfterDialog = false;
        shareOpen = true;
        return;
      }
      if (opener?.isConnected) {
        event.preventDefault();
        opener.focus({ preventScroll: true });
      }
    },
  }}
>
  {#if showing === "preview"}{#if settings.description}<p>
        {settings.description}
      </p>{/if}{#if content.statements.length && !previewContent.statements.length}
      <p>{m.mapping_preview_complete()}</p>
    {:else}<ParticipantSetupPreview
        participation={settings.participation}
        content={previewContent}
      />{/if}
  {:else if showing === "more"}
    <Button
      disabled={amending}
      variant="neutral"
      onclick={(event: MouseEvent) => {
        open({ next: "preview", event });
      }}>{m.authoring_preview()}</Button
    >
    <Button
      disabled={amending}
      variant="neutral"
      onclick={(event: MouseEvent) => {
        if (created) toShare();
        else open({ next: "create", event });
      }}>{created ? m.project_detail_share() : m.authoring_create()}</Button
    >
  {:else}
    <p>{m.authoring_create_help()}</p>
    <p>
      {settings.participation.kind === "gathering"
        ? m.authoring_seed_responses()
        : m.authoring_statement()}: {settings.participation.kind === "gathering"
        ? content.responses.length
        : content.statements.length}
    </p>
    {#if !checked.success}<p role="status">
        {!setup
          ? m.draft_preview_method()
          : settings.participation.kind === "prioritizing" &&
              settings.participation.method === "qv" &&
              !content.statements.length
            ? m.authoring_qv_min()
            : m.authoring_check_content()}
      </p>{/if}
  {/if}
  {#if failed}<p role="alert">{m.authoring_action_failed()}</p>{/if}
  {#snippet footer()}
    {#if showing === "create"}<Button
        variant="neutral"
        disabled={locked}
        onclick={() => (showing = undefined)}
        >{m.project_create_cancel()}</Button
      ><Button
        variant="solid"
        disabled={locked || !checked.success}
        onclick={create}>{m.authoring_create()}</Button
      >
    {:else}<Button variant="solid" onclick={() => (showing = undefined)}
        >{m.authoring_done()}</Button
      >{/if}
  {/snippet}
</Dialog>
