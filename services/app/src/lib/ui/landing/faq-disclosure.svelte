<script lang="ts">
  import { Collapsible } from "bits-ui";
  import type { Snippet } from "svelte";

  let {
    level,
    label,
    heading,
    children,
  }: {
    level: "group" | "question";
    label: string;
    heading: Snippet;
    children: Snippet;
  } = $props();

  let element: HTMLDetailsElement;
  let open = $state(false);

  // The native element remains the source of truth, including clicks before
  // hydration and browser find-in-page revealing a previously closed answer.
  function attachDetails(node: HTMLDetailsElement): void {
    element = node;
    open = node.open;
  }
</script>

<Collapsible.Root
  bind:open={
    () => open,
    (next) => {
      element.open = next;
    }
  }
  aria-label={label}
  class={level === "group"
    ? `
      border-b border-border py-2
      last:border-b-0
    `
    : `
      border-t border-border py-5
      first:border-t-0
    `}
>
  {#snippet child({ props: rootProps })}
    <details
      {...rootProps}
      {@attach attachDetails}
      ontoggle={(event) => {
        open = event.currentTarget.open;
      }}
    >
      <Collapsible.Trigger
        class={[
          `
            flex w-full cursor-pointer list-none justify-between gap-4
            text-start
            focus-visible:outline-primary-base
            [&::-webkit-details-marker]:hidden
          `,
          level === "group"
            ? `
              items-center rounded-lg bg-gradient-light-purple/20 p-5
              sm:px-6
            `
            : "items-start",
        ]}
      >
        {#snippet child({ props: triggerProps })}
          <!-- Bits handles activation after hydration. Prevent the native default
         from toggling it a second time. Let summary itself expose expanded state. -->
          <summary
            {...{
              ...triggerProps,
              type: undefined,
              disabled: undefined,
              "aria-expanded": undefined,
            }}
            onclickcapture={(event) => {
              event.preventDefault();
            }}
          >
            {@render heading()}
            <span
              aria-hidden="true"
              class={[
                `
                  inline-flex shrink-0 items-center justify-center rounded-full
                  border border-border leading-none transition-transform
                  duration-150
                  motion-reduce:transition-none
                  [[open]>summary>&]:rotate-45
                `,
                level === "group"
                  ? "size-8 text-lg text-brand-purple"
                  : "mt-1 size-7 text-base text-primary-base",
              ]}>+</span
            >
          </summary>
        {/snippet}
      </Collapsible.Trigger>
      <Collapsible.Content forceMount>{@render children()}</Collapsible.Content>
    </details>
  {/snippet}
</Collapsible.Root>
