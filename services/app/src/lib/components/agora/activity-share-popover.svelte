<script lang="ts">
  import * as m from "#lib/paraglide/messages.js";
  import Button from "$ui/shared/button.svelte";
  import Icon from "$ui/shared/icon.svelte";
  import Popover from "$ui/shared/popover.svelte";
  import SettingRow from "$ui/shared/setting-row.svelte";

  import ParticipantLinkActions from "./participant-link-actions.svelte";
  let {
    open = $bindable(false),
    status,
    pending,
    dir,
    onstatus,
    onvisibility,
  }: {
    open?: boolean;
    status: "open" | "closed";
    pending: boolean;
    dir: "ltr" | "rtl";
    onstatus: (status: "open" | "closed") => Promise<boolean>;
    onvisibility: (opener: HTMLElement) => void;
  } = $props();
  let triggerButton = $state.raw<HTMLButtonElement | null>(null),
    failed = $state(false);
  let acceptingSwitch = $state.raw<HTMLElement | null>(null);
  let revealSettings = false;
  async function change(accepting: boolean) {
    if (pending) return;
    failed = false;
    failed = !(await onstatus(accepting ? "open" : "closed"));
  }
</script>

<Popover
  label={m.project_detail_share()}
  bind:open
  bind:triggerRef={triggerButton}
  triggerProps={{ "aria-label": m.project_detail_share() }}
  onOpenChange={(next: boolean) => {
    if (next) failed = false;
  }}
  contentProps={{
    dir,
    class: "w-66 p-1",
    onOpenAutoFocus: (event: Event) => {
      if (acceptingSwitch) {
        event.preventDefault();
        acceptingSwitch.focus({ preventScroll: true });
      }
    },
    onCloseAutoFocus: (event: Event) => {
      if (revealSettings && triggerButton) {
        event.preventDefault();
        revealSettings = false;
        onvisibility(triggerButton);
      }
    },
  }}
>
  {#snippet trigger()}<Icon name="link" /><span class="max-sm:sr-only"
      >{m.project_detail_share()}</span
    ><span
      class={[
        "size-1.5 rounded-full",
        status === "open" ? "bg-green-base" : "bg-red-base",
      ]}
      aria-hidden="true"
    ></span>{/snippet}
  <SettingRow
    title={m.activity_accepting()}
    description={status === "open"
      ? m.conversation_status_open()
      : m.conversation_status_closed()}
    icon="message"
    bind:ref={acceptingSwitch}
    switchProps={{ "aria-disabled": pending, "aria-busy": pending }}
    bind:checked={
      () => status === "open",
      (checked: boolean) => {
        void change(checked);
      }
    }
  />
  {#if failed}<p role="alert" class="p-2 text-sm text-red-darkest">
      {m.authoring_action_failed()}
    </p>{/if}
  <div class="grid gap-2 py-1">
    <ParticipantLinkActions />
  </div>
  <div class="border-t border-sky-lighter pt-1">
    <Button
      variant="quiet"
      size="control"
      class="w-full justify-start"
      disabled={pending}
      onclick={() => {
        revealSettings = true;
        open = false;
      }}
      ><Icon name="globe" size={16} />{m.activity_visibility_settings()}</Button
    >
  </div>
</Popover>
