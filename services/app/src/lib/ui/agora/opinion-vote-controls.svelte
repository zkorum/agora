<script lang="ts">
  import { RadioGroup } from "bits-ui";
  import type { HTMLAttributes, HTMLButtonAttributes } from "svelte/elements";

  import type {
    OpinionVoteChoice,
    OpinionVoteControlsProps,
  } from "./view-types.js";

  let {
    label,
    selected,
    onvote,
    disabled = false,
  }: OpinionVoteControlsProps = $props();

  const choices: { value: OpinionVoteChoice; label: string }[] = [
    { value: "disagree", label: "Disagree" },
    { value: "pass", label: "Unsure" },
    { value: "agree", label: "Agree" },
  ];

  function change(next: string): void {
    const choice = choices.find((item) => item.value === next);
    if (choice) onvote?.(choice.value);
  }
</script>

<RadioGroup.Root
  orientation="horizontal"
  bind:value={() => selected ?? "", change}
  disabled={disabled || onvote === undefined}
  aria-label={label}
>
  {#snippet child({ props }: { props: HTMLAttributes<HTMLDivElement> })}
    <div {...props} class="votes">
      {#each choices as choice (choice.value)}
        <RadioGroup.Item value={choice.value}>
          {#snippet child({ props }: { props: HTMLButtonAttributes })}
            <button {...props} class={choice.value}>
              <span class="dot" aria-hidden="true"></span>{choice.label}
            </button>
          {/snippet}
        </RadioGroup.Item>
      {/each}
    </div>
  {/snippet}
</RadioGroup.Root>

<style>
  .votes {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }
  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 50px;
    min-width: 128px;
    padding: 10px 16px;
    border: 1px solid var(--sky-lighter);
    border-radius: 8px;
    background: var(--sky-white);
    color: var(--ink-base);
    font: inherit;
    font-size: 16px;
    font-weight: 500;
    line-height: 24px;
    cursor: pointer;
  }
  .disagree {
    --response-dot: var(--accent-yellow);
    --response-fill: var(--yellow-lightest);
    --response-border: var(--yellow-base);
    --response-text: var(--yellow-darkest);
  }
  .pass {
    --response-dot: var(--sky-base);
    --response-fill: var(--sky-lighter);
    --response-border: var(--sky-base);
    --response-text: var(--ink-darker);
  }
  .agree {
    --response-dot: var(--primary-base);
    --response-fill: var(--primary-lightest);
    --response-border: var(--primary-base);
    --response-text: var(--primary-dark);
  }
  /* Figma defines resting/selected variants; hover derives their pale fills. */
  button:hover:not(:disabled) {
    background: var(--response-fill);
  }
  button[aria-checked="true"],
  button:active:not(:disabled) {
    border-color: var(--response-border);
    background: var(--response-fill);
    color: var(--response-text);
  }
  button:focus-visible {
    outline: 3px solid var(--primary-base);
    outline-offset: 3px;
  }
  button:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .dot {
    width: 8px;
    height: 8px;
    flex-shrink: 0;
    border-radius: 50%;
    background: var(--response-dot);
  }
  @media (max-width: 760px) {
    .votes {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      padding-block-start: 16px;
      border-block-start: 1px solid var(--sky-lighter);
    }
    button {
      min-width: 0;
      padding-inline: 10px;
      min-height: 46px;
    }
    .pass {
      grid-column: 1 / -1;
      grid-row: 2;
      min-height: 36px;
      padding-block: 6px;
    }
    .pass[aria-checked="false"] {
      background: var(--sky-lightest);
      border-color: transparent;
    }
  }
</style>
