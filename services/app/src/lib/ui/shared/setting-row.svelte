<script lang="ts">
  import { Label, Switch } from "bits-ui";

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
      "checked" | "children" | "ref" | "id" | "disabled"
    >;
    ref?: Switch.RootProps["ref"];
  } = $props();
  const id = $props.id();
</script>

<div class={["setting-row", { disabled }]}>
  <span class="setting-icon"><Icon name={icon} size={20} /></span>
  <div class="copy">
    <Label.Root for={id} class="setting-label">{title}</Label.Root>
    <p id={`${id}-description`}>{description}</p>
  </div>
  <Switch.Root
    {...switchProps}
    bind:ref
    {id}
    bind:checked
    {disabled}
    aria-describedby={`${id}-description ${switchProps["aria-describedby"] ?? ""}`.trim()}
    class={["setting-switch", switchProps.class]}
    ><Switch.Thumb class="setting-thumb" /></Switch.Root
  >
</div>

<style>
  .setting-row {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px;
    border: 1px solid var(--sky-lighter);
    border-radius: 10px;
    background: white;
  }
  .setting-icon {
    color: var(--ink-light);
  }
  .copy {
    flex: 1;
    min-width: 0;
  }
  .copy :global(.setting-label) {
    color: var(--ink-dark);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
  }
  p {
    margin-block-start: 4px;
    color: var(--ink-light);
    font-size: 13px;
  }
  .setting-row :global(.setting-switch) {
    display: flex;
    align-items: center;
    padding: 3px;
    width: 44px;
    height: 26px;
    border: 0;
    border-radius: 999px;
    background: var(--sky-lighter);
    flex-shrink: 0;
    cursor: pointer;
  }
  .setting-row :global(.setting-switch[data-state="checked"]) {
    background: var(--primary-base);
  }
  .setting-row :global(.setting-thumb) {
    display: block;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: white;
    transform: translateX(0);
    transition: transform 150ms ease;
    box-shadow: 0 1px 3px #33323814;
  }
  .setting-row :global(.setting-thumb[data-state="checked"]) {
    transform: translateX(18px);
  }
  .setting-row:dir(rtl) :global(.setting-thumb[data-state="checked"]) {
    transform: translateX(-18px);
  }
  .disabled {
    opacity: 0.5;
  }
  .setting-row :global(.setting-switch:focus-visible) {
    outline: 3px solid var(--primary-light);
    outline-offset: 3px;
  }
  @media (max-width: 480px) {
    .setting-icon {
      display: none;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .setting-row :global(.setting-thumb) {
      transition: none;
    }
  }
</style>
