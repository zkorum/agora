<script lang="ts">
  import { Popover } from "bits-ui";

  import Button from "./button.svelte";

  type Props = Omit<Popover.RootProps, "children"> & {
    label: NonNullable<Popover.ContentProps["aria-label"]>;
    trigger: NonNullable<Popover.TriggerProps["children"]>;
    children: NonNullable<Popover.ContentProps["children"]>;
    triggerProps?: Omit<Popover.TriggerProps, "child" | "children" | "ref">;
    contentProps?: Omit<
      Popover.ContentProps,
      "child" | "children" | "ref" | "role" | "aria-label"
    >;
    triggerRef?: Popover.TriggerProps["ref"];
  };

  let {
    open = $bindable(false),
    label,
    trigger,
    children,
    triggerProps = {},
    contentProps = {},
    triggerRef = $bindable(null),
    ...rootProps
  }: Props = $props();
</script>

<Popover.Root {...rootProps} bind:open>
  <Popover.Trigger {...triggerProps} bind:ref={triggerRef}>
    {#snippet child({ props })}
      <Button {...props} variant="neutral" size="control">
        {@render trigger()}
      </Button>
    {/snippet}
  </Popover.Trigger>
  <Popover.Portal>
    <Popover.Content
      align="end"
      sideOffset={6}
      collisionPadding={12}
      {...contentProps}
      role="dialog"
      aria-label={label}
      class={[
        `
          z-80 max-h-(--bits-popover-content-available-height,80dvh)
          max-w-[calc(100vw-24px)] overflow-auto rounded-xl border
          border-sky-lighter bg-sky-white text-ink-dark
          shadow-[0_6px_24px_color-mix(in_srgb,var(--ink-darker)_18%,transparent)]
        `,
        contentProps.class,
      ]}
      data-shared-popover
    >
      {@render children()}
    </Popover.Content>
  </Popover.Portal>
</Popover.Root>
