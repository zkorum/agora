<script lang="ts">
  import { Avatar } from "bits-ui";

  let {
    author,
    class: className,
    rootProps = {},
    ref = $bindable(null),
  }: {
    author: { name: string; initials: string; detail: string };
    class?: Avatar.RootProps["class"];
    rootProps?: Omit<Avatar.RootProps, "children" | "ref" | "aria-hidden">;
    ref?: Avatar.RootProps["ref"];
  } = $props();
</script>

<div
  class={[
    "inline-flex max-w-full min-w-0 items-center gap-(--avatar-gap,10px)",
    className,
  ]}
>
  <Avatar.Root
    {...rootProps}
    bind:ref
    class={[
      `
        grid size-(--avatar-size,32px) shrink-0 place-items-center
        rounded-(--avatar-radius,8px)
        bg-(--avatar-background,var(--sky-lighter))
        text-(length:--avatar-initials-size,11px)
        text-(--avatar-color,var(--ink-light))
      `,
      rootProps.class,
    ]}
    aria-hidden="true"
    ><Avatar.Fallback>{author.initials}</Avatar.Fallback></Avatar.Root
  >
  <span
    class="
      [display:var(--avatar-copy-display,flex)] min-w-0 flex-col
      gap-(--avatar-copy-gap,0)
    "
    ><span
      class="
        [overflow:var(--avatar-name-overflow,visible)]
        text-(length:--avatar-name-size,14px)
        leading-(--avatar-name-line-height,inherit) wrap-anywhere
        [text-overflow:var(--avatar-name-text-overflow,clip)]
        [white-space:var(--avatar-name-white-space,normal)]
        text-(--avatar-name-color,var(--ink-dark))
      ">{author.name}</span
    ><span
      class="
        [display:var(--avatar-detail-display,block)]
        text-(length:--avatar-detail-size,12px)
        leading-(--avatar-detail-line-height,inherit) text-ink-light
      ">{author.detail}</span
    ></span
  >
</div>
