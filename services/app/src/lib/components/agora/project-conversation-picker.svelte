<script lang="ts">
  import {
    type ProjectConversationType,
    projectConversationTypeSchema,
  } from "#lib/api/agora/projects.js";
  import * as m from "#lib/paraglide/messages.js";
  import ConversationBadge from "$ui/agora/conversation-badge.svelte";
  import Button from "$ui/shared/button.svelte";
  import Dialog from "$ui/shared/dialog.svelte";
  import SelectionCard from "$ui/shared/selection-card.svelte";
  import Spinner from "$ui/shared/spinner.svelte";

  import { projectConversationOptions } from "./project-conversation-options.js";

  let {
    open = $bindable(),
    direction,
    pending,
    oncreate,
  }: {
    open: boolean;
    direction: "ltr" | "rtl";
    pending: boolean;
    oncreate: (type: ProjectConversationType) => Promise<boolean>;
  } = $props();

  const id = $props.id();
  let selected = $state<ProjectConversationType>();
  let failed = $state(false);
  let submitting = $state(false);
  const busy = $derived(submitting || pending);

  function selectType(value: ProjectConversationType): void {
    selected = value;
  }

  async function submit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (busy || selected === undefined) return;
    failed = false;
    submitting = true;
    try {
      if (await oncreate(selected)) open = false;
      else failed = true;
    } catch {
      failed = true;
    } finally {
      submitting = false;
    }
  }
</script>

<Dialog
  title={m.project_detail_new_conversation()}
  description={m.project_workspace_activity_picker_description()}
  closeLabel={m.project_workspace_activity_close()}
  dir={direction}
  footerInset="action"
  wide
  contentProps={{
    class: "max-w-[972px] [&_[data-dialog-description]]:sr-only",
  }}
  bind:open={
    () => open,
    (value: boolean) => {
      if (!busy) open = value;
    }
  }
>
  <form
    class="mt-6 border-t border-sky-lighter pt-6"
    {id}
    onsubmit={submit}
    aria-busy={busy}
  >
    <fieldset
      class="disabled:[--choice-card-disabled-cursor:wait]"
      disabled={busy}
    >
      <legend class="mb-2 text-base"
        >{m.project_workspace_activity_type()}</legend
      >
      <div
        class="
          grid grid-cols-3 gap-3.5
          max-md:grid-cols-1
        "
      >
        {#each projectConversationTypeSchema.options as type (type)}
          {@const option = projectConversationOptions[type]}
          <SelectionCard
            mode="radio"
            name="conversationType"
            value={type}
            checked={selected === type}
            onselect={selectType}
          >
            {#snippet heading()}
              <ConversationBadge kind={type} label={option.label()}>
                {#snippet artwork()}<img src={option.icon} alt="" />{/snippet}
              </ConversationBadge>
            {/snippet}
            {option.description()}
          </SelectionCard>
        {/each}
      </div>
    </fieldset>
    {#if failed}
      <p class="mt-3 text-red-darkest" role="alert">
        {m.project_workspace_activity_create_error()}
      </p>
    {/if}
  </form>
  {#snippet footer()}
    <Button
      type="submit"
      form={id}
      variant="solid"
      size="control"
      disabled={busy || selected === undefined}
    >
      {#if busy}<Spinner />{/if}
      {busy
        ? m.project_workspace_activity_creating()
        : m.project_workspace_activity_create()}
    </Button>
  {/snippet}
</Dialog>
