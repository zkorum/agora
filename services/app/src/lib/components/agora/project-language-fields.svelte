<script lang="ts">
  import dropdownIcon from "#lib/assets/agora/project-creation/dropdown.svg";
  import languagesIcon from "#lib/assets/agora/project-creation/languages.svg";
  import * as m from "#lib/paraglide/messages.js";
  import {
    type CreateProjectInput,
    projectContentLocalizationSchema,
    type ProjectLanguageCode,
    projectLanguageSchema,
    projectTargetLanguageLimit,
  } from "$logic/agora/project-creation.js";
  import Combobox from "$ui/shared/combobox.svelte";
  import Field from "$ui/shared/field.svelte";
  import RichTextEditor from "$ui/shared/rich-text-editor.svelte";
  import SettingRow from "$ui/shared/setting-row.svelte";

  import {
    getActiveProjectLocalizationDrafts,
    getProjectBodyEditorFeedback,
    projectLanguageLabels,
    projectLanguageSearchText,
  } from "./project-presentation.js";

  let {
    id,
    direction,
    disabled,
    hasOriginalBody,
    showRequiredBodyErrors,
    targetLanguageCodes = $bindable(),
    dynamicTranslationEnabled = $bindable(),
    localizationDrafts = $bindable(),
  }: {
    id: string;
    direction: "ltr" | "rtl";
    disabled: boolean;
    hasOriginalBody: boolean;
    showRequiredBodyErrors: boolean;
    targetLanguageCodes: ProjectLanguageCode[];
    dynamicTranslationEnabled: boolean;
    localizationDrafts: CreateProjectInput["contentLocalizations"];
  } = $props();

  const languageLabels = $derived(projectLanguageLabels());
  const languageItems = $derived(
    projectLanguageSchema.options.map((value) => ({
      value,
      label: languageLabels[value],
      searchText: projectLanguageSearchText[value],
      disabled:
        targetLanguageCodes.length >= projectTargetLanguageLimit &&
        !targetLanguageCodes.includes(value),
    })),
  );
  const activeLocalizations = $derived(
    getActiveProjectLocalizationDrafts({
      drafts: localizationDrafts,
      targetLanguageCodes,
      dynamicTranslationEnabled,
      hasOriginalBody,
    }),
  );
</script>

{#snippet indicator()}<img src={dropdownIcon} alt="" />{/snippet}

<div class="flex flex-col gap-6">
  <div class="flex flex-col gap-1">
    <h2
      class="m-0 text-lg/6 font-semibold text-ink-darker"
      id={`${id}-languages-heading`}
    >
      {m.project_create_languages()}
    </h2>
    <p class="m-0 text-base leading-[1.4] text-ink-light">
      {m.project_create_languages_description()}
    </p>
  </div>
  <p class="m-0 text-sm leading-[1.4] text-ink-light">
    <strong class="me-2 text-ink-dark">{m.project_create_auto()}</strong>
    {m.project_create_auto_description()}
  </p>
  <Combobox
    type="multiple"
    variant="field"
    dir={direction}
    items={languageItems}
    label={m.project_create_additional_languages()}
    hint={m.project_create_additional_languages_hint({
      limit: projectTargetLanguageLimit,
    })}
    placeholder={m.project_create_additional_languages()}
    bind:value={targetLanguageCodes}
    rootProps={{ name: "targetLanguageCodes" }}
    clearable
    {disabled}
    {indicator}
  >
    {#snippet leading()}<img src={languagesIcon} alt="" />{/snippet}
  </Combobox>
  <SettingRow
    title={m.project_create_dynamic_translation()}
    description={m.project_create_dynamic_translation_description()}
    icon="globe"
    bind:checked={dynamicTranslationEnabled}
    {disabled}
  />
  {#if activeLocalizations.length > 0}
    <p class="m-0 text-sm leading-[1.4] text-ink-light">
      {dynamicTranslationEnabled
        ? m.project_create_manual_translations_optional()
        : m.project_create_manual_translations_required()}
    </p>
    {#each activeLocalizations as { draft, status, translationRequired, bodyMissing } (draft.languageCode)}
      <div class="flex flex-col gap-3 rounded-xl border border-sky-lighter p-4">
        <h3 class="m-0 text-[15px] font-semibold text-ink-dark">
          {languageLabels[draft.languageCode]}
        </h3>
        <Field
          label={m.project_create_localized_name({
            language: languageLabels[draft.languageCode],
          })}
          bind:value={draft.projectTitle}
          inputProps={{
            required: translationRequired,
            maxlength:
              projectContentLocalizationSchema.shape.projectTitle.maxLength ??
              undefined,
          }}
        />
        <RichTextEditor
          id={`${id}-body-${draft.languageCode}`}
          label={m.project_create_localized_body({
            language: languageLabels[draft.languageCode],
          })}
          value={draft.body}
          onValueChange={(value: string) => {
            draft.body = value;
          }}
          placeholder={m.project_create_body_placeholder()}
          {disabled}
          {...getProjectBodyEditorFeedback({
            status,
            showRequiredError: showRequiredBodyErrors && bodyMissing,
          })}
        />
      </div>
    {/each}
  {/if}
</div>
