<script lang="ts">
  import * as m from "#lib/paraglide/messages.js";
  import EditableSummaryField from "$ui/shared/editable-summary-field.svelte";
  import Panel from "$ui/shared/panel.svelte";

  import ConversationBadge from "./conversation-badge.svelte";
  import type {
    ConversationViewKind,
    ConversationViewStatus,
  } from "./view-types.js";

  let {
    kind,
    title,
    description,
    status,
    oneditname,
    oneditdescription,
  }: {
    kind: ConversationViewKind;
    title: string;
    description: string;
    status?: ConversationViewStatus;
    oneditname?: (event: MouseEvent) => void;
    oneditdescription?: (event: MouseEvent) => void;
  } = $props();
</script>

<Panel appearance="activity">
  <div class="flex items-center justify-between gap-3">
    <ConversationBadge
      {kind}
      variant="guidance"
    />{#if status}<ConversationBadge {status} />{/if}
  </div>
  <div class="mt-4 grid min-w-0 justify-items-start gap-1">
    <EditableSummaryField
      variant="title"
      label={m.conversation_settings_edit_name()}
      onedit={oneditname}>{title}</EditableSummaryField
    >
    <EditableSummaryField
      variant={description || !oneditdescription ? "description" : "add"}
      label={description
        ? m.conversation_settings_edit_description()
        : m.conversation_settings_add_description()}
      onedit={oneditdescription}
      ><span class="whitespace-pre-wrap"
        >{description || m.authoring_no_description()}</span
      ></EditableSummaryField
    >
  </div>
</Panel>
