<script lang="ts">
  import * as m from "#lib/paraglide/messages.js";
  import { gatheringAnswerLimits } from "$logic/agora/gathering-format.js";
  import Button from "$ui/shared/button.svelte";
  import Dialog from "$ui/shared/dialog.svelte";
  import Field from "$ui/shared/field.svelte";
  import Icon from "$ui/shared/icon.svelte";
  import Panel from "$ui/shared/panel.svelte";
  import SettingRow from "$ui/shared/setting-row.svelte";

  import { createGatheringAnswerParser } from "../../../../../shared/src/gathering.js";
  import { MAX_SEED_GATHERING_RESPONSES_PER_CREATION } from "../../../../../shared/src/gatheringLimits.js";
  import {
    getSeedOpinionComparisonKey,
    MAX_SEED_OPINIONS_PER_SUBMISSION,
  } from "../../../../../shared/src/seedOpinions.js";
  import {
    countUnicodeCodePoints,
    hasVisiblePlainText,
    MAX_LENGTH_BODY,
    MAX_LENGTH_OPINION,
  } from "../../../../../shared/src/shared.js";
  import type { Answers, AuthoringContent } from "./conversation-authoring.js";
  import type { ParticipationSettings } from "./conversation-settings.js";

  let {
    content,
    participation,
    pending,
    status,
    dir,
    onchange,
    onparticipation,
  }: {
    content: AuthoringContent;
    participation: ParticipationSettings;
    pending: boolean;
    status: "draft" | "open" | "closed";
    dir: "ltr" | "rtl";
    onchange: (next: AuthoringContent) => Promise<boolean>;
    onparticipation: (next: ParticipationSettings) => Promise<boolean>;
  } = $props();
  const gathering = $derived(participation.kind === "gathering");
  const qv = $derived(
    participation.kind === "prioritizing" && participation.method === "qv",
  );
  const titleLimit = MAX_LENGTH_OPINION;
  const count = $derived(
    gathering ? content.responses.length : content.statements.length,
  );
  const max = $derived(
    status !== "draft" && !qv
      ? Infinity
      : gathering
        ? MAX_SEED_GATHERING_RESPONSES_PER_CREATION
        : MAX_SEED_OPINIONS_PER_SUBMISSION,
  );
  const readOnly = $derived(status === "closed" && (gathering || qv));
  const deleteAllowed = $derived(
    !(qv && status !== "draft" && (status === "closed" || count <= 1)),
  );
  let failure = $state<"duplicate" | "save">();
  const errorMessage = $derived(
    failure === "duplicate"
      ? m.activity_duplicate_seed()
      : m.authoring_action_failed(),
  );
  async function commitContent(next: AuthoringContent) {
    failure = undefined;
    const saved = await onchange(next);
    if (!saved) failure = "save";
    return saved;
  }
  function saveStatement(row: AuthoringContent["statements"][number]) {
    const existing = content.statements.find((s) => s.id === row.id);
    // Only a new/changed title can introduce a duplicate. Don't misreport a
    // storage error for a legacy activity that already contains duplicates.
    if (!qv && existing?.title !== row.title) {
      const key = getSeedOpinionComparisonKey(row.title);
      if (
        content.statements.some(
          (s) =>
            s.id !== row.id && getSeedOpinionComparisonKey(s.title) === key,
        )
      ) {
        failure = "duplicate";
        return false;
      }
    }
    return commitContent({
      ...content,
      statements: existing
        ? content.statements.map((s) => (s.id === row.id ? row : s))
        : [...content.statements, row],
    });
  }
  async function commitParticipation(next: ParticipationSettings) {
    failure = undefined;
    if (!(await onparticipation(next))) failure = "save";
  }
  let editing = $state(false);
  let selected = $state<string>();
  let title = $state("");
  let body = $state("");
  let quickTitle = $state("");
  let values = $state<Record<string, string>>({});
  let suggesting = $state(false);
  let suggestionTrigger = $state.raw<HTMLElement | null>(null);
  let pendingSuggestion: string | undefined;
  const id = $props.id();
  let opener: HTMLElement | undefined;
  const examples = $derived([
    m.demo_trees(),
    m.demo_buses(),
    m.demo_crossings(),
    m.demo_benches(),
  ]);
  function restore(event: Event) {
    if (opener?.isConnected) {
      event.preventDefault();
      opener.focus({ preventScroll: true });
    }
  }
  function edit({ key, event }: { key?: string; event: MouseEvent }) {
    opener =
      event.currentTarget instanceof HTMLElement
        ? event.currentTarget
        : undefined;
    failure = undefined;
    selected = key;
    const row = key ? content.statements.find((s) => s.id === key) : undefined;
    title = row?.title ?? "";
    body = row?.description ?? "";
    const answers = content.responses.find((s) => s.id === key)?.answers ?? [];
    values = Object.fromEntries(answers.map((a) => [a.fieldId, a.value]));
    editing = true;
  }
  const parseAnswers = $derived(createGatheringAnswerParser(content.format));
  const answers = $derived.by(() => {
    if (!editing || !gathering || readOnly) return undefined;
    try {
      return parseAnswers(
        content.format.map((f) => ({
          fieldId: f.fieldId,
          value: values[f.fieldId] ?? "",
        })),
      );
    } catch {
      return undefined;
    }
  });
  const valid = $derived(
    gathering
      ? !!answers && answers.some((a) => a.value.trim())
      : hasVisiblePlainText(title) &&
          countUnicodeCodePoints(title.trim()) <= titleLimit &&
          (!qv || countUnicodeCodePoints(body.trim()) <= MAX_LENGTH_BODY),
  );
  function replaceAnswers(next: Answers) {
    const row = { id: selected ?? crypto.randomUUID(), answers: next };
    return commitContent({
      ...content,
      responses: selected
        ? content.responses.map((r) => (r.id === selected ? row : r))
        : [...content.responses, row],
    });
  }
  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (pending || readOnly || !valid || (!selected && count >= max)) return;
    if (gathering) {
      if (!answers) return;
      if (!(await replaceAnswers(answers))) return;
    } else {
      const row = {
        id: selected ?? crypto.randomUUID(),
        title: title.trim(),
        description: body.trim(),
      };
      if (!(await saveStatement(row))) return;
    }
    editing = false;
  }
  async function remove(key: string) {
    if (pending || !deleteAllowed) return;
    await commitContent(
      gathering
        ? {
            ...content,
            responses: content.responses.filter((r) => r.id !== key),
          }
        : {
            ...content,
            statements: content.statements.filter((r) => r.id !== key),
          },
    );
  }
  async function addQuick() {
    const text = quickTitle.trim();
    if (
      pending ||
      readOnly ||
      count >= max ||
      !hasVisiblePlainText(text) ||
      countUnicodeCodePoints(text) > titleLimit
    )
      return;
    if (
      !(await saveStatement({
        id: crypto.randomUUID(),
        title: text,
        description: "",
      }))
    )
      return;
    quickTitle = "";
  }
  function finishSuggestion(open: boolean) {
    if (open || pendingSuggestion === undefined) return;
    const suggestion = pendingSuggestion;
    pendingSuggestion = undefined;
    if (pending || readOnly || count >= max) return;
    selected = undefined;
    title = suggestion;
    body = "";
    opener = suggestionTrigger ?? undefined;
    editing = true;
  }
  const panelTitle = $derived(
    gathering
      ? m.authoring_seed_responses()
      : participation.kind === "polis"
        ? m.authoring_seed_opinions()
        : m.authoring_seed_items(),
  );
  const rows = $derived(
    gathering
      ? content.responses.map((r) => ({
          id: r.id,
          text:
            content.format
              .map((f) => r.answers.find((a) => a.fieldId === f.fieldId)?.value)
              .filter(Boolean)
              .join(" · ") || m.authoring_edit_response(),
        }))
      : content.statements.map((s) => ({ id: s.id, text: s.title })),
  );
  const dialogTitle = $derived(
    gathering
      ? selected
        ? m.authoring_edit_response()
        : m.authoring_add_response()
      : selected
        ? m.authoring_edit_statement()
        : m.authoring_add_statement(),
  );
</script>

<Panel
  title={`${panelTitle} (${String(count)})`}
  description={gathering
    ? m.gathering_format_help()
    : participation.kind === "polis"
      ? m.authoring_seed_help()
      : m.authoring_item_help()}
  appearance="activity"
>
  <div class="grid gap-3">
    {#if failure && !editing}<p role="alert">
        {errorMessage}
      </p>{/if}
    {#if participation.kind === "polis"}
      <SettingRow
        title={m.conversation_settings_allow_opinions()}
        description={m.project_detail_polis_description()}
        icon="message"
        disabled={pending}
        bind:checked={
          () => participation.allowNewOpinions,
          (checked: boolean) => {
            if (!pending)
              void commitParticipation({
                ...participation,
                allowNewOpinions: checked,
              });
          }
        }
      />
    {:else if participation.kind === "gathering"}
      <SettingRow
        title={m.conversation_settings_allow_responses()}
        description={m.project_detail_gathering_description()}
        icon="message"
        disabled={pending}
        bind:checked={
          () => participation.allowNewResponses,
          (checked: boolean) => {
            if (!pending)
              void commitParticipation({
                ...participation,
                allowNewResponses: checked,
              });
          }
        }
      />
    {:else if participation.method === "qv"}
      <SettingRow
        title={m.authoring_opposition()}
        description={m.authoring_qv_help()}
        icon="prioritizing"
        disabled={pending || status !== "draft"}
        bind:checked={
          () => participation.allowOpposition,
          (checked: boolean) => {
            if (!pending && status === "draft")
              void commitParticipation({
                ...participation,
                allowOpposition: checked,
              });
          }
        }
      />
    {:else}
      <SettingRow
        title={m.conversation_settings_allow_opinions()}
        description={m.draft_preview_item_contributions()}
        icon="plus"
        disabled={pending}
        bind:checked={
          () => participation.allowParticipantStatements,
          (checked: boolean) => {
            if (!pending)
              void commitParticipation({
                ...participation,
                allowParticipantStatements: checked,
              });
          }
        }
      />
    {/if}
    {#each rows as row (row.id)}
      <div
        class="
          flex items-center gap-2 rounded-xl border border-sky-lighter
          bg-sky-white px-3 py-2
        "
      >
        <Button
          variant="unstyled"
          disabled={pending}
          class="
            min-w-0 flex-1 cursor-pointer px-1 py-3 text-start wrap-anywhere
          "
          aria-haspopup="dialog"
          onclick={(event: MouseEvent) => {
            edit({ key: row.id, event });
          }}>{row.text}</Button
        >
        {#if deleteAllowed}<Button
            disabled={pending}
            variant="quiet"
            size="icon"
            aria-label={m.selector_remove_selection({ name: row.text })}
            onclick={() => {
              void remove(row.id);
            }}
            ><span class="icon-[lucide--trash-2]" aria-hidden="true"
            ></span></Button
          >{/if}
      </div>
    {/each}
    {#if !readOnly}
      {#if !gathering && !qv}<form
          onsubmit={(event) => {
            event.preventDefault();
            void addQuick();
          }}
        >
          <Field
            label={m.authoring_statement()}
            placeholder={m.authoring_add_statement()}
            bind:value={quickTitle}
            hint={quickTitle
              ? `${countUnicodeCodePoints(quickTitle).toString()}/${titleLimit.toString()}`
              : undefined}
            inputProps={{
              maxlength: titleLimit * 2,
              disabled: pending || count >= max,
              onkeydown: (e: KeyboardEvent) => {
                if (
                  (e.metaKey || e.ctrlKey) &&
                  e.key === "Enter" &&
                  !e.isComposing
                ) {
                  e.preventDefault();
                  void addQuick();
                }
              },
            }}
          />
        </form>{/if}
      <div class="flex flex-wrap items-center gap-2">
        <Button
          variant="neutral"
          size="control"
          disabled={pending ||
            count >= max ||
            (!gathering &&
              !qv &&
              !!quickTitle.trim() &&
              (!hasVisiblePlainText(quickTitle) ||
                countUnicodeCodePoints(quickTitle.trim()) > titleLimit))}
          onclick={(event: MouseEvent) => {
            if (!gathering && !qv && quickTitle.trim()) void addQuick();
            else edit({ event });
          }}
          ><Icon name="plus" />{gathering
            ? m.authoring_add_response()
            : m.authoring_add_statement()}</Button
        >
        {#if !gathering}<Button
            variant="quiet"
            size="control"
            bind:ref={suggestionTrigger}
            disabled={pending || count >= max}
            onclick={() => (suggesting = true)}
            ><Icon name="sparkles" />{m.authoring_examples()}</Button
          >{/if}
      </div>
    {/if}
  </div>
</Panel>
<Dialog
  bind:open={suggesting}
  {dir}
  title={m.authoring_examples()}
  description={m.authoring_suggestions_help()}
  closeLabel={m.workspace_dialog_close()}
  rootProps={{ onOpenChangeComplete: finishSuggestion }}
  contentProps={{
    onCloseAutoFocus: (event: Event) => {
      if (suggestionTrigger?.isConnected) {
        event.preventDefault();
        if (!editing && pendingSuggestion === undefined)
          suggestionTrigger.focus({ preventScroll: true });
      }
    },
  }}
>
  <div class="grid gap-3">
    {#each examples as text (text)}<Button
        variant="neutral"
        size="control"
        onclick={() => {
          pendingSuggestion = text;
          suggesting = false;
        }}>{text}</Button
      >{/each}
  </div>
</Dialog>
<Dialog
  bind:open={
    () => editing,
    (open: boolean) => {
      if (!pending) editing = open;
    }
  }
  {dir}
  title={readOnly ? panelTitle : dialogTitle}
  description={readOnly ? m.authoring_closed_content() : dialogTitle}
  closeLabel={m.workspace_dialog_close()}
  contentProps={{ onCloseAutoFocus: restore }}
>
  <form {id} class="grid gap-3" onsubmit={save}>
    {#if failure}<p role="alert">{errorMessage}</p>{/if}
    {#if gathering}
      {#each content.format as field (field.fieldId)}
        <Field
          label={field.label}
          multiline={field.characterLimit > gatheringAnswerLimits.short}
          readonly={readOnly || pending}
          bind:value={
            () => values[field.fieldId] ?? "",
            (value: string) => (values[field.fieldId] = value)
          }
          hint={`${Array.from(values[field.fieldId] ?? "").length.toString()}/${field.characterLimit.toString()}`}
          inputProps={{ required: field.required }}
          textareaProps={{ required: field.required }}
        />
      {/each}
    {:else}
      <Field
        label={qv ? m.authoring_title() : m.authoring_statement()}
        multiline={!qv}
        readonly={readOnly || pending}
        bind:value={title}
        hint={`${countUnicodeCodePoints(title).toString()}/${titleLimit.toString()}`}
        inputProps={{ required: true, maxlength: titleLimit * 2 }}
        textareaProps={{ required: true, maxlength: titleLimit * 2 }}
      />
      {#if qv}<Field
          label={m.conversation_settings_description()}
          multiline
          readonly={readOnly || pending}
          bind:value={body}
          textareaProps={{ maxlength: MAX_LENGTH_BODY * 2 }}
        />{/if}
    {/if}
  </form>
  {#snippet footer()}
    {#if readOnly}<Button variant="solid" onclick={() => (editing = false)}
        >{m.authoring_done()}</Button
      >
    {:else}<Button
        variant="neutral"
        disabled={pending}
        onclick={() => (editing = false)}>{m.project_create_cancel()}</Button
      ><Button
        variant="solid"
        type="submit"
        form={id}
        disabled={pending || !valid}>{m.authoring_done()}</Button
      >{/if}
  {/snippet}
</Dialog>
