<script module lang="ts">
  import * as m from "#lib/paraglide/messages.js";
  import { projectAuthenticationSchema } from "$logic/agora/project-creation.js";
  import HelpComparisonCard from "$ui/shared/help-comparison-card.svelte";
  import HelpDialog from "$ui/shared/help-dialog.svelte";
  import Icon from "$ui/shared/icon.svelte";
  import type { IconName } from "$ui/shared/view-types.js";

  import { projectAuthenticationLabels } from "./project-presentation.js";

  const optionDetails = {
    guest: {
      icon: "people",
      description: m.project_workspace_guest_help,
    },
    account_required: {
      icon: "user",
      description: m.project_workspace_account_help,
    },
    email_verification: {
      icon: "mail",
      description: m.project_workspace_email_help,
    },
    strong_verification: {
      icon: "shield",
      description: m.project_workspace_strong_help,
    },
  } satisfies Record<
    (typeof projectAuthenticationSchema.options)[number],
    { icon: IconName; description: () => string }
  >;
</script>

<script lang="ts">
  let { direction, disabled }: { direction: "ltr" | "rtl"; disabled: boolean } =
    $props();

  const labels = $derived(projectAuthenticationLabels());
</script>

<HelpDialog
  title={m.project_workspace_help_choose()}
  description={m.project_workspace_authentication_help_description()}
  closeLabel={m.project_create_cancel()}
  dir={direction}
  {disabled}
>
  <div
    class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,225px),1fr))] gap-3"
  >
    {#each projectAuthenticationSchema.options as mode (mode)}
      {@const details = optionDetails[mode]}
      <HelpComparisonCard
        title={labels[mode]}
        description={details.description()}
        badge={{
          text:
            mode === "email_verification"
              ? m.project_authentication_help_email_required()
              : m.project_authentication_help_email_not_required(),
          emphasis: mode === "email_verification",
        }}
      >
        {#snippet icon()}<Icon name={details.icon} size={20} />{/snippet}
      </HelpComparisonCard>
    {/each}
  </div>
</HelpDialog>
