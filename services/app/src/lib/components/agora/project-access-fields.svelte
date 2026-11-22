<script lang="ts">
  import dropdownIcon from "#lib/assets/agora/project-creation/dropdown.svg";
  import emailIcon from "#lib/assets/agora/project-creation/email.svg";
  import guestIcon from "#lib/assets/agora/project-creation/guest.svg";
  import * as m from "#lib/paraglide/messages.js";
  import {
    type CreateProjectInput,
    projectAuthenticationSchema,
    projectEmailUpdatesSchema,
  } from "$logic/agora/project-creation.js";
  import Field from "$ui/shared/field.svelte";
  import Icon from "$ui/shared/icon.svelte";
  import Select from "$ui/shared/select.svelte";
  import { showSuccessToast } from "$ui/shared/toast.js";

  import ProjectAuthenticationHelp from "./project-authentication-help.svelte";
  import {
    projectAuthenticationLabels,
    projectEmailUpdatesLabels,
  } from "./project-presentation.js";

  type Authentication = CreateProjectInput["authentication"];
  type EmailUpdates = CreateProjectInput["emailUpdates"];

  let {
    id,
    layout,
    direction,
    disabled,
    authentication = $bindable(),
    emailUpdates = $bindable(),
    contactEmail = $bindable(),
    showContactEmail,
    contactEmailRequired,
  }: {
    id: string;
    layout: "creation" | "settings";
    direction: "ltr" | "rtl";
    disabled: boolean;
    authentication: Authentication;
    emailUpdates: EmailUpdates;
    contactEmail: string;
    showContactEmail: boolean;
    contactEmailRequired: boolean;
  } = $props();

  const heading = $derived(layout === "creation" ? "h2" : "h3");
  const authenticationLabels = $derived(projectAuthenticationLabels());
  const emailLabels = $derived(projectEmailUpdatesLabels());
  const authenticationItems = $derived(
    projectAuthenticationSchema.options.map((value) => ({
      value,
      label: authenticationLabels[value],
    })),
  );
  const emailItems = $derived(
    projectEmailUpdatesSchema.options.map((value) => ({
      value,
      label: emailLabels[value],
    })),
  );

  function changeAuthentication(value: Authentication | undefined): void {
    if (value === undefined || value === authentication) return;
    authentication = value;
    if (value !== "email_verification" && emailUpdates === "ask") {
      emailUpdates = "off";
      showSuccessToast({
        id: "project-email-updates-turned-off",
        message: m.project_create_email_updates_turned_off(),
      });
    }
  }

  function changeEmailUpdates(value: EmailUpdates | undefined): void {
    if (value === undefined || value === emailUpdates) return;
    emailUpdates = value;
    if (value === "ask" && authentication !== "email_verification") {
      authentication = "email_verification";
      showSuccessToast({
        id: "project-email-authentication-changed",
        message: m.project_create_email_authentication_changed(),
      });
    }
  }
</script>

{#snippet indicator()}<img src={dropdownIcon} alt="" />{/snippet}

<section
  id={`${id}-authentication`}
  data-section="authentication"
  class={[
    "flex shrink-0 scroll-mt-3 flex-col gap-6",
    layout === "creation" && "border-t border-sky-lighter pt-7",
  ]}
>
  <div class="flex flex-col gap-1">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <svelte:element
        this={heading}
        class={[
          "m-0 font-semibold text-ink-darker",
          heading === "h2" ? "text-lg/6" : "text-[15px]",
        ]}
      >
        {m.project_create_authentication()}
      </svelte:element>
      <ProjectAuthenticationHelp {direction} {disabled} />
    </div>
    <p
      class="m-0 text-base leading-[1.4] text-ink-light"
      id={`${id}-authentication-description`}
    >
      {m.project_create_authentication_description()}
    </p>
  </div>
  <Select
    type="single"
    variant="field"
    dir={direction}
    items={authenticationItems}
    placeholder={m.project_create_guest()}
    value={authentication}
    onValueChange={changeAuthentication}
    rootProps={{ name: "authentication", required: true }}
    triggerProps={{
      "aria-label": m.project_create_authentication(),
      "aria-describedby": `${id}-authentication-description`,
    }}
    {disabled}
    {indicator}
  >
    {#snippet leading()}
      {#if authentication === "guest"}
        <img src={guestIcon} alt="" />
      {:else}
        <Icon name="shield" size={20} />
      {/if}
    {/snippet}
  </Select>
</section>
<section
  id={`${id}-email`}
  data-section="email"
  class={[
    "flex shrink-0 scroll-mt-3 flex-col gap-6",
    layout === "creation" && "border-t border-sky-lighter pt-7",
  ]}
>
  <div class="flex flex-col gap-1">
    <svelte:element
      this={heading}
      class={[
        "m-0 font-semibold text-ink-darker",
        heading === "h2" ? "text-lg/6" : "text-[15px]",
      ]}>{m.project_create_email_updates()}</svelte:element
    >
    <p
      class="m-0 text-base leading-[1.4] text-ink-light"
      id={`${id}-email-updates-description`}
    >
      {m.project_create_email_updates_description()}
    </p>
  </div>
  <Select
    type="single"
    variant="field"
    dir={direction}
    items={emailItems}
    placeholder={m.project_create_email_off()}
    value={emailUpdates}
    onValueChange={changeEmailUpdates}
    rootProps={{ name: "emailUpdates", required: true }}
    triggerProps={{
      "aria-label": m.project_create_email_updates(),
      "aria-describedby": `${id}-email-updates-description`,
    }}
    {disabled}
    {indicator}
  >
    {#snippet leading()}
      {#if emailUpdates === "off"}
        <img src={emailIcon} alt="" />
      {:else}
        <Icon name="mail" size={20} />
      {/if}
    {/snippet}
  </Select>
  {#if emailUpdates === "ask" || showContactEmail}
    <Field
      label={m.project_create_contact_email()}
      hint={m.project_create_contact_email_public()}
      bind:value={contactEmail}
      inputProps={{
        id: `${id}-contact-email`,
        type: "email",
        autocomplete: "email",
        required: contactEmailRequired,
        disabled,
      }}
    />
  {/if}
</section>
