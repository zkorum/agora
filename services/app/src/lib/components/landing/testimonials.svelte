<script lang="ts">
  import * as m from "$lib/paraglide/messages.js";
  import GradientText from "$ui/shared/gradient-text.svelte";
  import Text from "$ui/shared/text.svelte";

  const topRow = [
    {
      quote: () => m.testimonial_emily_quote(),
      name: () => m.testimonial_emily_name(),
      org: () => m.testimonial_emily_org(),
    },
    {
      quote: () => m.testimonial_nicholas_quote(),
      name: () => m.testimonial_nicholas_name(),
      org: () => m.testimonial_nicholas_org(),
    },
    {
      quote: () => m.testimonial_jeanlou_quote(),
      name: () => m.testimonial_jeanlou_name(),
      org: () => m.testimonial_jeanlou_org(),
    },
  ];
</script>

<section
  id="testimonials"
  class="
    px-4 py-20
    sm:px-8
  "
>
  <div class="mx-auto max-w-[1376px]">
    <Text size="base" weight="bold" class="mb-8 text-center">
      <GradientText>{m.testimonials_label()}</GradientText>
    </Text>

    <div class="relative overflow-hidden rounded-3xl bg-white">
      <div
        class="
          pointer-events-none absolute -top-10 -left-37 h-[1150px] w-[1484px]
          overflow-hidden opacity-60
        "
      >
        <enhanced:img
          alt=""
          class="
            absolute top-[-0.04%] left-0 h-[100.08%] w-[105.25%] max-w-none
          "
          src="$lib/assets/testimonials-bg-new.png"
        />
      </div>
      <div
        class="
          relative z-10 flex flex-col gap-6 p-6
          sm:p-12
          lg:p-16
          xl:p-[128px]
        "
      >
        <!-- Top row: 3 cards -->
        <div
          class="
            grid grid-cols-1 gap-6
            lg:grid-cols-3
          "
        >
          {#each topRow as testimonial (testimonial.name)}
            <div
              class="
                flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-card
                sm:p-10
              "
            >
              <Text size="lg" weight="medium">
                <GradientText>"{testimonial.quote()}"</GradientText>
              </Text>
              <div class="flex flex-col">
                <Text size="base" weight="bold">
                  <GradientText>{testimonial.name()}</GradientText>
                </Text>
                <Text size="base" class="text-secondary-foreground">
                  {testimonial.org()}
                </Text>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>
</section>
