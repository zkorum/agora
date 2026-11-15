<script lang="ts">
  import { RadioGroup } from "bits-ui";

  import ExpandableText from "$ui/shared/expandable-text.svelte";

  let {
    items,
    best,
    worst,
    onbestchange,
    onworstchange,
    disabled = false,
    bestRootProps = {},
    worstRootProps = {},
    bestRef = $bindable(null),
    worstRef = $bindable(null),
  }: {
    items: readonly { value: string; text: string }[];
    best: string | undefined;
    worst: string | undefined;
    onbestchange: (value: string) => void;
    onworstchange: (value: string) => void;
    disabled?: boolean;
    bestRootProps?: Omit<
      RadioGroup.RootProps,
      "value" | "children" | "disabled" | "onValueChange" | "ref"
    >;
    worstRootProps?: Omit<
      RadioGroup.RootProps,
      "value" | "children" | "disabled" | "onValueChange" | "ref"
    >;
    bestRef?: RadioGroup.RootProps["ref"];
    worstRef?: RadioGroup.RootProps["ref"];
  } = $props();
</script>

<div class="bws">
  <span class="heading">Statement</span><span class="heading">Most</span><span
    class="heading">Least</span
  >
  {#each items as item, index (item.value)}
    <div class="item" style:grid-row={index + 2}>
      <ExpandableText text={item.text} />
    </div>
  {/each}
  <RadioGroup.Root
    {...bestRootProps}
    bind:ref={bestRef}
    bind:value={() => best ?? "", onbestchange}
    {disabled}
    aria-label="Most important statement"
    class={["agora-priority-options", bestRootProps.class]}
  >
    {#each items as item, index (item.value)}
      <div class="option" style:grid-column={2} style:grid-row={index + 2}>
        <RadioGroup.Item
          value={item.value}
          aria-label={`Most important: ${item.text}`}
          class="agora-priority-radio"
          ><span class="dot" aria-hidden="true"></span></RadioGroup.Item
        >
      </div>
    {/each}
  </RadioGroup.Root>
  <RadioGroup.Root
    {...worstRootProps}
    bind:ref={worstRef}
    bind:value={() => worst ?? "", onworstchange}
    {disabled}
    aria-label="Least important statement"
    class={["agora-priority-options", worstRootProps.class]}
  >
    {#each items as item, index (item.value)}
      <div class="option" style:grid-column={3} style:grid-row={index + 2}>
        <RadioGroup.Item
          value={item.value}
          aria-label={`Least important: ${item.text}`}
          class="agora-priority-radio"
          ><span class="dot" aria-hidden="true"></span></RadioGroup.Item
        >
      </div>
    {/each}
  </RadioGroup.Root>
</div>

<style>
  .bws {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 50px 50px;
    column-gap: 12px;
    font-size: 14px;
  }
  .heading {
    color: var(--ink-light);
    font-size: 12px;
    padding-block: 20px;
    border-block-end: 1px solid var(--sky-lighter);
  }
  .item {
    grid-column: 1;
    min-width: 0;
  }
  .item,
  .option {
    padding-block: 20px;
    border-block-end: 1px solid var(--sky-lighter);
  }
  .option {
    display: flex;
    align-items: center;
  }
  /* Keep both logical radio groups while aligning their cells to the shared grid rows. */
  :global(.agora-priority-options) {
    display: contents;
  }
  .option :global(.agora-priority-radio) {
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: 1px solid var(--sky-base);
    border-radius: 50%;
    background: white;
    cursor: pointer;
  }
  .option :global(.agora-priority-radio[data-state="checked"]) {
    border-color: var(--primary-base);
  }
  .dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: transparent;
  }
  :global(.agora-priority-radio[data-state="checked"]) .dot {
    background: var(--primary-base);
  }
  .option :global(.agora-priority-radio:focus-visible) {
    outline: 3px solid var(--primary-light);
    outline-offset: 3px;
  }
  .option :global(.agora-priority-radio:disabled) {
    cursor: not-allowed;
    opacity: 0.6;
  }
</style>
