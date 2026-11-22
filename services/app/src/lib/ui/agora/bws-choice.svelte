<script lang="ts">
  import { RadioGroup } from "bits-ui";

  import * as m from "#lib/paraglide/messages.js";
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

<div
  class="
    grid grid-flow-row-dense grid-cols-[minmax(0,1fr)_3.125rem_3.125rem] gap-x-3
    text-sm
  "
>
  <span class="border-b border-sky-lighter py-5 text-xs text-ink-light"
    >{m.authoring_statement()}</span
  ><span class="border-b border-sky-lighter py-5 text-xs text-ink-light"
    >{m.authoring_most()}</span
  ><span class="border-b border-sky-lighter py-5 text-xs text-ink-light"
    >{m.authoring_least()}</span
  >
  {#each items as item (item.value)}
    <div class="col-start-1 min-w-0 border-b border-sky-lighter py-5">
      <ExpandableText text={item.text} />
    </div>
  {/each}
  <RadioGroup.Root
    {...bestRootProps}
    bind:ref={bestRef}
    bind:value={() => best ?? "", onbestchange}
    {disabled}
    aria-label={m.authoring_most()}
    class={["contents", bestRootProps.class]}
  >
    {#each items as item (item.value)}
      <div
        class="col-start-2 flex items-center border-b border-sky-lighter py-5"
      >
        <RadioGroup.Item
          value={item.value}
          aria-label={`${m.authoring_most()}: ${item.text}`}
          class="
            group grid size-6 cursor-pointer place-items-center rounded-full
            border border-sky-base bg-sky-white
            focus-visible:outline-2 focus-visible:outline-primary-base
            disabled:cursor-not-allowed disabled:opacity-60
            aria-checked:border-primary-base
          "
          ><span
            class="
              size-3 rounded-full
              group-aria-checked:bg-primary-base
            "
            aria-hidden="true"
          ></span></RadioGroup.Item
        >
      </div>
    {/each}
  </RadioGroup.Root>
  <RadioGroup.Root
    {...worstRootProps}
    bind:ref={worstRef}
    bind:value={() => worst ?? "", onworstchange}
    {disabled}
    aria-label={m.authoring_least()}
    class={["contents", worstRootProps.class]}
  >
    {#each items as item (item.value)}
      <div
        class="col-start-3 flex items-center border-b border-sky-lighter py-5"
      >
        <RadioGroup.Item
          value={item.value}
          aria-label={`${m.authoring_least()}: ${item.text}`}
          class="
            group grid size-6 cursor-pointer place-items-center rounded-full
            border border-sky-base bg-sky-white
            focus-visible:outline-2 focus-visible:outline-primary-base
            disabled:cursor-not-allowed disabled:opacity-60
            aria-checked:border-primary-base
          "
          ><span
            class="
              size-3 rounded-full
              group-aria-checked:bg-primary-base
            "
            aria-hidden="true"
          ></span></RadioGroup.Item
        >
      </div>
    {/each}
  </RadioGroup.Root>
</div>
