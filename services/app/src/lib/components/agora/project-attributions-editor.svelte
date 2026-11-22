<script lang="ts">
  import { tick } from "svelte";
  import { SvelteMap } from "svelte/reactivity";

  import * as m from "#lib/paraglide/messages.js";
  import {
    createProjectAttributionDraft,
    type ProjectAttributionDraft,
    projectAttributionRoleSchema,
  } from "$logic/agora/project-attribution.js";
  import {
    type ProjectLanguageCode,
    projectLanguageSchema,
    type ProjectOrganization,
  } from "$logic/agora/project-creation.js";
  import Button from "$ui/shared/button.svelte";
  import Combobox from "$ui/shared/combobox.svelte";
  import Disclosure from "$ui/shared/disclosure.svelte";
  import Field from "$ui/shared/field.svelte";
  import Icon from "$ui/shared/icon.svelte";
  import Select from "$ui/shared/select.svelte";
  import type { SelectItem } from "$ui/shared/view-types.js";

  import {
    MAX_LENGTH_DESCRIPTION_CREATOR,
    MAX_LENGTH_NAME_CREATOR,
  } from "../../../../../shared/src/shared.js";
  import ProjectOrganizationPicker from "./project-organization-picker.svelte";
  import {
    projectAttributionRoleLabels,
    projectLanguageLabels,
    projectLanguageSearchText,
  } from "./project-presentation.js";

  let {
    drafts = $bindable(),
    organizations,
    direction,
    disabled,
  }: {
    drafts: ProjectAttributionDraft[];
    organizations: readonly ProjectOrganization[];
    direction: "ltr" | "rtl";
    disabled: boolean;
  } = $props();

  const id = $props.id();
  let nextId = 0;
  const alternateDrafts = new SvelteMap<number, ProjectAttributionDraft>();
  const roleLabels = $derived(projectAttributionRoleLabels());
  const languageLabels = $derived(projectLanguageLabels());
  const sourceItems: SelectItem<ProjectAttributionDraft["source"]>[] = $derived(
    [
      {
        value: "organization",
        label: m.project_create_credit_existing(),
      },
      { value: "external", label: m.project_create_credit_external() },
    ],
  );
  const languageItems: SelectItem<ProjectLanguageCode>[] = $derived(
    projectLanguageSchema.options.map((value) => ({
      value,
      label: languageLabels[value],
      searchText: projectLanguageSearchText[value],
    })),
  );

  function hasExistingCredit({
    id,
    organizationSlug,
    role,
  }: {
    id: number;
    organizationSlug: string;
    role: ProjectAttributionDraft["role"];
  }): boolean {
    return (
      organizationSlug !== "" &&
      drafts.some(
        (draft) =>
          draft.id !== id &&
          draft.source === "organization" &&
          draft.organizationSlug === organizationSlug &&
          draft.role === role,
      )
    );
  }

  function getRoleItems(
    draft: ProjectAttributionDraft,
  ): SelectItem<ProjectAttributionDraft["role"]>[] {
    return projectAttributionRoleSchema.options.map((value) => ({
      value,
      label: roleLabels[value],
      disabled:
        draft.source === "organization" &&
        hasExistingCredit({
          id: draft.id,
          organizationSlug: draft.organizationSlug,
          role: value,
        }),
    }));
  }

  async function addCredit(): Promise<void> {
    nextId = drafts.reduce(
      (availableId, draft) => Math.max(availableId, draft.id + 1),
      nextId,
    );
    const draft = createProjectAttributionDraft(nextId++);
    drafts = [...drafts, draft];
    await tick();
    document.getElementById(`${id}-name-${draft.id}`)?.focus();
  }

  function removeCredit(id: number): void {
    drafts = drafts.filter((draft) => draft.id !== id);
    alternateDrafts.delete(id);
  }

  function changeSource({
    id,
    source,
  }: {
    id: number;
    source: ProjectAttributionDraft["source"] | undefined;
  }): void {
    if (source === undefined) return;
    const current = drafts.find((draft) => draft.id === id);
    if (!current || current.source === source) return;

    const previous = alternateDrafts.get(id);
    const replacement: ProjectAttributionDraft =
      previous?.source === source
        ? { ...previous, role: current.role }
        : source === "organization"
          ? { id, role: current.role, source, organizationSlug: "" }
          : { ...createProjectAttributionDraft(id), role: current.role };

    if (replacement.source === "organization" && hasExistingCredit(replacement))
      replacement.organizationSlug = "";

    alternateDrafts.set(id, current);
    drafts = drafts.map((draft) => (draft.id === id ? replacement : draft));
  }
</script>

<div class="flex min-w-0 flex-col gap-4" dir={direction}>
  {#each drafts as draft, index (draft.id)}
    <fieldset
      class="
        flex min-w-0 flex-col gap-3 rounded-xl border border-sky-lighter p-4
      "
      {disabled}
    >
      <legend class="px-1 text-[15px] font-semibold text-ink-dark"
        >{m.project_create_credit_label({ number: index + 1 })}</legend
      >
      <div
        class="
          grid grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))]
          items-end gap-3
        "
      >
        {#if draft.source === "organization"}
          <ProjectOrganizationPicker
            {organizations}
            {direction}
            label={m.project_create_credit_existing()}
            bind:value={
              () => draft.organizationSlug || undefined,
              (value: string | undefined) => {
                draft.organizationSlug = value ?? "";
              }
            }
            {disabled}
            required
            disabledSlugs={drafts.flatMap((entry) =>
              entry.id !== draft.id &&
              entry.source === "organization" &&
              entry.role === draft.role
                ? [entry.organizationSlug]
                : [],
            )}
            name={undefined}
          />
        {:else}
          <Field
            label={m.project_create_credit_name()}
            bind:value={draft.displayName}
            inputProps={{
              id: `${id}-name-${draft.id}`,
              disabled,
              required: true,
              maxlength: MAX_LENGTH_NAME_CREATOR,
            }}
          />
        {/if}
        <Select
          type="single"
          variant="field"
          dir={direction}
          items={sourceItems}
          label={m.project_create_credit_source()}
          placeholder={m.project_create_credit_source()}
          value={draft.source}
          onValueChange={(
            source: ProjectAttributionDraft["source"] | undefined,
          ) => {
            changeSource({ id: draft.id, source });
          }}
          {disabled}
          rootProps={{ required: true }}
        />
        <Select
          type="single"
          variant="field"
          dir={direction}
          items={getRoleItems(draft)}
          label={m.project_create_credit_role()}
          placeholder={m.project_create_credit_role()}
          value={draft.role}
          onValueChange={(
            value: ProjectAttributionDraft["role"] | undefined,
          ) => {
            if (value !== undefined) draft.role = value;
          }}
          {disabled}
          rootProps={{ required: true }}
        />
      </div>
      {#if draft.source === "external"}
        <Disclosure label={m.project_create_credit_additional_details()}>
          <div class="grid gap-3 pt-2">
            <Field
              label={m.project_create_credit_description()}
              bind:value={draft.description}
              multiline
              textareaProps={{
                disabled,
                rows: 2,
                maxlength: MAX_LENGTH_DESCRIPTION_CREATOR,
              }}
            />
            <Field
              label={m.project_create_credit_website()}
              bind:value={draft.websiteUrl}
              placeholder="https://"
              inputProps={{ disabled, inputmode: "url" }}
            />
            <Field
              label={m.project_create_credit_image()}
              bind:value={draft.imagePath}
              placeholder="https://"
              inputProps={{ disabled, inputmode: "url" }}
            />
            <Combobox
              type="single"
              variant="field"
              dir={direction}
              items={languageItems}
              label={m.project_create_credit_language()}
              placeholder={m.project_create_credit_language()}
              value={draft.defaultLanguageCode}
              onValueChange={(value: ProjectLanguageCode | undefined) => {
                if (value !== undefined) draft.defaultLanguageCode = value;
              }}
              {disabled}
              rootProps={{ required: true }}
            />
          </div>
        </Disclosure>
      {/if}
      <Button
        variant="quiet"
        class="gap-2 self-start"
        {disabled}
        onclick={() => {
          removeCredit(draft.id);
        }}
      >
        <Icon name="close" size={16} />
        {m.project_create_remove_credit({ number: index + 1 })}
      </Button>
    </fieldset>
  {/each}
  <Button
    variant="quiet"
    class="gap-2 self-start"
    {disabled}
    onclick={() => {
      void addCredit();
    }}
  >
    <Icon name="plus" size={16} />
    {m.project_create_add_credit()}
  </Button>
</div>
