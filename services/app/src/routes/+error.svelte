<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { localizeHref } from "$lib/paraglide/runtime";

  // Redirect 404s to root
  $effect(() => {
    if (page.status === 404) {
      void goto(localizeHref("/"), { replaceState: true });
    }
  });
</script>

{#if page.status !== 404}
  <div class="flex min-h-[50vh] items-center justify-center">
    <div class="text-center">
      <h1 class="text-2xl font-bold">{page.status}</h1>
      <p class="mt-2 text-text-secondary">{page.error?.message}</p>
    </div>
  </div>
{/if}
