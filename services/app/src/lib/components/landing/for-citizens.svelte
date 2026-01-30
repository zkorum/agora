<script lang="ts">
  import * as m from "$lib/paraglide/messages.js";
  import GradientButton from "$ui/shared/gradient-button.svelte";
  import GradientText from "$ui/shared/gradient-text.svelte";
</script>

<section id="citizens" class="px-8 py-20">
  <div
    class="relative mx-auto max-w-[1376px] overflow-hidden rounded-3xl"
    style="min-height: 784px;"
  >
    <img
      src="/images/citizens-illustration.png"
      alt=""
      class="absolute inset-0 size-full rounded-3xl object-cover"
    />
    <div
      class="
        relative z-10 grid grid-cols-1 items-center gap-12 px-6 py-12
        sm:px-12 sm:py-16
        md:grid-cols-2 md:px-20 md:py-24
      "
    >
      <div class="flex flex-col gap-2">
        <p class="text-base leading-[1.3] font-bold tracking-[-0.16px]">
          <GradientText>{m.citizens_label()}</GradientText>
        </p>
        <p class="text-2xl leading-[1.3] tracking-[-0.24px] text-text-primary">
          {m.citizens_description()}
        </p>
        <div
          class="
            mt-6 flex justify-center
            md:justify-start
          "
        >
          <GradientButton
            href="https://www.agoracitizen.app/"
            variant="primary"
          >
            {m.citizens_cta()}
          </GradientButton>
        </div>
      </div>

      <div class="flex justify-center">
        <img
          src="/images/screenshot-citizens.png"
          alt="Phone mockup showing the citizen dialogue feed"
          class="w-[281px]"
        />
      </div>
    </div>
  </div>
</section>
