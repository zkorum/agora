<script lang="ts">
  import * as m from "#lib/paraglide/messages.js";
  import { gatheringAnswerLimits } from "$logic/agora/gathering-format.js";
  import type { ConversationViewKind } from "$ui/agora/view-types.js";
  import Field from "$ui/shared/field.svelte";
  import HelpComparisonCard from "$ui/shared/help-comparison-card.svelte";
  import HelpDialog from "$ui/shared/help-dialog.svelte";

  import type { AuthoringContent } from "./conversation-authoring.js";
  import type { ParticipationSettings } from "./conversation-settings.js";
  import MappingParticipantPreview from "./mapping-participant-preview.svelte";
  import ParticipantSetupPreview from "./participant-setup-preview.svelte";

  let { kind, dir }: { kind: ConversationViewKind; dir: "ltr" | "rtl" } =
    $props();
  const heading = $derived(
    kind === "prioritizing"
      ? m.authoring_methods_explained()
      : kind === "polis"
        ? m.draft_preview_display()
        : m.authoring_gather_format(),
  );
  const sample = $derived({
    format: [
      {
        fieldId: "title",
        label: m.authoring_title(),
        characterLimit: gatheringAnswerLimits.short,
        required: true,
      },
      {
        fieldId: "description",
        label: m.project_create_body(),
        characterLimit: gatheringAnswerLimits.long,
        required: false,
      },
    ],
    responses: [],
    statements: [
      m.demo_trees(),
      m.demo_buses(),
      m.demo_crossings(),
      m.demo_benches(),
    ].map((title, i) => ({ id: String(i), title, description: "" })),
  } satisfies AuthoringContent);
  const mappingExamples = $derived([
    {
      id: "journeys",
      title: m.mapping_demo_journeys(),
      author: {
        name: "silver_thyme",
        initials: "ST",
        detail: m.mapping_preview_example_author(),
      },
    },
    {
      id: "transit",
      title: m.mapping_demo_transit(),
      author: {
        name: "red_pepper",
        initials: "RP",
        detail: m.mapping_preview_example_author(),
      },
    },
    { id: "schools", title: m.mapping_demo_schools() },
  ]);
  interface Example {
    key: string;
    title: string;
    help: string;
    icon: string;
    participation: ParticipationSettings;
    count: number;
  }
  const examples = $derived.by((): Example[] => {
    if (kind === "gathering")
      return [
        {
          key: "gathering",
          title: m.authoring_gather_new(),
          help: m.authoring_new_format_help(),
          icon: "icon-[lucide--file-input]",
          participation: {
            kind,
            gatheringMode: "new",
            allowNewResponses: true,
            responseVisibility: "everyone",
          },
          count: 0,
        },
      ];
    if (kind === "polis")
      return [
        {
          key: "feed",
          title: m.draft_preview_feed(),
          help: m.draft_preview_feed_help(),
          icon: "icon-[lucide--rows-3]",
          participation: { kind, display: "feed", allowNewOpinions: false },
          count: 3,
        },
        {
          key: "deck",
          title: m.draft_preview_deck(),
          help: m.draft_preview_deck_help(),
          icon: "icon-[lucide--panels-top-left]",
          participation: { kind, display: "deck", allowNewOpinions: false },
          count: 3,
        },
      ];
    const participation = {
      kind,
      allowParticipantStatements: false,
      allowOpposition: false,
    };
    return [
      {
        key: "pairwise",
        title: m.draft_preview_pairwise(),
        help: m.authoring_pair_help(),
        icon: "icon-[lucide--columns-2]",
        participation: { ...participation, method: "pairwise" },
        count: 2,
      },
      {
        key: "bws",
        title: m.draft_preview_bws(),
        help: m.authoring_best_help(),
        icon: "icon-[lucide--square-check]",
        participation: { ...participation, method: "bws" },
        count: 4,
      },
      {
        key: "qv",
        title: m.draft_preview_qv(),
        help: m.authoring_qv_help(),
        icon: "icon-[lucide--coins]",
        participation: { ...participation, method: "qv" },
        count: 3,
      },
    ];
  });
</script>

<HelpDialog
  title={heading}
  description={m.authoring_demo_help()}
  {dir}
  wide
  closeLabel={m.workspace_dialog_close()}
>
  <div
    class={[
      "grid gap-3",
      kind === "prioritizing"
        ? "lg:grid-cols-3"
        : kind === "polis"
          ? "grid-cols-[repeat(auto-fit,minmax(min(100%,25rem),1fr))]"
          : "md:grid-cols-2",
    ]}
  >
    {#each examples as example (example.key)}
      <HelpComparisonCard title={example.title} description={example.help}>
        {#snippet icon()}<span class={[example.icon, "size-5"]}
          ></span>{/snippet}
        {#if example.participation.kind === "polis"}
          <MappingParticipantPreview
            statements={mappingExamples}
            display={example.participation.display}
          />
        {:else}<ParticipantSetupPreview
            participation={example.participation}
            content={{
              ...sample,
              statements: sample.statements.slice(0, example.count),
            }}
            exampleAnswers={example.participation.kind === "gathering"
              ? { title: m.demo_trees(), description: m.demo_school_shade() }
              : undefined}
          />{/if}
      </HelpComparisonCard>
    {/each}
    {#if kind === "gathering"}<HelpComparisonCard
        title={m.gather_amend()}
        description={m.gather_amend_help()}
      >
        {#snippet icon()}<span class="icon-[lucide--square-pen] size-5"
          ></span>{/snippet}
        <div class="grid content-start gap-4">
          <dl class="rounded-lg bg-sky-white p-3">
            <dt class="font-semibold">{m.gather_original()}</dt>
            <dd>{m.demo_trees()}</dd>
          </dl>
          <Field
            label={m.gather_revised()}
            multiline
            value={`${m.demo_trees()} · ${m.demo_school_shade()}`}
          />
        </div>
      </HelpComparisonCard>{/if}
  </div>
</HelpDialog>
