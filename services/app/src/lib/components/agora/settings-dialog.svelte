<script lang="ts">
  import Button from "$ui/shared/button.svelte";
  import Dialog from "$ui/shared/dialog.svelte";
  import Field from "$ui/shared/field.svelte";
  import Panel from "$ui/shared/panel.svelte";
  import SegmentedControl from "$ui/shared/segmented-control.svelte";
  import SettingRow from "$ui/shared/setting-row.svelte";

  import type { SettingsDialogData } from "./view-types.js";

  let {
    open = $bindable(false),
    title,
    dir,
    data,
  }: {
    open?: boolean;
    title: string;
    dir: "ltr" | "rtl";
    data: SettingsDialogData;
  } = $props();
  let section = $state("details");
  let review = $derived(data.reviewBeforePublishing);
  let submissions = $derived(data.allowSubmissions);
  let email = $derived(data.emailUpdates);
  let name = $derived(data.name);
  let description = $derived(data.description);
  let useProjectLanguage = $derived(data.useProjectLanguage);
</script>

<Dialog
  bind:open
  {title}
  {dir}
  description="Saving settings is not available yet."
  wide
>
  <div class="settings-layout">
    <SegmentedControl
      label="Settings sections"
      items={[
        { value: "details", label: "Details" },
        { value: "participation", label: "Participation & Access" },
        { value: "email", label: "Email updates" },
        { value: "language", label: "Language" },
      ]}
      value={section}
      onchange={(next: string) => {
        section = next;
      }}
    />
    <Panel>
      <div class="fields">
        {#if section === "details"}<Field
            label="Name"
            bind:value={name}
          /><Field
            label="Description (optional)"
            bind:value={description}
            multiline
          />
        {:else if section === "participation"}<h3>Participation & Access</h3>
          <SettingRow
            title="Allow participants to add statements"
            description="Participants can contribute new perspectives for others to respond to."
            icon="message"
            bind:checked={submissions}
          /><SettingRow
            title="Review statements before publishing"
            description="New statements need moderator approval before appearing to others."
            icon="shield"
            bind:checked={review}
          />
        {:else if section === "email"}<h3>Email updates</h3>
          <SettingRow
            title="Offer email updates"
            description="Participants choose whether to receive updates about this project."
            icon="mail"
            bind:checked={email}
          />
        {:else}<h3>Language</h3>
          <Field
            label="Project language"
            value={data.language}
            readonly
          /><SettingRow
            title="Use project language settings"
            description="Activities use the languages and translations from this project."
            icon="globe"
            bind:checked={useProjectLanguage}
          />{/if}
      </div>
    </Panel>
  </div>
  {#snippet footer()}<Button
      variant="neutral"
      size="control"
      onclick={() => (open = false)}>Close</Button
    ><Button variant="solid" size="control" disabled>Save changes</Button
    >{/snippet}
</Dialog>

<style>
  .settings-layout,
  .fields {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .settings-layout {
    min-height: 320px;
  }
  h3 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
  }
</style>
