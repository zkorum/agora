<script lang="ts">
  import * as m from "$lib/paraglide/messages.js";
  import GradientButton from "$ui/shared/gradient-button.svelte";
  import GradientText from "$ui/shared/gradient-text.svelte";
  import Text from "$ui/shared/text.svelte";
</script>

<section class="w-full px-8 pb-16">
  <div
    class="
      relative mx-auto min-h-[706px] max-w-[1376px] overflow-hidden rounded-3xl
    "
  >
    <enhanced:img
      src="$lib/assets/hero-bg-base.png"
      alt=""
      sizes="min(1376px, 100vw)"
      fetchpriority="high"
      class="absolute inset-0 size-full rounded-3xl object-cover"
    />
    <div
      class="absolute top-0 left-0 h-289.75 w-434.75 scale-y-[-1] rotate-180"
    >
      <enhanced:img
        src="$lib/assets/hero-overlay.png"
        alt=""
        class="size-full object-cover"
      />
    </div>
    <div
      class="
        relative z-10 flex flex-col gap-8 px-4 py-12
        sm:px-12 sm:py-16
        md:max-w-137.5 md:px-20 md:py-24
      "
    >
      <Text size="2xl">
        <GradientText>{m.hero_tagline()}</GradientText>
      </Text>

      <div
        class="
          flex flex-col gap-3
          sm:flex-row
        "
      >
        <GradientButton href="#facilitators" variant="primary">
          {m.hero_cta_primary()}
        </GradientButton>
        <GradientButton href="#citizens" variant="secondary">
          {m.hero_cta_secondary()}
        </GradientButton>
      </div>
    </div>
  </div>
</section>
