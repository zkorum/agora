<script lang="ts">
  import { RadioGroup } from "bits-ui";

  import * as m from "#lib/paraglide/messages.js";

  import type { OpinionVoteControlsProps } from "./view-types.js";

  let {
    label,
    selected,
    onvote,
    disabled = false,
  }: OpinionVoteControlsProps = $props();

  const choices = $derived([
    {
      value: "disagree",
      label: m.authoring_disagree(),
      color: "bg-accent-yellow",
      states:
        "hover:bg-yellow-lightest aria-checked:border-yellow-base aria-checked:bg-yellow-lightest aria-checked:text-yellow-darkest",
    },
    {
      value: "pass",
      label: m.authoring_unsure(),
      color: "bg-sky-base",
      states:
        "hover:bg-sky-lighter aria-checked:border-sky-base aria-checked:bg-sky-lighter aria-checked:text-ink-darker",
    },
    {
      value: "agree",
      label: m.authoring_agree(),
      color: "bg-primary-base",
      states:
        "hover:bg-primary-lightest aria-checked:border-primary-base aria-checked:bg-primary-lightest aria-checked:text-primary-dark",
    },
  ] as const);
  function change(next: string): void {
    const choice = choices.find((item) => item.value === next);
    if (choice) onvote?.(choice.value);
  }
</script>

<div class="@container/votes min-w-0">
  <RadioGroup.Root
    orientation="horizontal"
    bind:value={() => selected ?? "", change}
    disabled={disabled || onvote === undefined}
    class="
      grid w-full max-w-104 grid-cols-3 gap-0.5
      @3xs/votes:gap-1
      @2xs/votes:gap-2
      @min-[26rem]/votes:gap-4
    "
    aria-label={label}
  >
    {#each choices as choice (choice.value)}
      <RadioGroup.Item
        value={choice.value}
        class={[
          `
            flex min-h-11 min-w-0 cursor-pointer flex-col items-center
            justify-center gap-1 rounded-lg border border-sky-lighter
            bg-sky-white px-0.5 py-1.5 text-center text-[13px]/4 font-medium
            text-ink-base
            focus-visible:outline-2 focus-visible:outline-offset-1
            focus-visible:outline-primary-base
            disabled:cursor-not-allowed disabled:opacity-45
            @3xs/votes:text-sm/4
            @min-[19rem]/votes:flex-row @min-[19rem]/votes:px-1.5
            @min-[26rem]/votes:min-h-12.5 @min-[26rem]/votes:gap-2
            @min-[26rem]/votes:text-base/6
          `,
          choice.states,
        ]}
      >
        <span
          class={[
            `
              size-1.5 shrink-0 rounded-full
              @min-[26rem]/votes:size-2
            `,
            choice.color,
          ]}
          aria-hidden="true"
        ></span><span class="max-w-full min-w-0 wrap-anywhere"
          >{choice.label}</span
        >
      </RadioGroup.Item>
    {/each}
  </RadioGroup.Root>
</div>
