<script lang="ts">
  import * as m from "#lib/paraglide/messages.js";
  import Button from "$ui/shared/button.svelte";
  import Dialog from "$ui/shared/dialog.svelte";
  import ExpandableText from "$ui/shared/expandable-text.svelte";
  import Field from "$ui/shared/field.svelte";
  import Select from "$ui/shared/select.svelte";
  import type { SelectItem } from "$ui/shared/view-types.js";

  import { MAX_LENGTH_BODY } from "../../../../../shared/src/shared.js";
  import type { ModerationReason } from "../../../../../shared/src/types/zod.js";
  import type { ModerationOpinion, OpinionMove } from "./opinion-moderation.js";

  let {
    opinion,
    reasons,
    dir,
    onmove,
    onclose,
    returnFocus,
  }: {
    opinion: ModerationOpinion;
    reasons: readonly SelectItem<ModerationReason>[];
    dir: "ltr" | "rtl";
    onmove: ((change: OpinionMove) => void) | undefined;
    onclose: () => void;
    returnFocus: () => void;
  } = $props();
  let open = $state(true);
  let reason = $state<ModerationReason>();
  let explanation = $state("");

  function move() {
    if (!open || !reason || !onmove) return;
    open = false;
    onmove({
      opinionSlugId: opinion.opinionSlugId,
      reason,
      explanation: explanation.trim(),
    });
  }
</script>

<Dialog
  bind:open
  {dir}
  title={m.moderation_moderate_statement()}
  description={m.moderation_move_effect()}
  closeLabel={m.workspace_dialog_close()}
  rootProps={{
    onOpenChangeComplete: (next: boolean) => {
      if (!next) onclose();
    },
  }}
  contentProps={{
    onCloseAutoFocus: (event: Event) => {
      event.preventDefault();
      returnFocus();
    },
  }}
>
  <div class="grid gap-4">
    <blockquote class="rounded-lg bg-sky-white p-3">
      <ExpandableText text={opinion.text} lines={4} />
    </blockquote>
    <Select
      type="single"
      {dir}
      variant="field"
      label={m.opinion_feed_reason()}
      placeholder={m.opinion_feed_reason()}
      items={reasons}
      value={reason}
      onValueChange={(value: ModerationReason | undefined) => {
        reason = value;
      }}
    />
    <Field
      label={m.opinion_feed_explanation()}
      multiline
      bind:value={explanation}
      textareaProps={{ maxlength: MAX_LENGTH_BODY }}
    />
  </div>
  {#snippet footer()}
    <Button
      variant="neutral"
      onclick={() => {
        open = false;
      }}>{m.project_create_cancel()}</Button
    >
    <Button variant="solid" disabled={!reason || !onmove} onclick={move}
      >{m.moderation_move()}</Button
    >
  {/snippet}
</Dialog>
