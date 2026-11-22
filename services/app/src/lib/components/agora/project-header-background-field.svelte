<script lang="ts">
  import type { Attachment } from "svelte/attachments";

  import type { UpdateProjectSettingsInput } from "#lib/api/agora/projects.js";
  import * as m from "#lib/paraglide/messages.js";
  import { projectHeaderBackgroundMaxBytes } from "$logic/agora/project-header-background.js";
  import Button from "$ui/shared/button.svelte";
  import ImagePicker from "$ui/shared/image-picker.svelte";

  type HeaderBackgroundChange =
    UpdateProjectSettingsInput["headerBackgroundChange"];

  let {
    savedImageSrc,
    change,
    disabled,
    onChange,
    onPendingChange,
  }: {
    savedImageSrc: string | undefined;
    change: HeaderBackgroundChange;
    disabled: boolean;
    onChange: (change: HeaderBackgroundChange) => void;
    onPendingChange: (pending: boolean) => void;
  } = $props();

  const id = $props.id();
  const file = $derived(change?.kind === "upload" ? change.file : undefined);
  const imageSrc = $derived(
    change?.kind === "reset" ? undefined : savedImageSrc,
  );

  function reset(event: MouseEvent): void {
    if (event.currentTarget instanceof HTMLElement) {
      event.currentTarget.ownerDocument.getElementById(id)?.focus();
    }
    onChange(savedImageSrc ? { kind: "reset" } : undefined);
  }
</script>

<ImagePicker
  {id}
  label={m.project_header_background()}
  hint={m.project_header_background_description()}
  value={file}
  hasImage={imageSrc !== undefined}
  {disabled}
  maxBytes={projectHeaderBackgroundMaxBytes}
  {onPendingChange}
  onValueChange={(file: File | undefined) => {
    if (file) onChange({ kind: "upload", file });
  }}
>
  {#snippet renderPreview(
    attachPreview: Attachment<HTMLImageElement> | undefined,
  )}
    <div
      class="
        relative aspect-878/170 min-h-20 overflow-hidden rounded-xl
        gradient-border-light
      "
      role="img"
      aria-label={m.project_header_background_preview()}
    >
      {#if attachPreview}
        <img
          class="absolute inset-0 size-full object-cover"
          {@attach attachPreview}
          alt=""
        />
      {:else if imageSrc}
        <img
          class="absolute inset-0 size-full object-cover"
          src={imageSrc}
          alt=""
        />
      {/if}
    </div>
  {/snippet}
  {#snippet actions()}
    <Button
      type="button"
      variant="quiet"
      size="control"
      disabled={disabled || (file === undefined && imageSrc === undefined)}
      onclick={reset}
    >
      {m.project_header_background_reset()}
    </Button>
  {/snippet}
</ImagePicker>
