<script lang="ts">
  import GradientButton from "$lib/components/shared/GradientButton.svelte";
  import GradientText from "$lib/components/shared/GradientText.svelte";
  import * as m from "$lib/paraglide/messages.js";
</script>

<section class="w-full px-8 pt-24 pb-16">
  <div
    class="relative mx-auto max-w-[1376px] overflow-hidden rounded-3xl"
    style="min-height: 706px;"
  >
    <img
      src="/images/hero-bg-base.png"
      alt=""
      class="absolute inset-0 size-full rounded-3xl object-cover"
    />
    <div
      class="
        absolute top-0 left-0 h-[1159px] w-[1739px] scale-y-[-1] rotate-180
      "
    >
      <img
        src="/images/hero-overlay.png"
        alt=""
        class="size-full object-cover"
      />
    </div>
    <div
      class="
        relative z-10 flex flex-col gap-8 px-6 py-12
        sm:px-12 sm:py-16
        md:max-w-[550px] md:px-20 md:py-24
      "
    >
      <p
        class="
          text-(length:--font-size-quote) leading-[1.1] tracking-[-0.32px]
        "
      >
        <GradientText>{m.hero_tagline()}</GradientText>
      </p>

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
