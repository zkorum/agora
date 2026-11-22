<script lang="ts">
  import type { Snippet } from "svelte";

  import * as m from "#lib/paraglide/messages.js";
  import Button from "$ui/shared/button.svelte";
  import Dialog from "$ui/shared/dialog.svelte";
  import Disclosure from "$ui/shared/disclosure.svelte";
  import Field from "$ui/shared/field.svelte";
  import SettingRow from "$ui/shared/setting-row.svelte";

  import type { AccountSettingsPreview } from "./view-types.js";

  let {
    dir,
    children,
    language,
    preview,
  }: {
    dir: "ltr" | "rtl";
    children: Snippet<[(opener: HTMLElement) => void]>;
    language: Snippet;
    preview?: {
      account: AccountSettingsPreview;
      onsave: (next: AccountSettingsPreview) => void;
      ondelete: () => void;
    };
  } = $props();

  let open = $state(false);
  let opener: HTMLElement | undefined;
  let draft = $state<AccountSettingsPreview>();
  type Section =
    | "language"
    | "account"
    | "email"
    | "delete"
    | (typeof legalDocuments)[number]["id"];
  let section = $state<Section>("language");
  let confirmation = $state("");
  const formId = $props.id();
  const legalDocuments = $derived([
    {
      id: "privacy",
      label: m.settings_privacy_policy(),
      href: "https://www.agoracitizen.app/legal/privacy/",
    },
    {
      id: "terms",
      label: m.settings_terms_of_service(),
      href: "https://www.agoracitizen.app/legal/terms/",
    },
    {
      id: "guidelines",
      label: m.settings_community_guidelines(),
      href: "https://www.agoracitizen.app/legal/guidelines/",
    },
  ] as const);
  const activeDocument = $derived(
    legalDocuments.find((policy) => policy.id === section),
  );
  const navClass =
    "flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-start text-sm font-medium text-ink-light hover:bg-sky-lighter focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-base aria-[current=location]:bg-sky-lighter aria-[current=location]:text-ink-dark";

  function show(trigger: HTMLElement) {
    opener = trigger;
    draft = preview ? $state.snapshot(preview.account) : undefined;
    section = draft ? "account" : "language";
    confirmation = "";
    open = true;
  }

  function submit(event: SubmitEvent) {
    event.preventDefault();
    if (!preview || !draft) return;
    if (section === "delete") {
      if (confirmation !== "delete") return;
      preview.ondelete();
    } else {
      const username = draft.username.trim();
      if (username.length < 2 || username.length > 40) return;
      preview.onsave({ ...$state.snapshot(draft), username });
    }
    open = false;
  }
</script>

{@render children(show)}

{#snippet sectionLink(id: Section, label: string)}
  <Button
    variant="unstyled"
    class={navClass}
    aria-current={section === id ? "location" : undefined}
    aria-controls={formId}
    onclick={() => {
      section = id;
      confirmation = "";
    }}>{label}</Button
  >
{/snippet}

<Dialog
  bind:open
  {dir}
  variant="settings"
  title={m.app_account_settings()}
  description={m.settings_description()}
  closeLabel={m.workspace_dialog_close()}
  contentProps={{
    onCloseAutoFocus(event: Event) {
      if (opener?.isConnected) {
        event.preventDefault();
        opener.focus({ preventScroll: true });
      }
    },
  }}
>
  <div
    class="
      flex h-full min-h-0 gap-6
      max-sm:flex-col max-sm:gap-3 max-sm:overflow-auto
    "
  >
    <nav
      aria-label={m.app_account_settings()}
      class="
        flex w-48 shrink-0 flex-col overflow-y-auto
        max-sm:grid max-sm:w-full max-sm:grid-cols-2 max-sm:overflow-visible
      "
    >
      {#if draft}{@render sectionLink(
          "account",
          m.settings_account_details(),
        )}{/if}
      {@render sectionLink("language", m.language_label())}
      {#if draft}{@render sectionLink("email", m.settings_email_updates())}{/if}
      <hr class="col-span-full my-2 border-sky-lighter" />
      {#each legalDocuments as policy (policy.id)}
        {@render sectionLink(policy.id, policy.label)}
      {/each}
      <Button
        variant="unstyled"
        class={navClass}
        href="https://www.agoracitizen.app/conversation/nRAynpw"
        target="_blank"
        rel="noopener noreferrer"
      >
        {m.settings_product_roadmap()}
        <span
          class="icon-[lucide--external-link] size-4 shrink-0"
          aria-hidden="true"
        ></span>
      </Button>
      {#if draft}
        <hr class="col-span-full my-2 border-sky-lighter" />
        {@render sectionLink("delete", m.settings_delete_account())}
      {/if}
    </nav>
    <form
      id={formId}
      class="
        flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto rounded-2xl
        border border-sky-lighter bg-sky-white p-6
        max-sm:flex-none max-sm:p-4
      "
      onsubmit={submit}
    >
      {#if preview && draft && !activeDocument}
        <p class="rounded-lg bg-primary-lightest p-3 text-sm text-ink-base">
          {m.settings_mock_notice()}
        </p>
      {/if}
      {#if activeDocument}
        <h3 class="text-xl font-semibold">{activeDocument.label}</h3>
        <p>{m.settings_legal_preview()}</p>
        <Button
          variant="neutral"
          size="control"
          class="self-start"
          href={activeDocument.href}
          target="_blank"
          rel="noopener noreferrer">{m.settings_read_published()}</Button
        >
      {:else if section === "account" && draft}
        <h3 class="text-xl font-semibold">{m.settings_account_details()}</h3>
        <Field
          label={m.email_label()}
          value={draft.email}
          readonly
          inputProps={{ type: "email" }}
        />
        <Field
          label={m.settings_username()}
          bind:value={draft.username}
          inputProps={{
            required: true,
            minlength: 2,
            maxlength: 40,
            autocomplete: "username",
          }}
        />
      {:else if section === "email" && draft}
        <h3 class="text-xl font-semibold">{m.settings_email_updates()}</h3>
        {#each draft.subscriptions as subscription (subscription.projectSlug)}
          <section class="rounded-xl border border-sky-lighter p-3">
            <SettingRow
              title={m.settings_project_updates({
                project: subscription.projectTitle,
              })}
              description=""
              icon="mail"
              bind:checked={
                () =>
                  subscription.activities.length
                    ? subscription.activities.some(
                        (activity) => activity.enabled,
                      )
                    : subscription.enabled,
                (enabled: boolean) => {
                  subscription.enabled = enabled;
                  for (const activity of subscription.activities)
                    activity.enabled = enabled;
                }
              }
            />
            {#if subscription.activities.length}
              <Disclosure label={subscription.projectTitle}>
                <div class="grid gap-2 ps-3">
                  {#each subscription.activities as activity (activity.id)}
                    <SettingRow
                      title={activity.title}
                      icon="mail"
                      description=""
                      bind:checked={activity.enabled}
                    />
                  {/each}
                </div>
              </Disclosure>
            {/if}
          </section>
        {:else}
          <p>{m.settings_email_empty()}</p>
        {/each}
      {:else if section === "delete" && draft}
        <h3 class="text-xl font-semibold">{m.settings_delete_account()}</h3>
        <p>{m.settings_delete_notice()}</p>
        <Field
          label={m.settings_delete_confirmation()}
          bind:value={confirmation}
          inputProps={{
            autocomplete: "off",
            spellcheck: false,
            required: true,
          }}
        />
      {:else}
        <h3 class="text-xl font-semibold">{m.language_label()}</h3>
        {@render language()}
      {/if}
    </form>
  </div>
  {#snippet footer()}
    {#if draft && preview && !activeDocument}
      <Button variant="neutral" size="control" onclick={() => (open = false)}
        >{m.project_create_cancel()}</Button
      >
      {#if section === "delete"}
        <Button
          variant="danger"
          size="control"
          form={formId}
          type="submit"
          disabled={confirmation !== "delete"}
          >{m.settings_delete_account()}</Button
        >
      {:else}
        <Button
          variant="solid"
          size="control"
          form={formId}
          type="submit"
          disabled={draft.username.trim().length < 2}
          >{m.conversation_settings_save()}</Button
        >
      {/if}
    {/if}
  {/snippet}
</Dialog>
