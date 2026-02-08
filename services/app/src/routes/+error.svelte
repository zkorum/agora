<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { localizeHref } from "$lib/paraglide/runtime";
  import Text from "$ui/shared/text.svelte";

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
      <Text size="2xl" weight="bold" element="h1">{page.status}</Text>
      <Text size="base" class="mt-2 text-secondary-foreground"
        >{page.error?.message}</Text
      >
    </div>
  </div>
{/if}
