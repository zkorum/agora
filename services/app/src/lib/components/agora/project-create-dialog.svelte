<script lang="ts">
  import { onMount, tick } from "svelte";

  import type { ProjectsApi } from "#lib/api/agora/projects.js";
  import closeIconAsset from "#lib/assets/agora/project-creation/close.svg";
  import * as m from "#lib/paraglide/messages.js";
  import { getLocale } from "#lib/paraglide/runtime.js";
  import {
    type CreateProjectInput,
    createProjectInputSchema,
    createProjectSlug,
    type ProjectLanguageCode,
    projectLanguageSchema,
    projectTargetLanguageLimit,
    type WorkspaceProject,
  } from "$logic/agora/project-creation.js";
  import { getProjectBodyStatus } from "$logic/agora/project-rich-text.js";
  import Button from "$ui/shared/button.svelte";
  import Dialog from "$ui/shared/dialog.svelte";
  import Field from "$ui/shared/field.svelte";
  import RichTextEditor from "$ui/shared/rich-text-editor.svelte";
  import Spinner from "$ui/shared/spinner.svelte";

  import ProjectAccessFields from "./project-access-fields.svelte";
  import ProjectLanguageFields from "./project-language-fields.svelte";
  import {
    getActiveProjectLocalizationDrafts,
    getProjectBodyEditorFeedback,
  } from "./project-presentation.js";
  import ProjectSectionNavigation from "./project-section-navigation.svelte";

  let {
    api,
    oncreated,
    dir,
    open = $bindable(true),
  }: {
    api: Pick<ProjectsApi, "getCreationOptions" | "create">;
    oncreated: (project: WorkspaceProject) => Promise<void> | void;
    dir?: "ltr" | "rtl";
    open?: boolean;
  } = $props();

  const id = $props.id();
  let projectTitle = $state("");
  let body = $state("");
  const bodyStatus = $derived(getProjectBodyStatus(body));
  let showRequiredBodyErrors = $state(false);
  let ownerOrganizationSlug = $state<string | undefined>();
  let authentication = $state<CreateProjectInput["authentication"]>("guest");
  let emailUpdates = $state<CreateProjectInput["emailUpdates"]>("off");
  let contactEmail = $state("");
  let targetLanguageCodes = $state<ProjectLanguageCode[]>([]);
  let dynamicTranslationEnabled = $state(false);
  let localizationDrafts = $state(
    projectLanguageSchema.options.map((languageCode) => ({
      languageCode,
      projectTitle: "",
      body: "",
    })),
  );
  let optionsStatus = $state<"loading" | "ready" | "error">("loading");
  let submitting = $state(false);
  let error = $state<string | undefined>();
  let activeSection = $state("details");
  let panel: HTMLFieldSetElement | undefined;
  const direction = $derived(
    dir ?? (["ar", "fa", "he"].includes(getLocale()) ? "rtl" : "ltr"),
  );
  const navigation = $derived([
    { id: "details", label: m.project_create_details() },
    { id: "authentication", label: m.project_create_authentication() },
    { id: "email", label: m.project_create_email_updates() },
    { id: "languages", label: m.project_create_languages() },
  ]);

  async function loadOptions(): Promise<void> {
    optionsStatus = "loading";
    try {
      const options = await api.getCreationOptions();
      ownerOrganizationSlug = options.organizations.find(
        (organization) =>
          organization.organizationSlug ===
          options.defaultOwnerOrganizationSlug,
      )?.organizationSlug;
      optionsStatus = "ready";
    } catch {
      optionsStatus = "error";
    }
  }

  onMount(() => {
    void loadOptions();
  });

  function goToSection(section: string): void {
    if (!panel) return;
    const target = panel.querySelector<HTMLElement>(
      `#${CSS.escape(`${id}-${section}`)}`,
    );
    if (!target) return;
    panel.scrollTo({
      top:
        panel.scrollTop +
        target.getBoundingClientRect().top -
        panel.getBoundingClientRect().top -
        12,
    });
  }

  function trackPanel(node: HTMLFieldSetElement): () => void {
    panel = node;
    const sections = Array.from(
      node.querySelectorAll<HTMLElement>("[data-section]"),
    );
    let frame = 0;
    function update(): void {
      frame = 0;
      const top = node.getBoundingClientRect().top + 24;
      let current = sections.at(0);
      for (const section of sections) {
        if (section.getBoundingClientRect().top > top) break;
        current = section;
      }
      if (node.scrollHeight - node.clientHeight - node.scrollTop <= 1)
        current = sections.at(-1);
      activeSection = current?.dataset.section ?? "details";
    }
    function scheduleUpdate(): void {
      if (!frame) frame = requestAnimationFrame(update);
    }
    node.addEventListener("scroll", scheduleUpdate, { passive: true });
    return () => {
      node.removeEventListener("scroll", scheduleUpdate);
      if (frame) cancelAnimationFrame(frame);
      panel = undefined;
    };
  }

  async function focusBody(fieldId: string): Promise<void> {
    await tick();
    panel?.querySelector<HTMLElement>(`#${CSS.escape(fieldId)}`)?.focus();
  }

  async function submit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (
      submitting ||
      optionsStatus !== "ready" ||
      ownerOrganizationSlug === undefined
    )
      return;
    error = undefined;
    if (bodyStatus.failure !== undefined) {
      await focusBody(`${id}-body`);
      return;
    }
    const activeLocalizations = getActiveProjectLocalizationDrafts({
      drafts: localizationDrafts,
      targetLanguageCodes,
      dynamicTranslationEnabled,
      hasOriginalBody: bodyStatus.html !== "",
    });
    const invalidLocalization = activeLocalizations.find(
      ({ status, bodyMissing }) => status.failure !== undefined || bodyMissing,
    );
    if (invalidLocalization) {
      showRequiredBodyErrors = true;
      await focusBody(`${id}-body-${invalidLocalization.draft.languageCode}`);
      return;
    }
    let createdProject: WorkspaceProject | undefined;
    submitting = true;
    try {
      const parsed = createProjectInputSchema.safeParse({
        projectSlug: createProjectSlug({
          title: projectTitle,
          uniquePart: Array.from(
            crypto.getRandomValues(new Uint8Array(6)),
            (byte) => byte.toString(16).padStart(2, "0"),
          ).join(""),
        }),
        projectTitle,
        body,
        ownerOrganizationSlugs: [ownerOrganizationSlug],
        authentication,
        emailUpdates,
        contact: emailUpdates === "ask" ? { email: contactEmail } : undefined,
        languageSettings: {
          targetLanguageCodes,
          dynamicTranslationEnabled,
        },
        contentLocalizations: activeLocalizations
          .filter(({ translationRequired }) => translationRequired)
          .map(({ draft }) => draft),
      });
      if (!parsed.success) {
        const paths = parsed.error.issues.map((issue) => issue.path[0]);
        error = paths.includes("contact")
          ? m.project_create_contact_details_invalid()
          : paths.includes("contentLocalizations")
            ? m.project_create_localization_invalid()
            : paths.includes("languageSettings")
              ? m.project_create_language_limit({
                  limit: projectTargetLanguageLimit,
                })
              : m.project_create_invalid();
        return;
      }
      const result = await api.create(parsed.data);
      if (!result.success) {
        error =
          result.reason === "organization_not_allowed"
            ? m.project_create_organization_error()
            : m.project_create_slug_error();
        return;
      }
      createdProject = result.project;
    } catch {
      error = m.project_create_error();
    } finally {
      submitting = false;
    }
    if (createdProject) {
      open = false;
      await oncreated(createdProject);
    }
  }
</script>

<Dialog
  title={m.project_create_title()}
  description={m.project_create_description()}
  variant="settings"
  closeLabel={m.project_create_close()}
  dir={direction}
  bind:open={
    () => open,
    (value: boolean) => {
      if (!submitting) open = value;
    }
  }
>
  {#snippet closeIcon()}<img src={closeIconAsset} alt="" />{/snippet}
  <form
    id={`${id}-form`}
    onsubmit={submit}
    aria-busy={submitting}
    class="
      flex h-full min-w-0 items-start gap-4 [--avatar-detail-display:none]
      [--avatar-gap:0.75rem] [--avatar-name-size:1rem] [--field-font-size:1rem]
      [--field-padding:17px] [--field-radius:0.75rem]
      max-sm:flex-col
    "
  >
    <ProjectSectionNavigation
      {id}
      label={m.project_create_title()}
      sections={navigation}
      active={activeSection}
      onSelect={goToSection}
    />
    <fieldset
      class="
        flex max-h-full min-h-0 min-w-0 flex-1 flex-col gap-7 overflow-y-auto
        overscroll-contain rounded-2xl border border-sky-lighter bg-sky-white
        p-7
        max-sm:w-full max-sm:px-4 max-sm:py-5
      "
      disabled={submitting}
      {@attach trackPanel}
    >
      <section
        class="flex shrink-0 scroll-mt-3 flex-col gap-6"
        id={`${id}-details`}
        data-section="details"
      >
        <h2 class="m-0 text-lg/6 font-semibold text-ink-darker">
          {m.project_create_details()}
        </h2>
        <Field
          label={m.project_create_name()}
          bind:value={projectTitle}
          placeholder={m.project_create_name_placeholder()}
          inputProps={{
            required: true,
            maxlength:
              createProjectInputSchema.shape.projectTitle.maxLength ??
              undefined,
          }}
        />
        <RichTextEditor
          id={`${id}-body`}
          label={m.project_create_body()}
          value={body}
          onValueChange={(value: string) => {
            body = value;
          }}
          placeholder={m.project_create_body_placeholder()}
          disabled={submitting}
          {...getProjectBodyEditorFeedback({ status: bodyStatus })}
        />
      </section>
      <ProjectAccessFields
        {id}
        layout="creation"
        {direction}
        disabled={submitting}
        bind:authentication
        bind:emailUpdates
        bind:contactEmail
        showContactEmail={false}
        contactEmailRequired={emailUpdates === "ask"}
      />
      <section
        id={`${id}-languages`}
        data-section="languages"
        aria-labelledby={`${id}-languages-heading`}
        class="
          flex shrink-0 scroll-mt-3 flex-col gap-6 border-t border-sky-lighter
          pt-7
        "
      >
        <ProjectLanguageFields
          {id}
          {direction}
          disabled={submitting}
          hasOriginalBody={bodyStatus.html !== ""}
          {showRequiredBodyErrors}
          bind:targetLanguageCodes
          bind:dynamicTranslationEnabled
          bind:localizationDrafts
        />
      </section>
      <p class="m-0 shrink-0 text-[13px] leading-[1.4] text-ink-light">
        {m.project_create_defaults_notice()}
      </p>
    </fieldset>
  </form>
  {#snippet footer()}
    <div class="flex min-w-0 flex-1 flex-col gap-2">
      {#if error}<p
          class="m-0 text-sm leading-[1.4] text-red-darkest"
          role="alert"
        >
          {error}
        </p>{/if}
      {#if optionsStatus === "loading"}
        <p
          class="
            m-0 flex items-center gap-2 text-base leading-[1.4] text-ink-light
          "
          role="status"
        >
          <Spinner />
          {m.project_create_options_loading()}
        </p>
      {:else if optionsStatus === "error"}
        <p class="m-0 text-sm leading-[1.4] text-red-darkest" role="alert">
          {m.project_create_options_error()}
        </p>
        <Button
          variant="neutral"
          size="control"
          class="self-end"
          onclick={loadOptions}>{m.project_create_retry()}</Button
        >
      {:else if ownerOrganizationSlug === undefined}
        <p class="m-0 text-base leading-[1.4] text-ink-light" role="status">
          {m.project_create_no_organizations()}
        </p>
      {/if}
      <div class="flex flex-wrap justify-end gap-3">
        <Button
          variant="neutral"
          size="control"
          disabled={submitting}
          onclick={() => (open = false)}>{m.project_create_cancel()}</Button
        >
        <Button
          variant="solid"
          size="control"
          type="submit"
          form={`${id}-form`}
          disabled={submitting ||
            optionsStatus !== "ready" ||
            ownerOrganizationSlug === undefined}
        >
          {#if submitting}<Spinner />{/if}
          {submitting
            ? m.project_create_submitting()
            : m.project_create_submit()}
        </Button>
      </div>
    </div>
  {/snippet}
</Dialog>
