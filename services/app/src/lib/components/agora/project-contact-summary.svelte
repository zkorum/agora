<script lang="ts">
  import * as m from "#lib/paraglide/messages.js";
  import type { WorkspaceProject } from "$logic/agora/project-creation.js";
  import Panel from "$ui/shared/panel.svelte";

  let {
    contact,
    organizationName,
  }: {
    contact: NonNullable<WorkspaceProject["contact"]>;
    organizationName: string | undefined;
  } = $props();

  const id = $props.id();
  const fields = $derived([
    {
      id: "firstName",
      label: m.project_create_contact_first_name(),
      value: contact.firstName,
    },
    {
      id: "lastName",
      label: m.project_create_contact_last_name(),
      value: contact.lastName,
    },
    {
      id: "roleLabel",
      label: m.project_create_contact_role(),
      value: contact.roleLabel,
    },
    {
      id: "email",
      label: m.project_create_contact_email(),
      value: contact.email,
    },
    {
      id: "organization",
      label: m.project_create_contact_organization(),
      value: organizationName,
    },
  ]);
</script>

<Panel labelledby={`${id}-heading`}>
  <div class="flex flex-col gap-6">
    <h2
      class="m-0 text-lg/6 font-semibold text-ink-darker"
      id={`${id}-heading`}
    >
      {m.project_create_contact_heading()}
    </h2>
    <dl class="m-0 grid gap-3">
      {#each fields as field (field.id)}
        {#if field.value}
          <div class="flex flex-wrap justify-between gap-x-4 gap-y-1">
            <dt class="text-ink-light">{field.label}</dt>
            <dd class="m-0 wrap-anywhere text-ink-dark">{field.value}</dd>
          </div>
        {/if}
      {/each}
      {#if contact.websiteUrl}
        <div class="flex flex-wrap justify-between gap-x-4 gap-y-1">
          <dt class="text-ink-light">{m.project_create_contact_website()}</dt>
          <dd class="m-0 wrap-anywhere text-ink-dark">
            <a
              class="text-primary-dark"
              href={contact.websiteUrl}
              target="_blank"
              rel="noopener noreferrer">{contact.websiteUrl}</a
            >
          </dd>
        </div>
      {/if}
      {#if contact.imagePath}
        <div class="flex flex-wrap justify-between gap-x-4 gap-y-1">
          <dt class="text-ink-light">{m.project_create_contact_image()}</dt>
          <dd class="m-0 wrap-anywhere text-ink-dark">
            <img
              class="size-20 rounded-lg object-contain"
              src={contact.imagePath}
              alt={m.project_create_contact_heading()}
              loading="lazy"
              referrerpolicy="no-referrer"
            />
          </dd>
        </div>
      {/if}
    </dl>
  </div>
</Panel>
