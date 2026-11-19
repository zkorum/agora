<script module lang="ts">
  import * as m from "$lib/paraglide/messages.js";
  import { localizeHref } from "$lib/paraglide/runtime";
  import GradientButton from "$ui/shared/gradient-button.svelte";
  import GradientText from "$ui/shared/gradient-text.svelte";
  import Text from "$ui/shared/text.svelte";

  const caseStudies = [
    {
      slug: "bloquonstout",
      title: m.casestudy_bloquonstout_title,
      date: m.casestudy_date_september_2025,
      month: "2025-09",
    },
    {
      slug: "ai-charter-workshop",
      title: m.casestudy_ai_charter_title,
      date: m.casestudy_date_september_2026,
      month: "2026-09",
    },
    {
      slug: "unesco-mil-alliance",
      title: m.casestudy_unesco_mil_title,
      date: m.casestudy_date_october_2025,
      month: "2025-10",
    },
  ];
</script>

<section
  id="resources"
  class="
    px-4 py-20
    sm:px-8
  "
>
  <div class="mx-auto max-w-[1120px]">
    <Text element="h2" size="base" weight="bold" class="mb-8 text-center">
      <GradientText>{m.casestudies_label()}</GradientText>
    </Text>

    <div
      class="
        mb-8 grid grid-cols-1 gap-8
        md:grid-cols-3
      "
    >
      {#each caseStudies as { slug, title, date, month } (slug)}
        <a
          href={localizeHref(`/resources/${slug}`)}
          class="
            group relative flex aspect-544/305 flex-col justify-end
            overflow-hidden rounded-2xl bg-black p-5
            focus-visible:outline-2 focus-visible:outline-offset-4
            focus-visible:outline-primary-base
            lg:p-8
          "
        >
          {#if slug === "bloquonstout"}
            <enhanced:img
              src="$lib/assets/casestudy-bloquonstout.png"
              alt=""
              loading="lazy"
              sizes="(min-width: 768px) min(352px, (100vw - 8rem) / 3), (min-width: 640px) calc(100vw - 4rem), calc(100vw - 2rem)"
              class="
                absolute inset-0 size-full object-cover
                motion-safe:transition-transform motion-safe:duration-300
                motion-safe:group-hover:scale-105
              "
            />
          {:else if slug === "ai-charter-workshop"}
            <enhanced:img
              src="/static/images/resources/ai-charter-workshop.webp"
              alt=""
              loading="lazy"
              sizes="(min-width: 768px) min(352px, (100vw - 8rem) / 3), (min-width: 640px) calc(100vw - 4rem), calc(100vw - 2rem)"
              class="
                absolute inset-0 size-full object-cover saturate-60
                motion-safe:transition-transform motion-safe:duration-300
                motion-safe:group-hover:scale-105
              "
            />
            <div
              class="absolute inset-0 bg-brand-purple/15 mix-blend-color"
            ></div>
          {:else if slug === "unesco-mil-alliance"}
            <enhanced:img
              src="$lib/assets/casestudy-unesco-mil.jpeg"
              alt=""
              loading="lazy"
              sizes="(min-width: 768px) min(352px, (100vw - 8rem) / 3), (min-width: 640px) calc(100vw - 4rem), calc(100vw - 2rem)"
              class="
                absolute inset-0 size-full object-cover
                motion-safe:transition-transform motion-safe:duration-300
                motion-safe:group-hover:scale-105
              "
            />
          {/if}
          <div
            class="
              absolute inset-0 bg-linear-to-b from-black/55 to-overlay-dark
            "
          ></div>
          <div class="relative z-10 flex flex-col gap-2 drop-shadow-lg">
            <Text
              size="xl"
              weight="semibold"
              element="h3"
              class="wrap-break-word text-white"
            >
              {title()}
            </Text>
            <div class="flex items-center justify-between gap-2">
              <Text size="base" element="span" class="text-white">
                <time datetime={month}>{date()}</time>
              </Text>
              <span
                class="
                  icon-[lucide--circle-arrow-right] size-6 shrink-0 text-white
                  rtl:rotate-180
                "
                aria-hidden="true"
              ></span>
            </div>
          </div>
        </a>
      {/each}
    </div>

    <div class="flex justify-center">
      <GradientButton href={localizeHref("/resources")} variant="primary">
        {m.casestudies_cta()}
      </GradientButton>
    </div>
  </div>
</section>
