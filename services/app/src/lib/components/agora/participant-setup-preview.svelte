<script lang="ts">
  import * as m from "#lib/paraglide/messages.js";
  import { gatheringAnswerLimits } from "$logic/agora/gathering-format.js";
  import BwsChoice from "$ui/agora/bws-choice.svelte";
  import Field from "$ui/shared/field.svelte";
  import SelectionCard from "$ui/shared/selection-card.svelte";

  import type { AuthoringContent } from "./conversation-authoring.js";
  import type { ParticipationSettings } from "./conversation-settings.js";
  import MappingParticipantPreview from "./mapping-participant-preview.svelte";
  import QvPreviewAllocation from "./qv-preview-allocation.svelte";
  let {
    participation,
    exampleAnswers,
    content,
  }: {
    participation: ParticipationSettings;
    exampleAnswers?: Record<string, string>;
    content: AuthoringContent;
  } = $props();
  const id = $props.id();
  let best = $state<string>(),
    worst = $state<string>(),
    choice = $state<string>();
  let answers = $derived({ ...exampleAnswers });
  const items = $derived(
    content.statements.map((s) => ({
      value: s.id,
      text: s.title,
      description: s.description,
    })),
  );
</script>

{#if participation.kind === "gathering" && participation.gatheringMode === "amend"}<p
  >
    {m.gather_amend_empty()}
  </p>
{:else if participation.kind === "gathering"}
  <div class={["grid gap-3", exampleAnswers && "@min-[32rem]:grid-cols-2"]}>
    {#if participation.allowNewResponses}<div class="my-3 grid gap-2.5">
        {#each content.format as f (f.fieldId)}<Field
            label={f.label}
            multiline={f.characterLimit > gatheringAnswerLimits.short}
            inputProps={{ required: f.required }}
            textareaProps={{ required: f.required }}
            bind:value={
              () => answers[f.fieldId] ?? "",
              (value: string) =>
                (answers = {
                  ...answers,
                  [f.fieldId]: Array.from(value)
                    .slice(0, f.characterLimit)
                    .join(""),
                })
            }
            hint={`${Array.from(answers[f.fieldId] ?? "").length.toString()}/${f.characterLimit.toString()}`}
          />{/each}
      </div>{/if}
    {#if exampleAnswers !== undefined || participation.responseVisibility === "everyone"}
      {@const rows = exampleAnswers
        ? [
            {
              id,
              answers: content.format.map((f) => ({
                fieldId: f.fieldId,
                value: answers[f.fieldId] ?? "",
              })),
            },
          ]
        : content.responses}
      {#each rows as row (row.id)}
        <div class="mt-3 rounded-xl border border-sky-lighter bg-sky-white p-4">
          {#if exampleAnswers}<h4 class="mb-2 font-semibold">
              {m.authoring_response_preview()}
            </h4>{/if}
          <dl class="grid gap-2">
            {#each content.format as field (field.fieldId)}
              {@const answer = row.answers.find(
                (a) => a.fieldId === field.fieldId,
              )?.value}
              {#if answer}<div>
                  <dt class="text-xs text-ink-light">{field.label}</dt>
                  <dd class="wrap-anywhere whitespace-pre-wrap">{answer}</dd>
                </div>{/if}
            {/each}
          </dl>
        </div>
      {/each}
    {/if}
  </div>
{:else if !items.length}<p>{m.authoring_no_content()}</p>
{:else if participation.kind === "polis"}
  <MappingParticipantPreview
    display={participation.display}
    statements={content.statements}
  />
{:else if (participation.method === "pairwise" || participation.method === "bws") && items.length < 2}
  <p>{items[0]?.text}</p>
  <p>{m.authoring_preview_comparison_min()}</p>
{:else if participation.method === "pairwise"}
  <fieldset class="my-3 grid gap-2.5">
    <legend class="font-semibold">{m.authoring_prefer()}</legend
    >{#each items.slice(0, 2) as item (item.value)}<SelectionCard
        mode="radio"
        name={id}
        value={item.value}
        checked={choice === item.value}
        onselect={(value: string) => (choice = value)}
        >{#snippet heading()}{item.text}{/snippet}</SelectionCard
      >{/each}
  </fieldset>
{:else if participation.method === "bws"}
  <BwsChoice
    items={items.slice(0, 4)}
    {best}
    {worst}
    onbestchange={(v: string) => {
      best = v;
      if (worst === v) worst = undefined;
    }}
    onworstchange={(v: string) => {
      worst = v;
      if (best === v) best = undefined;
    }}
  />
{:else if participation.method === "qv"}<QvPreviewAllocation
    {items}
    allowOpposition={participation.allowOpposition}
  />{:else}<p>{m.draft_preview_method()}</p>{/if}
