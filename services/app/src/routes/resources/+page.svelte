<script lang="ts">
  import ResourcesIndex from "$components/landing/resources-index.svelte";

  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
</script>

<ResourcesIndex posts={data.posts} />
