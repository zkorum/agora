<script lang="ts">
  import { Dialog } from "bits-ui";

  import Icon from "./icon.svelte";
  import type { DialogProps } from "./view-types.js";

  let {
    title,
    description,
    open = $bindable(false),
    children,
    footer,
    wide = false,
    dir,
    rootProps = {},
    contentProps = {},
    contentRef = $bindable(null),
  }: DialogProps = $props();
</script>

<Dialog.Root {...rootProps} bind:open>
  <Dialog.Portal>
    <Dialog.Overlay class="agora-dialog-overlay" />
    <Dialog.Content
      {...contentProps}
      bind:ref={contentRef}
      {dir}
      class={[`agora-dialog-content`, wide && `wide`, contentProps.class]}
    >
      <header>
        <Dialog.Title class="agora-dialog-title">{title}</Dialog.Title
        ><Dialog.Close class="agora-dialog-close" aria-label="Close dialog"
          ><Icon name="close" /></Dialog.Close
        >
      </header>
      <Dialog.Description class="agora-dialog-description"
        >{description}</Dialog.Description
      >
      <div class="body">{@render children()}</div>
      {#if footer}<footer>{@render footer()}</footer>{/if}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<style>
  :global(.agora-dialog-overlay) {
    position: fixed;
    inset: 0;
    z-index: 90;
    background: #211a3340;
  }
  :global(.agora-dialog-content) {
    position: fixed;
    z-index: 91;
    inset: 0;
    margin: auto;
    height: fit-content;
    width: min(594px, calc(100vw - 32px));
    max-height: calc(100dvh - 32px);
    display: flex;
    flex-direction: column;
    padding: 28px;
    border: 1px solid var(--sky-lighter);
    border-radius: 16px;
    background: var(--sky-lightest);
    color: var(--ink-dark);
    box-shadow: 0 16px 64px #211a3326;
    font-family: var(--font-albert-sans);
    font-size: 14px;
    line-height: 1.5;
  }
  :global(.agora-dialog-content.wide) {
    width: min(1024px, calc(100vw - 32px));
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
  }
  :global(.agora-dialog-title) {
    font-size: 24px;
    font-weight: 600;
  }
  :global(.agora-dialog-description) {
    color: var(--ink-light);
    margin-block: 8px 20px;
  }
  :global(.agora-dialog-close) {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    border: 0;
    background: transparent;
    border-radius: 8px;
    cursor: pointer;
  }
  :global(.agora-dialog-close:hover) {
    background: var(--sky-lighter);
  }
  :global(.agora-dialog-close:focus-visible) {
    outline: 3px solid var(--primary-light);
    outline-offset: 2px;
  }
  .body {
    overflow: auto;
    min-height: 0;
  }
  footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding-block-start: 20px;
    margin-block-start: 20px;
    border-block-start: 1px solid var(--sky-lighter);
    flex-shrink: 0;
  }
  @media (max-width: 760px) {
    :global(.agora-dialog-content) {
      padding: 20px 16px;
    }
  }
</style>
