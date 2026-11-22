<script lang="ts" generics="Value extends string">
  import type { Snippet } from "svelte";

  import Tabs, { type Tab } from "$ui/shared/tabs.svelte";

  let {
    tabs,
    value,
    onValueChange,
    label,
    panel: renderPanel,
    layout,
    dir = "ltr",
  }: {
    tabs: readonly Tab<Value>[];
    value: NoInfer<Value>;
    onValueChange: (next: NoInfer<Value>) => void;
    label: string;
    panel: Snippet<[NoInfer<Value>]>;
    layout: Snippet<[Snippet, Snippet]>;
    dir?: "ltr" | "rtl";
  } = $props();
</script>

<div class="@container h-full text-ink-dark" {dir}>
  <Tabs
    appearance="pills"
    {tabs}
    {value}
    {label}
    {onValueChange}
    rootProps={{ dir, class: "h-full" }}
    {layout}
  >
    {#snippet panel(tab: Value)}
      <div class="rounded-2xl p-[clamp(12px,2cqi,24px)]">
        <div class="mx-auto grid max-w-[960px] min-w-0 gap-6">
          {@render renderPanel(tab)}
        </div>
      </div>
    {/snippet}
  </Tabs>
</div>
