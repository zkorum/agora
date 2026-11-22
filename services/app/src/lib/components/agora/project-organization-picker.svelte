<script lang="ts">
  import dropdownIcon from "#lib/assets/agora/project-creation/dropdown.svg";
  import * as m from "#lib/paraglide/messages.js";
  import type { ProjectOrganization } from "$logic/agora/project-creation.js";
  import OrganizationIdentity from "$ui/agora/organization-identity.svelte";
  import Combobox from "$ui/shared/combobox.svelte";
  import type { SelectItem } from "$ui/shared/view-types.js";

  type OrganizationItem = SelectItem & { organization: ProjectOrganization };

  let {
    organizations,
    value = $bindable(),
    label,
    direction,
    disabled,
    required,
    disabledSlugs,
    name,
  }: {
    organizations: readonly ProjectOrganization[];
    value: string | undefined;
    label: string;
    direction: "ltr" | "rtl";
    disabled: boolean;
    required: boolean;
    disabledSlugs: readonly string[];
    name: string | undefined;
  } = $props();

  const items = $derived(
    organizations.map((organization) => ({
      value: organization.organizationSlug,
      label: organization.name,
      organization,
      disabled:
        organization.organizationSlug !== value &&
        disabledSlugs.includes(organization.organizationSlug),
    })),
  );
</script>

<Combobox
  type="single"
  variant="field"
  dir={direction}
  {items}
  {label}
  placeholder={m.project_create_choose_organization()}
  bind:value
  disabled={disabled || organizations.length === 0}
  rootProps={{ name, required }}
  inputProps={{ "aria-label": label }}
>
  {#snippet indicator()}<img src={dropdownIcon} alt="" />{/snippet}
  {#snippet leading(item: OrganizationItem | undefined)}
    {#if item}
      <OrganizationIdentity organization={item.organization} markOnly />
    {/if}
  {/snippet}
  {#snippet itemLabel(item: OrganizationItem)}
    <OrganizationIdentity organization={item.organization} />
  {/snippet}
</Combobox>
