<script lang="ts" generics="T">
  import type { Snippet } from "svelte";

  import type { FixtureStateView } from "./view-types.js";

  let {
    initial,
    children,
  }: {
    initial: () => T;
    children: Snippet<[FixtureStateView<T>]>;
  } = $props();

  // Isolate each rendered story until the lint/format tools support declaration tags.
  let value = $derived(initial());

  function set(next: T): void {
    value = next;
  }
</script>

{@render children({ value, set })}
