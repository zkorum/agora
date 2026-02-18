<script lang="ts">
  import * as m from "$lib/paraglide/messages.js";
  import GradientButton from "$ui/shared/gradient-button.svelte";
  import GradientText from "$ui/shared/gradient-text.svelte";
  import Text from "$ui/shared/text.svelte";
</script>

<section id="citizens" class="px-8 py-20">
  <div
    class="
      relative mx-auto min-h-[784px] max-w-[1376px] overflow-hidden rounded-3xl
    "
  >
    <enhanced:img
      src="$lib/assets/citizens-illustration.png"
      alt=""
      sizes="min(1376px, 100vw)"
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
        <Text size="base" weight="bold">
          <GradientText>{m.citizens_label()}</GradientText>
        </Text>
        <Text size="xl">
          <GradientText>{m.citizens_description()}</GradientText>
        </Text>
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
        <enhanced:img
          src="$lib/assets/screenshot-citizens.png"
          alt="Phone mockup showing the citizen dialogue feed"
          sizes="350px"
          class="w-[350px]"
        />
      </div>
    </div>
  </div>
</section>
