<script lang="ts">
  import GradientText from "$lib/components/shared/GradientText.svelte";
  import * as m from "$lib/paraglide/messages.js";

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

<section id="testimonials" class="px-8 py-20">
  <div
    class="
      relative mx-auto max-w-[1376px] overflow-hidden rounded-3xl bg-white
    "
  >
    <div
      class="
        pointer-events-none absolute -top-[40px] -left-[148px] h-[1150px]
        w-[1484px] overflow-hidden opacity-60
      "
    >
      <img
        alt=""
        class="absolute top-[-0.04%] left-0 h-[100.08%] w-[105.25%] max-w-none"
        src="/images/testimonials-bg-new.png"
      />
    </div>
    <div class="relative z-10 flex flex-col gap-6 p-12">
      <p class="mb-4 text-center text-base font-bold tracking-[-0.16px]">
        <GradientText>{m.testimonials_label()}</GradientText>
      </p>

      <!-- Top row: 3 cards -->
      <div
        class="
          grid grid-cols-1 gap-6
          md:grid-cols-3
        "
      >
        {#each topRow as testimonial (testimonial.name)}
          <div
            class="flex flex-col gap-4 rounded-2xl bg-white p-10 shadow-card"
          >
            <p class="text-lg/6 font-medium tracking-[-0.18px]">
              <GradientText>"{testimonial.quote()}"</GradientText>
            </p>
            <div class="flex flex-col">
              <p class="text-base leading-[1.3] font-bold tracking-[-0.16px]">
                <GradientText>{testimonial.name()}</GradientText>
              </p>
              <p
                class="
                  text-base leading-[1.4] font-normal tracking-[-0.16px]
                  text-text-secondary
                "
              >
                {testimonial.org()}
              </p>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</section>
