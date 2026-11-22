<script lang="ts">
  import { onMount, tick, untrack } from "svelte";

  import type {
    ProjectsApi,
    ProjectSettingsSection,
    UpdateProjectSettingsInput,
  } from "#lib/api/agora/projects.js";
  import closeIconAsset from "#lib/assets/agora/project-creation/close.svg";
  import * as m from "#lib/paraglide/messages.js";
  import {
    getProjectAttributionInput,
    type ProjectAttributionDraft,
  } from "$logic/agora/project-attribution.js";
  import {
    createProjectInputSchema,
    type ProjectLanguageCode,
    projectLanguageSchema,
    type ProjectOrganization,
    type WorkspaceProject,
  } from "$logic/agora/project-creation.js";
  import { getProjectBodyStatus } from "$logic/agora/project-rich-text.js";
  import Button from "$ui/shared/button.svelte";
  import Dialog from "$ui/shared/dialog.svelte";
  import Field from "$ui/shared/field.svelte";
  import Icon from "$ui/shared/icon.svelte";
  import RichTextEditor from "$ui/shared/rich-text-editor.svelte";
  import Spinner from "$ui/shared/spinner.svelte";
  import { showSuccessToast } from "$ui/shared/toast.js";

  import ProjectAccessFields from "./project-access-fields.svelte";
  import ProjectAttributionsEditor from "./project-attributions-editor.svelte";
  import ProjectHeaderBackgroundField from "./project-header-background-field.svelte";
  import ProjectLanguageFields from "./project-language-fields.svelte";
  import ProjectOrganizationPicker from "./project-organization-picker.svelte";
  import {
    getActiveProjectLocalizationDrafts,
    getProjectBodyEditorFeedback,
  } from "./project-presentation.js";
  import ProjectSectionNavigation from "./project-section-navigation.svelte";

  let {
    project,
    api,
    direction,
    section,
    pending,
    open = $bindable(),
    onsave,
  }: {
    project: WorkspaceProject;
    api: ProjectsApi;
    direction: "ltr" | "rtl";
    section: ProjectSettingsSection;
    pending: boolean;
    open: boolean;
    onsave: (
      input: UpdateProjectSettingsInput,
    ) => Promise<WorkspaceProject | undefined>;
  } = $props();

  const id = $props.id();
  const formId = `${id}-form`;
  const nameId = `${id}-name`;
  const bodyId = `${id}-body`;
  const descriptionId = `${id}-description`;
  const contactEmailId = `${id}-contact-email`;
  let projectTitle = $state(untrack(() => project.projectTitle));
  let body = $state(untrack(() => project.body));
  const bodyStatus = $derived(getProjectBodyStatus(body));
  let headerBackgroundChange =
    $state.raw<UpdateProjectSettingsInput["headerBackgroundChange"]>();
  let checkingHeaderBackground = $state(false);
  let authentication = $state(untrack(() => project.authentication));
  let emailUpdates = $state(untrack(() => project.emailUpdates));
  let contactEmail = $state(untrack(() => project.contact?.email ?? ""));
  let owners = $state(
    untrack(() =>
      project.ownerOrganizationSlugs.map((slug, id) => ({ id, slug })),
    ),
  );
  let nextOwnerId = untrack(() => project.ownerOrganizationSlugs.length);
  let targetLanguageCodes = $state<ProjectLanguageCode[]>(
    untrack(() => [...project.languageSettings.targetLanguageCodes]),
  );
  let dynamicTranslationEnabled = $state(
    untrack(() => project.languageSettings.dynamicTranslationEnabled),
  );
  let localizationDrafts = $state(
    untrack(() =>
      projectLanguageSchema.options.map((languageCode) => {
        const saved = project.contentLocalizations.find(
          (entry) => entry.languageCode === languageCode,
        );
        return {
          languageCode,
          projectTitle: saved?.projectTitle ?? "",
          body: saved?.body ?? "",
        };
      }),
    ),
  );
  let attributions = $state<ProjectAttributionDraft[]>(
    untrack(() =>
      project.attributions.map((attribution, id) =>
        attribution.source === "organization"
          ? { ...attribution, id }
          : {
              id,
              source: attribution.source,
              role: attribution.role,
              defaultLanguageCode: attribution.defaultLanguageCode,
              displayName: attribution.displayName,
              description: attribution.description ?? "",
              websiteUrl: attribution.websiteUrl ?? "",
              imagePath: attribution.imagePath ?? "",
            },
      ),
    ),
  );
  let publicOrganizations = $state.raw<readonly ProjectOrganization[]>([]);
  let eligibleOwnerOrganizations = $state.raw<readonly ProjectOrganization[]>(
    [],
  );
  let optionsStatus = $state<"loading" | "ready" | "error">("loading");
  let submitting = $state(false);
  let error = $state<string | undefined>();
  let saveError: HTMLParagraphElement | undefined;
  let showRequiredBodyErrors = $state(false);
  type NavigationSection = Exclude<
    ProjectSettingsSection,
    "name" | "description"
  >;
  let activeSection = $state<NavigationSection>("details");
  let panel: HTMLFieldSetElement | undefined;
  let navigationScrollTop: number | undefined;
  let opener: HTMLButtonElement | undefined;
  const navigation: { id: NavigationSection; label: string }[] = $derived([
    { id: "details", label: m.project_create_details() },
    { id: "organizations", label: m.project_create_organizations() },
    { id: "access", label: m.project_workspace_settings_access() },
    { id: "languages", label: m.project_create_languages() },
  ]);
  const busy = $derived(submitting || pending);
  const showContactEmail = $derived(project.contact !== undefined);
  const contactEmailRequired = $derived.by(() => {
    if (emailUpdates === "ask") return true;
    const contact = project.contact;
    if (contact === undefined) return false;
    return [
      contact.firstName,
      contact.lastName,
      contact.roleLabel,
      contact.websiteUrl,
      contact.imagePath,
      contact.organizationSlug,
    ].some((value) => value !== undefined);
  });
  const savedOrganizationSlugs = $derived(
    new Set(
      [...project.referencedOrganizations, ...project.ownerOrganizations].map(
        ({ organizationSlug }) => organizationSlug,
      ),
    ),
  );
  const ownerOrganizationChoices = $derived(
    optionsStatus === "ready"
      ? eligibleOwnerOrganizations
      : project.ownerOrganizations,
  );
  const creditOrganizationChoices = $derived(
    optionsStatus === "ready"
      ? publicOrganizations
      : project.referencedOrganizations.filter((organization) =>
          project.attributions.some(
            (entry) =>
              entry.source === "organization" &&
              entry.organizationSlug === organization.organizationSlug,
          ),
        ),
  );
  async function loadOrganizations(): Promise<void> {
    try {
      const options = await api.getCreationOptions();
      publicOrganizations = options.publicOrganizations;
      eligibleOwnerOrganizations = options.organizations;
      optionsStatus = "ready";
    } catch {
      optionsStatus = "error";
    }
  }

  onMount(() => {
    void loadOrganizations();
  });

  function retryOrganizations(): void {
    if (optionsStatus !== "error") return;
    optionsStatus = "loading";
    void loadOrganizations();
  }

  function settingsNotShownOnProject(project: UpdateProjectSettingsInput) {
    return {
      emailUpdates: project.emailUpdates,
      languageSettings: project.languageSettings,
      contentLocalizations: project.contentLocalizations,
    };
  }

  function findPanelTarget(targetId: string): HTMLElement | undefined {
    return (
      panel?.querySelector<HTMLElement>(`#${CSS.escape(targetId)}`) ?? undefined
    );
  }

  function revealSection({
    section,
    targetId = `${id}-${section}`,
  }: {
    section: NavigationSection;
    targetId?: string;
  }): boolean {
    const target = findPanelTarget(targetId);
    if (!panel || !target) return false;
    const top =
      panel.scrollTop +
      target.getBoundingClientRect().top -
      panel.getBoundingClientRect().top -
      28;
    panel.scrollTo({ top });
    // A section near the end can be visible even when it cannot reach the top.
    navigationScrollTop = panel.scrollTop;
    activeSection = section;
    target.focus({ preventScroll: true });
    return target.ownerDocument.activeElement === target;
  }

  function trackPanel(node: HTMLFieldSetElement): () => void {
    panel = node;
    const sections = navigation.map(({ id: section }) => ({
      section,
      target: findPanelTarget(`${id}-${section}`),
    }));
    let frame = 0;
    function updateActiveSection(): void {
      frame = 0;
      if (navigationScrollTop === node.scrollTop) return;
      navigationScrollTop = undefined;
      const top = node.getBoundingClientRect().top + 32;
      let current: NavigationSection = "details";
      for (const { section, target } of sections) {
        if (!target || target.getBoundingClientRect().top > top) break;
        current = section;
      }
      if (
        node.scrollTop > 0 &&
        node.scrollHeight - node.clientHeight - node.scrollTop <= 1
      ) {
        current = "languages";
      }
      activeSection = current;
    }
    function scheduleUpdate(): void {
      if (!frame) frame = requestAnimationFrame(updateActiveSection);
    }
    node.addEventListener("scroll", scheduleUpdate, { passive: true });
    return () => {
      node.removeEventListener("scroll", scheduleUpdate);
      if (frame) cancelAnimationFrame(frame);
      panel = undefined;
      navigationScrollTop = undefined;
    };
  }

  function focusInitialTarget(event: Event): void {
    const focused = document.activeElement;
    opener = focused instanceof HTMLButtonElement ? focused : undefined;
    let didFocus: boolean;
    if (section === "name") {
      didFocus = revealSection({ section: "details", targetId: nameId });
    } else if (section === "description") {
      // Tiptap is lazy; its group is a focusable landing point before it mounts.
      didFocus = revealSection({
        section: "details",
        targetId: findPanelTarget(bodyId) ? bodyId : descriptionId,
      });
    } else {
      didFocus = revealSection({ section });
    }
    if (didFocus) event.preventDefault();
  }

  function restoreOpenerFocus(event: Event): void {
    if (opener?.isConnected && !opener.disabled) {
      event.preventDefault();
      opener.focus({ preventScroll: true });
    }
    opener = undefined;
  }

  function trackSaveError(node: HTMLParagraphElement): () => void {
    saveError = node;
    return () => {
      saveError = undefined;
    };
  }

  async function submit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (busy || checkingHeaderBackground) return;
    error = undefined;
    if (bodyStatus.failure !== undefined) {
      await tick();
      revealSection({
        section: "details",
        targetId: findPanelTarget(bodyId) ? bodyId : descriptionId,
      });
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
      await tick();
      const targetId = `${bodyId}-${invalidLocalization.draft.languageCode}`;
      revealSection({
        section: "languages",
        targetId: findPanelTarget(targetId) ? targetId : `${id}-languages`,
      });
      return;
    }
    const email =
      emailUpdates === "ask" || showContactEmail ? contactEmail.trim() : "";
    if (email === "" && contactEmailRequired) {
      error = m.project_create_contact_details_invalid();
      revealSection({ section: "access", targetId: contactEmailId });
      return;
    }
    const ownerOrganizationSlugs = owners.map(({ slug }) => slug);
    if (
      ownerOrganizationSlugs.some(
        (slug) =>
          !ownerOrganizationChoices.some(
            ({ organizationSlug }) => organizationSlug === slug,
          ),
      )
    ) {
      error = m.project_create_organization_error();
      revealSection({ section: "organizations" });
      return;
    }
    const contact = email === "" ? undefined : { ...project.contact, email };
    const parsed = createProjectInputSchema.safeParse({
      projectSlug: project.projectSlug,
      projectTitle,
      body,
      authentication,
      emailUpdates,
      contact,
      ownerOrganizationSlugs,
      languageSettings: { dynamicTranslationEnabled, targetLanguageCodes },
      contentLocalizations: activeLocalizations
        .filter(({ translationRequired }) => translationRequired)
        .map(({ draft }) => draft),
      attributions: attributions.map(getProjectAttributionInput),
    });
    if (!parsed.success) {
      const paths = parsed.error.issues.map((issue) => issue.path[0]);
      if (paths.includes("projectTitle")) {
        error = m.project_create_invalid();
        revealSection({ section: "details", targetId: nameId });
      } else if (paths.includes("attributions")) {
        error = m.project_create_credits_invalid();
        revealSection({ section: "organizations" });
      } else if (paths.includes("contentLocalizations")) {
        error = m.project_create_localization_invalid();
        revealSection({ section: "languages" });
      } else if (paths.includes("contact")) {
        error = m.project_create_contact_details_invalid();
        revealSection({ section: "access", targetId: contactEmailId });
      } else {
        error = m.project_workspace_settings_error();
      }
      return;
    }
    const creditSlugs = parsed.data.attributions.flatMap((entry) =>
      entry.source === "organization" ? [entry.organizationSlug] : [],
    );
    if (
      creditSlugs.some(
        (slug) =>
          !ownerOrganizationSlugs.includes(slug) &&
          !savedOrganizationSlugs.has(slug) &&
          !publicOrganizations.some(
            ({ organizationSlug }) => organizationSlug === slug,
          ),
      )
    ) {
      error = m.project_create_credits_invalid();
      revealSection({ section: "organizations" });
      return;
    }
    const hiddenChanges =
      JSON.stringify(settingsNotShownOnProject(parsed.data)) !==
      JSON.stringify(settingsNotShownOnProject(project));
    const visibleChanges =
      parsed.data.projectTitle !== project.projectTitle ||
      parsed.data.body !== project.body ||
      parsed.data.authentication !== project.authentication ||
      JSON.stringify(parsed.data.contact) !== JSON.stringify(project.contact) ||
      JSON.stringify(parsed.data.ownerOrganizationSlugs) !==
        JSON.stringify(project.ownerOrganizationSlugs) ||
      JSON.stringify(parsed.data.attributions) !==
        JSON.stringify(project.attributions);
    const headerBackgroundChanged = headerBackgroundChange !== undefined;
    if (!hiddenChanges && !visibleChanges && !headerBackgroundChanged) {
      open = false;
      return;
    }
    submitting = true;
    try {
      if (
        await onsave(
          headerBackgroundChange === undefined
            ? parsed.data
            : { ...parsed.data, headerBackgroundChange },
        )
      ) {
        open = false;
        if (hiddenChanges || headerBackgroundChanged) {
          showSuccessToast({
            id: "project-settings-saved",
            message: m.project_workspace_settings_saved(),
          });
        }
      } else error = m.project_workspace_settings_error();
    } catch {
      error = m.project_workspace_settings_error();
    } finally {
      submitting = false;
    }
    if (error && headerBackgroundChanged) {
      await tick();
      saveError?.focus();
    }
  }
</script>

<Dialog
  title={m.project_detail_settings()}
  description={m.project_workspace_settings_description()}
  variant="settings"
  closeLabel={m.project_workspace_settings_closed()}
  dir={direction}
  contentProps={{
    onOpenAutoFocus: focusInitialTarget,
    onCloseAutoFocus: restoreOpenerFocus,
    escapeKeydownBehavior: busy ? "ignore" : "close",
    interactOutsideBehavior: busy ? "ignore" : "close",
  }}
  bind:open={
    () => open,
    (value: boolean) => {
      if (!busy) open = value;
    }
  }
>
  {#snippet closeIcon()}<img src={closeIconAsset} alt="" />{/snippet}
  <form
    id={formId}
    class="
      flex h-full min-w-0 gap-4 [--avatar-detail-display:none]
      [--avatar-gap:0.75rem] [--avatar-name-size:1rem] [--field-font-size:1rem]
      [--field-padding:17px] [--field-radius:0.75rem]
      max-sm:flex-col
    "
    onsubmit={submit}
    aria-busy={busy}
  >
    <ProjectSectionNavigation
      {id}
      label={m.project_detail_settings()}
      sections={navigation}
      active={activeSection}
      onSelect={(section: NavigationSection) => {
        revealSection({ section });
      }}
    />
    <fieldset
      class="
        flex min-h-0 min-w-0 flex-1 flex-col gap-7 overflow-y-auto
        overscroll-contain rounded-2xl border border-sky-lighter bg-sky-white
        p-7
        max-sm:w-full max-sm:px-4 max-sm:py-5
      "
      disabled={busy}
      {@attach trackPanel}
    >
      <section
        class="
          flex shrink-0 flex-col gap-6
          not-first:border-t not-first:border-sky-lighter not-first:pt-7
          focus-visible:outline-2 focus-visible:-outline-offset-2
          focus-visible:outline-primary-base
        "
        id={`${id}-details`}
        aria-labelledby={`${id}-details-heading`}
        tabindex="-1"
      >
        <h2
          class="m-0 text-lg/6 font-semibold text-ink-darker"
          id={`${id}-details-heading`}
        >
          {m.project_create_details()}
        </h2>
        <Field
          label={m.project_create_name()}
          bind:value={projectTitle}
          placeholder={m.project_create_name_placeholder()}
          inputProps={{
            id: nameId,
            required: true,
            maxlength:
              createProjectInputSchema.shape.projectTitle.maxLength ??
              undefined,
          }}
        />
        <div
          id={descriptionId}
          tabindex="-1"
          class="
            focus-visible:outline-2 focus-visible:-outline-offset-2
            focus-visible:outline-primary-base
          "
          role="group"
          aria-label={m.project_create_body()}
        >
          <RichTextEditor
            id={bodyId}
            label={m.project_create_body()}
            value={body}
            onValueChange={(value: string) => {
              body = value;
            }}
            placeholder={m.project_create_body_placeholder()}
            disabled={busy}
            {...getProjectBodyEditorFeedback({ status: bodyStatus })}
          />
        </div>
        <ProjectHeaderBackgroundField
          savedImageSrc={project.headerBackgroundImageSrc}
          change={headerBackgroundChange}
          disabled={busy}
          onChange={(
            change: UpdateProjectSettingsInput["headerBackgroundChange"],
          ) => {
            headerBackgroundChange = change;
            error = undefined;
          }}
          onPendingChange={(checking: boolean) => {
            checkingHeaderBackground = checking;
          }}
        />
      </section>
      <section
        class="
          flex shrink-0 flex-col gap-6
          not-first:border-t not-first:border-sky-lighter not-first:pt-7
          focus-visible:outline-2 focus-visible:-outline-offset-2
          focus-visible:outline-primary-base
        "
        id={`${id}-organizations`}
        aria-labelledby={`${id}-organizations-heading`}
        tabindex="-1"
      >
        <h2
          class="m-0 text-lg/6 font-semibold text-ink-darker"
          id={`${id}-organizations-heading`}
        >
          {m.project_create_organizations()}
        </h2>
        <div class="grid min-w-0 gap-3">
          <div class="grid min-w-0 gap-1">
            <h3 class="m-0 text-[15px] font-semibold text-ink-darker">
              {m.project_create_owner_heading()}
            </h3>
            <p class="m-0 text-ink-light">
              {m.project_create_owners_description()}
            </p>
          </div>
          {#if optionsStatus === "loading"}
            <p
              class="m-0 flex flex-wrap items-start gap-2 text-ink-light"
              role="status"
            >
              <Spinner />
              {m.project_create_options_loading()}
            </p>
          {:else if optionsStatus === "error"}
            <p class="m-0 text-ink-light" role="alert">
              {m.project_create_options_error()}
            </p>
            <Button
              variant="neutral"
              size="control"
              class="justify-self-start"
              onclick={retryOrganizations}>{m.project_create_retry()}</Button
            >
          {/if}
          {#each owners as owner, index (owner.id)}
            <div
              class="
                flex items-end gap-2
                *:first:min-w-0 *:first:flex-1
              "
            >
              <ProjectOrganizationPicker
                organizations={ownerOrganizationChoices}
                {direction}
                label={m.project_create_organization_label({
                  number: index + 1,
                })}
                bind:value={
                  () => owner.slug || undefined,
                  (value: string | undefined) => {
                    owner.slug = value ?? "";
                  }
                }
                disabled={busy || optionsStatus !== "ready"}
                name="ownerOrganizationSlugs"
                required
                disabledSlugs={owners
                  .filter((entry) => entry.id !== owner.id)
                  .map((entry) => entry.slug)}
              />
              {#if owners.length > 1}
                <Button
                  variant="neutral"
                  size="icon"
                  disabled={busy || optionsStatus !== "ready"}
                  aria-label={m.project_create_remove_organization({
                    number: index + 1,
                  })}
                  onclick={() =>
                    (owners = owners.filter((entry) => entry.id !== owner.id))}
                  ><Icon name="close" /></Button
                >
              {/if}
            </div>
          {/each}
          {#if optionsStatus === "ready" && owners.length < ownerOrganizationChoices.length}
            <Button
              variant="quiet"
              size="control"
              class="justify-self-start"
              disabled={busy}
              onclick={() =>
                (owners = [...owners, { id: nextOwnerId++, slug: "" }])}
              ><Icon
                name="plus"
                size={16}
              />{m.project_create_add_organization()}</Button
            >
          {/if}
        </div>
        <div class="grid min-w-0 gap-3">
          <div class="grid min-w-0 gap-1">
            <h3 class="m-0 text-[15px] font-semibold text-ink-darker">
              {m.project_create_credits()}
            </h3>
            <p class="m-0 text-ink-light">
              {m.project_create_credits_description()}
            </p>
          </div>
          <ProjectAttributionsEditor
            bind:drafts={attributions}
            organizations={creditOrganizationChoices}
            {direction}
            disabled={busy}
          />
        </div>
      </section>
      <section
        class="
          flex shrink-0 flex-col gap-6
          not-first:border-t not-first:border-sky-lighter not-first:pt-7
          focus-visible:outline-2 focus-visible:-outline-offset-2
          focus-visible:outline-primary-base
        "
        id={`${id}-access`}
        aria-labelledby={`${id}-access-heading`}
        tabindex="-1"
      >
        <h2
          class="m-0 text-lg/6 font-semibold text-ink-darker"
          id={`${id}-access-heading`}
        >
          {m.project_workspace_settings_access()}
        </h2>
        <ProjectAccessFields
          {id}
          layout="settings"
          {direction}
          disabled={busy}
          bind:authentication
          bind:emailUpdates
          bind:contactEmail
          {showContactEmail}
          {contactEmailRequired}
        />
      </section>
      <section
        class="
          flex shrink-0 flex-col gap-6
          not-first:border-t not-first:border-sky-lighter not-first:pt-7
          focus-visible:outline-2 focus-visible:-outline-offset-2
          focus-visible:outline-primary-base
        "
        id={`${id}-languages`}
        aria-labelledby={`${id}-languages-heading`}
        tabindex="-1"
      >
        <ProjectLanguageFields
          {id}
          {direction}
          disabled={busy}
          hasOriginalBody={bodyStatus.html !== ""}
          {showRequiredBodyErrors}
          bind:targetLanguageCodes
          bind:dynamicTranslationEnabled
          bind:localizationDrafts
        />
      </section>
    </fieldset>
  </form>
  {#snippet footer()}
    <div class="flex min-w-0 flex-1 flex-col gap-2">
      {#if error}
        <p
          class="m-0 text-red-darkest"
          role="alert"
          tabindex="-1"
          {@attach trackSaveError}
        >
          {error}
        </p>
      {/if}
      <div class="flex flex-wrap justify-end gap-3">
        <Button
          variant="neutral"
          size="control"
          disabled={busy}
          onclick={() => (open = false)}
        >
          {m.project_create_cancel()}
        </Button>
        <Button
          type="submit"
          form={formId}
          variant="solid"
          size="control"
          disabled={busy || checkingHeaderBackground}
        >
          {#if busy}<Spinner />{/if}
          {busy
            ? m.project_workspace_settings_saving()
            : m.project_workspace_settings_save()}
        </Button>
      </div>
    </div>
  {/snippet}
</Dialog>
