<script lang="ts">
  import { localizeHref } from "#lib/paraglide/runtime.js";
  import { afterNavigate, goto } from "$app/navigation";
  import { page } from "$app/state";
  import Text from "$ui/shared/text.svelte";

  afterNavigate(() => {
    if (page.status === 404) {
      void goto(localizeHref("/"), { replace: true });
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
