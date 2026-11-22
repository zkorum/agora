<script lang="ts">
  import { Switch } from "bits-ui";

  import Icon from "./icon.svelte";
  import type { IconName } from "./view-types.js";

  let {
    title,
    description,
    icon,
    checked = $bindable(false),
    disabled = false,
    switchProps = {},
    ref = $bindable(null),
  }: {
    title: string;
    description: string;
    icon: IconName;
    checked?: boolean;
    disabled?: boolean;
    switchProps?: Omit<
      Switch.RootProps,
      | "checked"
      | "child"
      | "children"
      | "ref"
      | "id"
      | "disabled"
      | "aria-label"
      | "aria-labelledby"
    >;
    ref?: Switch.RootProps["ref"];
  } = $props();
  const id = $props.id();
</script>

<Switch.Root
  {...switchProps}
  bind:ref
  {id}
  bind:checked
  {disabled}
  aria-labelledby={`${id}-title`}
  aria-describedby={`${id}-description ${switchProps["aria-describedby"] ?? ""}`.trim()}
  class={[
    `
      group/setting @container flex w-full min-w-0 cursor-pointer items-center
      gap-3.5 rounded-[10px] border border-sky-lighter bg-sky-white p-4
      text-start text-ink-light
      focus-visible:outline-3 focus-visible:outline-offset-3
      focus-visible:outline-primary-light
      enabled:hover:bg-sky-lightest
      disabled:cursor-not-allowed disabled:opacity-50
    `,
    switchProps.class,
  ]}
>
  <span class="@max-[30rem]:hidden"><Icon name={icon} size={20} /></span>
  <span class="min-w-0 flex-1 wrap-anywhere">
    <span id={`${id}-title`} class="block text-sm font-medium text-ink-dark"
      >{title}</span
    >
    <span id={`${id}-description`} class="mt-1 block text-[13px]"
      >{description}</span
    >
  </span>
  <span
    aria-hidden="true"
    class="
      flex h-6.5 w-11 shrink-0 items-center rounded-full bg-sky-lighter p-0.75
      group-data-[state=checked]/setting:bg-primary-base
    "
  >
    <Switch.Thumb
      class="
        block size-5 rounded-full bg-sky-white shadow-[0_1px_3px_#33323814]
        transition-transform duration-150
        data-[state=checked]:translate-x-4.5
        motion-reduce:transition-none
        rtl:data-[state=checked]:-translate-x-4.5
      "
    />
  </span>
</Switch.Root>
