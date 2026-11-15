<script lang="ts">
  import { Avatar } from "bits-ui";

  let {
    author,
    rootProps = {},
    ref = $bindable(null),
  }: {
    author: { name: string; initials: string; detail: string };
    rootProps?: Omit<Avatar.RootProps, "children" | "ref" | "aria-hidden">;
    ref?: Avatar.RootProps["ref"];
  } = $props();
</script>

<div class="author">
  <Avatar.Root
    {...rootProps}
    bind:ref
    class={["agora-avatar", rootProps.class]}
    aria-hidden="true"
    ><Avatar.Fallback>{author.initials}</Avatar.Fallback></Avatar.Root
  >
  <span class="copy"
    ><span class="name">{author.name}</span><span class="detail"
      >{author.detail}</span
    ></span
  >
</div>

<style>
  .author {
    display: inline-flex;
    gap: 10px;
    align-items: center;
    min-width: 0;
  }
  .author :global(.agora-avatar) {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: var(--sky-lighter);
    color: var(--ink-light);
    font-size: 11px;
    flex-shrink: 0;
  }
  .copy {
    display: flex;
    flex-direction: column;
    min-width: 0;
    gap: var(--avatar-copy-gap, 0);
  }
  .name {
    font-size: var(--avatar-name-size, 14px);
    line-height: var(--avatar-name-line-height, inherit);
    color: var(--ink-dark);
    overflow-wrap: anywhere;
  }
  .detail {
    display: var(--avatar-detail-display, block);
    font-size: 12px;
    line-height: var(--avatar-detail-line-height, inherit);
    color: var(--ink-light);
  }
</style>
