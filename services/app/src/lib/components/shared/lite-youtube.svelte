<script lang="ts">
  import { onMount } from "svelte";

  import { browser } from "$app/environment";

  interface Props {
    videoid: string;
    videotitle?: string;
  }

  let { videoid, videotitle }: Props = $props();
  let ready = $state(false);

  onMount(async () => {
    await import("@justinribeiro/lite-youtube");
    ready = true;
  });
</script>

{#if browser && ready}
  <lite-youtube {videoid} {videotitle} posterquality="maxresdefault"
  ></lite-youtube>
{/if}
