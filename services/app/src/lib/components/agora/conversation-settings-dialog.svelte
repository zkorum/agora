<script lang="ts">
  import { untrack } from "svelte";

  import * as m from "#lib/paraglide/messages.js";
  import type { WorkspaceProject } from "$logic/agora/project-creation.js";
  import Button from "$ui/shared/button.svelte";
  import Dialog from "$ui/shared/dialog.svelte";
  import Field from "$ui/shared/field.svelte";
  import Select from "$ui/shared/select.svelte";
  import SettingRow from "$ui/shared/setting-row.svelte";

  import {
    MAX_LENGTH_CONVERSATION_BODY,
    MAX_LENGTH_CONVERSATION_TITLE,
  } from "../../../../../shared/src/shared.js";
  import type {
    ConversationSettings,
    ConversationSettingsTarget,
  } from "./conversation-settings.js";
  import {
    projectAuthenticationLabels,
    projectEmailUpdatesLabels,
    projectLanguageLabels,
  } from "./project-presentation.js";

  let {
    settings,
    pending,
    created,
    project,
    target,
    dir,
    onclose,
    onapply,
  }: {
    settings: ConversationSettings;
    pending: boolean;
    created: boolean;
    project: WorkspaceProject;
    target: ConversationSettingsTarget;
    dir: "ltr" | "rtl";
    onclose: (target: ConversationSettingsTarget) => void;
    onapply: (value: ConversationSettings) => Promise<boolean>;
  } = $props();
  const id = $props.id();
  let title = $state(untrack(() => settings.title));
  let description = $state(untrack(() => settings.description));
  let participation = $state(untrack(() => ({ ...settings.participation })));
  const session = untrack(() => target);
  const { opener, field } = session;
  let open = $state(true);
  const sections = $derived([
    { key: "details", label: m.conversation_settings_details() },
    { key: "participation", label: m.project_detail_participation() },
    { key: "project", label: m.conversation_settings_defaults() },
  ] as const);
  type Section = "details" | "participation" | "project";
  let active = $state<Section>("details");
  const displayOptions = $derived([
    { value: "feed", label: m.draft_preview_feed() },
    { value: "deck", label: m.draft_preview_deck() },
  ] as const);
  const methodOptions = $derived([
    { value: "pairwise", label: m.draft_preview_pairwise() },
    { value: "bws", label: m.draft_preview_bws() },
    { value: "qv", label: m.draft_preview_qv() },
  ] as const);
  const visibilityOptions = $derived([
    { value: "everyone", label: m.conversation_settings_everyone() },
    { value: "facilitators", label: m.conversation_settings_facilitators() },
  ] as const);

  function focusField(event: Event) {
    const input = document.getElementById(`${id}-${field}`);
    if (field === "project") {
      event.preventDefault();
      reveal("project");
      return;
    }
    if (input) {
      event.preventDefault();
      input.focus();
    }
  }
  function restoreFocus(event: Event) {
    if (opener?.isConnected) {
      event.preventDefault();
      opener.focus({ preventScroll: true });
    }
  }
  function reveal(key: Section) {
    const section = document.getElementById(`${id}-${key}`);
    section?.focus({ preventScroll: true });
    section?.scrollIntoView({ block: "start" });
    active = key;
  }
  function trackScroll(event: Event) {
    const panel = event.currentTarget;
    if (!(panel instanceof HTMLElement)) return;
    if (
      panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 1 &&
      panel.scrollTop > 0
    ) {
      active = "project";
      return;
    }
    const edge = panel.getBoundingClientRect().top + 32;
    let selected: Section = "details";
    for (const item of sections) {
      const el = document.getElementById(`${id}-${item.key}`);
      if (el && el.getBoundingClientRect().top <= edge) selected = item.key;
    }
    active = selected;
  }
  let failed = $state(false);
  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (pending || !title.trim()) return;
    failed = false;
    const saved = await onapply({
      title: title.trim(),
      description: description.trim(),
      participation: { ...participation },
    });
    if (saved) open = false;
    else failed = true;
  }
  function shortcut(event: KeyboardEvent) {
    if (
      (event.metaKey || event.ctrlKey) &&
      event.key === "Enter" &&
      !event.isComposing &&
      (event.currentTarget instanceof HTMLInputElement ||
        event.currentTarget instanceof HTMLTextAreaElement)
    ) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }
</script>

<Dialog
  bind:open={
    () => open,
    (next: boolean) => {
      if (!pending) open = next;
    }
  }
  {dir}
  variant="settings"
  title={m.conversation_settings_title()}
  description={m.conversation_settings_details()}
  closeLabel={m.workspace_dialog_close()}
  rootProps={{
    onOpenChangeComplete: (value: boolean) => {
      if (!value) onclose(session);
    },
  }}
  contentProps={{
    onOpenAutoFocus: focusField,
    onCloseAutoFocus: restoreFocus,
  }}
>
  <form
    class="
      grid h-full grid-cols-[minmax(8rem,10rem)_minmax(0,1fr)] gap-4
      max-md:grid-cols-1 max-md:grid-rows-[auto_minmax(0,1fr)] max-md:gap-2
    "
    {id}
    onsubmit={save}
  >
    <nav
      class="
        flex flex-col items-stretch gap-0.5
        max-md:flex-row max-md:overflow-x-auto
      "
      aria-label={m.conversation_settings_title()}
    >
      {#each sections as item (item.key)}
        <Button
          variant="unstyled"
          class="
            cursor-pointer rounded-lg px-4 py-3 text-start
            aria-[current=location]:bg-sky-lighter
            max-md:flex-none max-md:p-2
          "
          aria-current={active === item.key ? "location" : undefined}
          aria-controls={`${id}-${item.key}`}
          onclick={() => {
            reveal(item.key);
          }}>{item.label}</Button
        >
      {/each}
    </nav>
    <div
      class="
        min-h-0 overflow-auto overscroll-contain rounded-xl border
        border-sky-lighter bg-sky-white px-[clamp(14px,3vw,28px)]
      "
      onscroll={trackScroll}
    >
      <section
        class="
          grid scroll-mt-2 gap-4 border-sky-lighter py-6
          not-first:border-t
        "
        id={`${id}-details`}
        tabindex="-1"
      >
        <h2 class="text-lg font-semibold">
          {m.conversation_settings_details()}
        </h2>
        <Field
          label={m.conversation_settings_name()}
          readonly={pending}
          bind:value={title}
          inputProps={{
            id: `${id}-name`,
            onkeydown: shortcut,
            required: true,
            maxlength: MAX_LENGTH_CONVERSATION_TITLE,
          }}
        />
        <Field
          label={m.conversation_settings_description()}
          multiline
          readonly={pending}
          bind:value={description}
          textareaProps={{
            id: `${id}-description`,
            onkeydown: shortcut,
            maxlength: MAX_LENGTH_CONVERSATION_BODY,
          }}
        />
      </section>
      <section
        class="
          grid scroll-mt-2 gap-4 border-sky-lighter py-6
          not-first:border-t
        "
        id={`${id}-participation`}
        tabindex="-1"
      >
        <h2 class="text-lg font-semibold">
          {m.project_detail_participation()}
        </h2>
        {#if participation.kind === "polis"}
          <SettingRow
            title={m.conversation_settings_allow_opinions()}
            description={m.project_detail_polis_description()}
            icon="message"
            bind:checked={participation.allowNewOpinions}
            disabled={pending}
          />
          <Select
            type="single"
            variant="field"
            {dir}
            items={displayOptions}
            disabled={pending}
            label={m.draft_preview_display()}
            placeholder={m.draft_preview_display()}
            value={participation.display}
            onValueChange={(value: "feed" | "deck" | undefined) => {
              if (value) participation.display = value;
            }}
          />
        {:else if participation.kind === "prioritizing"}
          <Select
            type="single"
            variant="field"
            {dir}
            items={methodOptions}
            disabled={pending || created}
            label={m.draft_preview_method()}
            placeholder={m.draft_preview_method()}
            value={participation.method}
            onValueChange={(value: "pairwise" | "bws" | "qv" | undefined) => {
              participation.method = value;
            }}
          />
        {:else if participation.gatheringMode === "amend"}<p>
            {m.gather_amend_empty()}
          </p>
        {:else}
          <SettingRow
            title={m.conversation_settings_allow_responses()}
            description={m.project_detail_gathering_description()}
            icon="message"
            bind:checked={participation.allowNewResponses}
            disabled={pending}
          />
          <Select
            type="single"
            variant="field"
            {dir}
            items={visibilityOptions}
            disabled={pending || created}
            label={m.conversation_settings_visibility()}
            placeholder={m.conversation_settings_visibility()}
            value={participation.responseVisibility}
            onValueChange={(value: "everyone" | "facilitators" | undefined) => {
              if (value) participation.responseVisibility = value;
            }}
          />
        {/if}
      </section>
      <section
        class="
          grid scroll-mt-2 gap-4 border-sky-lighter py-6
          not-first:border-t
        "
        id={`${id}-project`}
        tabindex="-1"
      >
        <h2 class="text-lg font-semibold">
          {m.conversation_settings_defaults()}
        </h2>
        <dl
          class="
            grid gap-3
            [&>div]:flex [&>div]:flex-wrap [&>div]:justify-between [&>div]:gap-2
          "
        >
          <div>
            <dt>{m.activity_visibility_settings()}</dt>
            <dd>
              {project.directoryVisibility === "listed"
                ? m.project_workspace_published_description()
                : m.project_workspace_unpublished_description()}
            </dd>
          </div>
          <div>
            <dt>{m.project_create_authentication()}</dt>
            <dd class="text-ink-light">
              {projectAuthenticationLabels()[project.authentication]}
            </dd>
          </div>
          <div>
            <dt>{m.project_create_dynamic_translation()}</dt>
            <dd class="text-ink-light">
              {project.languageSettings.dynamicTranslationEnabled
                ? m.project_create_dynamic_translation_on()
                : m.project_create_dynamic_translation_off()}
            </dd>
          </div>
          {#if project.languageSettings.targetLanguageCodes.length}<div>
              <dt>{m.project_create_additional_languages()}</dt>
              <dd class="text-ink-light">
                {project.languageSettings.targetLanguageCodes
                  .map((code) => projectLanguageLabels()[code])
                  .join(", ")}
              </dd>
            </div>{/if}
          <div>
            <dt>{m.project_create_email_updates()}</dt>
            <dd class="text-ink-light">
              {projectEmailUpdatesLabels()[project.emailUpdates]}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  </form>
  {#snippet footer()}
    {#if failed}<p role="alert">{m.authoring_action_failed()}</p>{/if}

    <Button
      variant="neutral"
      size="control"
      disabled={pending}
      onclick={() => {
        open = false;
      }}>{m.project_create_cancel()}</Button
    >
    <Button
      variant="solid"
      size="control"
      type="submit"
      form={id}
      disabled={pending || !title.trim()}
      >{m.conversation_settings_save()}</Button
    >
  {/snippet}
</Dialog>
