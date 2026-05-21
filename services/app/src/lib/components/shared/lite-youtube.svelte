<script lang="ts">
  import { onMount } from "svelte";

  import { browser } from "$app/environment";

  interface Props {
    videoid: string;
    poster?: string;
    videotitle?: string;
  }

  let { videoid, poster, videotitle }: Props = $props();
  let ready = $state(false);

  onMount(async () => {
    await import("@justinribeiro/lite-youtube");
    ready = true;
  });
</script>

{#if browser && ready}
  <lite-youtube {videoid} {videotitle} posterquality="maxresdefault">
    {#if poster}
      <img
        slot="image"
        src={poster}
        alt={videotitle ?? "Video thumbnail"}
        loading="lazy"
      />
    {/if}
  </lite-youtube>
{/if}
