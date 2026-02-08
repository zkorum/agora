<script lang="ts">
  import * as m from "$lib/paraglide/messages.js";
  import GradientText from "$ui/shared/gradient-text.svelte";
  import Text from "$ui/shared/text.svelte";
</script>

<section class="px-8 pt-8 pb-20">
  <div class="mx-auto max-w-[730px] text-center">
    <Text size="2xl" weight="medium">
      <GradientText>"{m.mission_quote()}"</GradientText>
    </Text>
  </div>
</section>
