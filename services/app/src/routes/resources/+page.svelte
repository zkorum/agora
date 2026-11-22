<script lang="ts">
  import ResourcesIndex from "$components/landing/resources-index.svelte";

  import type { PageData } from "./$types.js";

  let { data }: { data: PageData } = $props();
</script>

<ResourcesIndex posts={data.posts} />
