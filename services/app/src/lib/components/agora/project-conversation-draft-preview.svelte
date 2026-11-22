<script lang="ts">
  import * as m from "#lib/paraglide/messages.js";
  import { getTextDirection } from "#lib/paraglide/runtime.js";
  import { gatheringAnswerLimits } from "$logic/agora/gathering-format.js";
  import ConversationMethodPanel from "$ui/agora/conversation-method-panel.svelte";
  import ConversationSummaryPanel from "$ui/agora/conversation-summary-panel.svelte";
  import Button from "$ui/shared/button.svelte";
  import Metrics from "$ui/shared/metrics.svelte";
  import Panel from "$ui/shared/panel.svelte";
  import SearchField from "$ui/shared/search-field.svelte";

  import type {
    AuthoringContent,
    ResponseFormat,
  } from "./conversation-authoring.js";
  import ConversationMethodGuide from "./conversation-method-guide.svelte";
  import type {
    ConversationSettings,
    ConversationSettingsTarget,
    SettingsField,
    WorkspaceTab,
  } from "./conversation-settings.js";
  import GatheringResponseFormatEditor from "./gathering-response-format-editor.svelte";
  import type {
    ActivityReview,
    ModerationOpinion,
  } from "./opinion-moderation.js";
  import OpinionModerationFeed from "./opinion-moderation-feed.svelte";
  import { createSampleModerationOpinions } from "./sample-moderation-opinions.js";
  import SeedContentPanel from "./seed-content-panel.svelte";

  let {
    settings,
    onapply,
    onedit,
    section,
    review,
    pending,
    status,
    content,
    onchange,
    onnextactivity,
  }: {
    settings: ConversationSettings;
    onapply: (value: ConversationSettings) => Promise<boolean>;
    onedit: (target: ConversationSettingsTarget) => void;
    section: WorkspaceTab;
    review: ActivityReview;
    pending: boolean;
    status: "draft" | "open" | "closed";
    content: AuthoringContent;
    onchange: (content: AuthoringContent) => Promise<boolean>;
    onnextactivity: () => Promise<boolean>;
  } = $props();
  const created = $derived(status !== "draft");
  const configLocked = $derived(created || pending);
  let failed = $state(false);
  async function saveSettings(value: ConversationSettings) {
    failed = false;
    failed = !(await onapply(value));
  }
  const kind = $derived(settings.participation.kind);
  function edit({ field, event }: { field: SettingsField; event: MouseEvent }) {
    onedit({
      field,
      opener:
        event.currentTarget instanceof HTMLElement
          ? event.currentTarget
          : undefined,
    });
  }
  type Display = "feed" | "deck";
  let savingDisplay = $state<Display>();
  async function selectDisplay(display: Display) {
    if (pending || settings.participation.kind !== "polis") return;
    // Native radios change before persistence finishes. Drive the temporary
    // selection explicitly so a rejected write also restores the checked input.
    savingDisplay = display;
    try {
      await saveSettings({
        ...settings,
        participation: { ...settings.participation, display },
      });
    } finally {
      savingDisplay = undefined;
    }
  }
  type Method = "pairwise" | "bws" | "qv";
  const amending = $derived(
    settings.participation.kind === "gathering" &&
      settings.participation.gatheringMode === "amend",
  );
  const gatheringItems = $derived([
    {
      value: "new",
      label: m.authoring_gather_new(),
      description: m.authoring_new_format_help(),
      icon: "message",
      disabled: configLocked,
    },
    {
      value: "amend",
      label: m.gather_amend(),
      description: m.gather_amend_help(),
      icon: "gathering",
      disabled: configLocked,
    },
  ] as const);
  const fields = $derived(content.format);
  async function setFormat(format: ResponseFormat) {
    if (configLocked) return;
    const kept = new Set(format.map((f) => f.fieldId));
    failed = !(await onchange({
      ...content,
      format,
      responses: content.responses.map((r) => ({
        ...r,
        answers: r.answers.filter((a) => kept.has(a.fieldId)),
      })),
    }));
  }
  const authored = $derived(
    content.statements.map(
      (row): ModerationOpinion => ({
        opinionSlugId: row.id,
        isSeed: true,
        text: row.title,
        move: review.authored.get(row.id),
      }),
    ),
  );
  let responseQuery = $state("");
  const formattedResponses = $derived(
    content.responses
      .map((row) => {
        const answers = new Map(row.answers.map((a) => [a.fieldId, a.value]));
        return {
          id: row.id,
          fields: content.format.flatMap((field) => {
            const answer = answers.get(field.fieldId);
            return answer
              ? [{ fieldId: field.fieldId, label: field.label, answer }]
              : [];
          }),
        };
      })
      .filter((row) => row.fields.length > 0),
  );
  const responseNeedle = $derived(responseQuery.trim().toLocaleLowerCase());
  const responseCards = $derived(
    responseNeedle
      ? formattedResponses.filter((row) =>
          row.fields.some((field) =>
            field.answer.toLocaleLowerCase().includes(responseNeedle),
          ),
        )
      : formattedResponses,
  );
  let nextStep = $state(true),
    starting = $state(false),
    nextFailed = $state(false);
  async function startNext() {
    if (starting) return;
    starting = true;
    nextFailed = false;
    try {
      nextFailed = !(await onnextactivity());
    } catch {
      nextFailed = true;
    } finally {
      starting = false;
    }
  }
  const exampleOpinions = $derived(
    createSampleModerationOpinions(review.example.get),
  );
  const dir = $derived(getTextDirection());
  const displayItems = $derived([
    {
      value: "feed",
      label: m.draft_preview_feed(),
      description: m.draft_preview_feed_help(),
      icon: "list",
    },
    {
      value: "deck",
      label: m.draft_preview_deck(),
      description: m.draft_preview_deck_help(),
      icon: "panel",
    },
  ] as const);
  const methodItems = $derived([
    {
      value: "pairwise",
      label: m.draft_preview_pairwise(),
      description: m.draft_preview_pairwise_help(),
      icon: "list",
    },
    {
      value: "bws",
      label: m.draft_preview_bws(),
      description: m.draft_preview_bws_help(),
      icon: "check",
    },
    {
      value: "qv",
      label: m.draft_preview_qv(),
      description: m.authoring_qv_help(),
      icon: "prioritizing",
    },
  ] as const);
</script>

{#if section === "setup"}
  {#if failed}<p role="alert">{m.authoring_action_failed()}</p>{/if}
  <ConversationSummaryPanel
    {kind}
    {status}
    title={settings.title}
    description={settings.description}
    oneditname={(event: MouseEvent) => {
      edit({ field: "name", event });
    }}
    oneditdescription={(event: MouseEvent) => {
      edit({ field: "description", event });
    }}
  />
  {#if settings.participation.kind === "polis"}
    <ConversationMethodPanel
      title={m.draft_preview_display()}
      items={displayItems.map((item) => ({ ...item, disabled: pending }))}
      selected={savingDisplay ?? settings.participation.display}
      onselect={selectDisplay}
      >{#snippet actions()}<ConversationMethodGuide
          {kind}
          {dir}
        />{/snippet}</ConversationMethodPanel
    >
  {:else if settings.participation.kind === "prioritizing"}
    <ConversationMethodPanel
      title={m.draft_preview_method()}
      description={m.project_detail_prioritization_description()}
      items={methodItems.map((item) => ({ ...item, disabled: configLocked }))}
      selected={settings.participation.method}
      onselect={(method: Method) => {
        if (!configLocked && settings.participation.kind === "prioritizing")
          void saveSettings({
            ...settings,
            participation: { ...settings.participation, method },
          });
      }}
      >{#snippet actions()}<ConversationMethodGuide
          {kind}
          {dir}
        />{/snippet}</ConversationMethodPanel
    >
  {:else}
    <ConversationMethodPanel
      title={m.authoring_gather_format()}
      description={m.gather_choose_formats()}
      items={gatheringItems}
      selected={settings.participation.gatheringMode}
      onselect={(gatheringMode: "new" | "amend") => {
        if (!configLocked && settings.participation.kind === "gathering")
          void saveSettings({
            ...settings,
            participation: { ...settings.participation, gatheringMode },
          });
      }}
    >
      {#snippet actions()}<ConversationMethodGuide {kind} {dir} />{/snippet}
    </ConversationMethodPanel>
    {#if amending}
      <Panel title={`${m.gather_amend_responses()} (0)`} appearance="activity"
        ><p>{m.gather_amend_empty()}</p></Panel
      >
    {:else}
      <Panel
        title={m.draft_preview_format()}
        description={m.gathering_format_help()}
        appearance="activity"
      >
        {#if fields.length}
          <ol class="mb-4 grid list-none gap-2 wrap-anywhere">
            {#each fields as field, i (field.fieldId)}
              <li class="rounded-lg bg-sky-lightest px-4 py-3">
                <small class="block text-ink-light"
                  >{m.gathering_format_field({ number: i + 1 })}</small
                ><strong>{field.label}</strong> · {field.characterLimit ===
                gatheringAnswerLimits.short
                  ? m.gathering_format_short()
                  : field.characterLimit === gatheringAnswerLimits.long
                    ? m.gathering_format_long()
                    : m.gathering_format_custom()} · {m.gathering_format_limit()}:
                {field.characterLimit}{#if field.required}
                  · {m.gathering_format_required()}{/if}
              </li>
            {/each}
          </ol>
        {/if}
        <GatheringResponseFormatEditor
          {fields}
          {dir}
          disabled={configLocked}
          onsave={setFormat}
        />
      </Panel>
    {/if}
  {/if}
  {#if !amending}<SeedContentPanel
      {content}
      participation={settings.participation}
      {pending}
      {status}
      {dir}
      {onchange}
      onparticipation={(
        participation: ConversationSettings["participation"],
      ) => {
        return onapply({ ...settings, participation });
      }}
    />{/if}
{:else if section === "moderation"}
  {#if kind === "gathering"}
    <Panel
      title={m.opinion_feed_title()}
      description={m.authoring_gather_review()}
      appearance="activity"
    >
      {#if amending}<p>
          {m.gather_amend_empty()}
        </p>{:else if content.responses.length}
        <SearchField
          label={m.authoring_search_responses()}
          bind:value={responseQuery}
        />
        <div class="mt-4 grid gap-3 border-t border-sky-lighter pt-4">
          {#each responseCards as row (row.id)}
            <article
              class="rounded-xl border border-sky-lighter bg-sky-white p-4"
            >
              <dl class="grid gap-3">
                {#each row.fields as field (field.fieldId)}
                  <div>
                    <dt class="text-sm text-ink-light">{field.label}</dt>
                    <dd class="wrap-anywhere whitespace-pre-wrap">
                      {field.answer}
                    </dd>
                  </div>
                {/each}
              </dl>
            </article>
          {:else}<p role="status">
              {m.authoring_no_matching_responses()}
            </p>{/each}
        </div>
      {:else}<p>{m.authoring_no_content()}</p>{/if}
    </Panel>
  {:else}
    <OpinionModerationFeed
      {dir}
      heading={m.authoring_moderation_example()}
      description={m.moderation_sample_explanation()}
      opinions={exampleOpinions}
      onmove={review.example.move}
    />
    {#if authored.length}
      <OpinionModerationFeed
        {dir}
        heading={m.moderation_activity_seeds()}
        opinions={authored}
        description={m.moderation_local_history()}
        onmove={pending ? undefined : review.authored.move}
      />
    {/if}
  {/if}
{:else}
  <Panel title={m.authoring_responses()} appearance="activity">
    <Metrics
      items={[
        {
          label:
            kind === "gathering"
              ? m.authoring_seed_responses()
              : m.authoring_seed_opinions(),
          value: String(
            kind === "gathering"
              ? content.responses.length
              : content.statements.length,
          ),
        },
        { label: m.authoring_responses(), value: "—" },
        { label: m.authoring_participants(), value: "—" },
      ]}
    />
    {#if created && kind === "polis" && nextStep}
      <div
        class="
          mt-4 flex items-center justify-between rounded-lg bg-sky-lightest
          p-1.5
        "
      >
        <Button
          size="control"
          variant="quiet"
          disabled={starting}
          onclick={startNext}>{m.authoring_next_activity()}</Button
        ><Button
          size="icon"
          variant="quiet"
          aria-label={m.workspace_dialog_close()}
          onclick={() => (nextStep = false)}>×</Button
        >
      </div>
      {#if nextFailed}<p role="alert">
          {m.project_workspace_activity_create_error()}
        </p>{/if}
    {/if}
  </Panel>
  <Panel title={m.draft_preview_analysis()} appearance="activity"
    ><p
      class="
        min-h-32 border-t border-sky-lighter pt-4 text-ink-light
        md:min-h-80
      "
    >
      {created
        ? m.authoring_no_results()
        : m.draft_preview_analysis_unavailable()}
    </p></Panel
  >
{/if}
