<script lang="ts">
  import GradientText from "$lib/components/shared/GradientText.svelte";
  import * as m from "$lib/paraglide/messages.js";
</script>

<section class="px-8 pt-8 pb-20">
  <div class="mx-auto max-w-[730px] text-center">
    <p
      class="
        text-(length:--font-size-quote) leading-[1.3] font-medium
        tracking-[-0.32px]
      "
    >
      <GradientText>"{m.mission_quote()}"</GradientText>
    </p>
  </div>
</section>
