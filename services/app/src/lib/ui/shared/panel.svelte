<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    title,
    description,
    actions,
    children,
  }: {
    title?: string;
    description?: string;
    actions?: Snippet;
    children: Snippet;
  } = $props();
</script>

<section class="panel">
  {#if Boolean(title) || Boolean(description) || Boolean(actions)}
    <header>
      <div>
        {#if title}<h2>{title}</h2>{/if}{#if description}<p>
            {description}
          </p>{/if}
      </div>
      {#if actions}{@render actions()}{/if}
    </header>
  {/if}
  {@render children()}
</section>

<style>
  .panel {
    background: white;
    border: 1px solid var(--sky-lighter);
    border-radius: 12px;
    padding: 28px;
    min-width: 0;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
    margin-block-end: 24px;
  }
  h2 {
    font-size: 20px;
    font-weight: 600;
  }
  p {
    font-size: 14px;
    color: var(--ink-light);
    margin-block-start: 6px;
  }
  @media (max-width: 760px) {
    .panel {
      padding: 20px 16px;
    }
  }
</style>
