<script lang="ts">
  import * as m from "$lib/paraglide/messages.js";
  import { localizeHref } from "$lib/paraglide/runtime";
  import GradientButton from "$ui/shared/gradient-button.svelte";
  import GradientText from "$ui/shared/gradient-text.svelte";
  import Text from "$ui/shared/text.svelte";
</script>

<section
  id="resources"
  class="
    px-4 py-20
    sm:px-8
  "
>
  <div class="mx-auto max-w-[1120px]">
    <Text size="base" weight="bold" class="mb-8 text-center">
      <GradientText>{m.casestudies_label()}</GradientText>
    </Text>

    <div
      class="
        mb-8 grid grid-cols-1 gap-8
        md:grid-cols-3
      "
    >
      <a
        href={localizeHref("/resources/bloquonstout")}
        class="
          group relative flex aspect-544/305 flex-col justify-end
          overflow-hidden rounded-2xl p-8
        "
      >
        <enhanced:img
          src="$lib/assets/casestudy-bloquonstout.png"
          alt=""
          loading="lazy"
          sizes="(min-width: 768px) 33vw, 100vw"
          class="
            absolute inset-0 size-full object-cover transition-transform
            duration-300
            group-hover:scale-105
          "
        />
        <div
          class="
            absolute inset-0 bg-linear-to-b from-transparent from-30%
            to-overlay-dark
          "
        ></div>
        <div class="relative z-10 flex flex-col gap-2 drop-shadow-lg">
          <Text size="xl" weight="semibold" element="h3" class="text-white">
            {m.casestudy_bloquonstout_title()}
          </Text>
          <div class="flex items-center justify-between">
            <Text size="base" element="span" class="text-white">
              {m.casestudy_date_september_2025()}
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

      <a
        href={localizeHref("/resources/ai-charter-workshop")}
        class="
          group relative flex aspect-544/305 flex-col justify-end
          overflow-hidden rounded-2xl p-8
        "
      >
        <enhanced:img
          src="/static/images/resources/ai-charter-workshop.webp"
          alt=""
          loading="lazy"
          sizes="(min-width: 768px) 33vw, 100vw"
          class="
            absolute inset-0 size-full object-cover saturate-60
            transition-transform duration-300
            group-hover:scale-105
          "
        />
        <div class="absolute inset-0 bg-brand-purple/15 mix-blend-color"></div>
        <div
          class="
            absolute inset-0 bg-linear-to-b from-black/10 from-0% via-black/45
            via-45% to-black/85
          "
        ></div>
        <div class="relative z-10 flex flex-col gap-2 drop-shadow-lg">
          <Text size="xl" weight="semibold" element="h3" class="text-white">
            {m.casestudy_ai_charter_title()}
          </Text>
          <div class="flex items-center justify-between">
            <Text size="base" element="span" class="text-white">
              {m.casestudy_date_september_2026()}
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

      <a
        href={localizeHref("/resources/unesco-mil-alliance")}
        class="
          group relative flex aspect-544/305 flex-col justify-end
          overflow-hidden rounded-2xl p-8
        "
      >
        <enhanced:img
          src="$lib/assets/casestudy-unesco-mil.jpeg"
          alt=""
          loading="lazy"
          sizes="(min-width: 768px) 33vw, 100vw"
          class="
            absolute inset-0 size-full object-cover transition-transform
            duration-300
            group-hover:scale-105
          "
        />
        <div
          class="
            absolute inset-0 bg-linear-to-b from-black/30 from-0%
            to-overlay-dark
          "
        ></div>
        <div class="relative z-10 flex flex-col gap-2 drop-shadow-lg">
          <Text size="xl" weight="semibold" element="h3" class="text-white">
            {m.casestudy_unesco_mil_title()}
          </Text>
          <div class="flex items-center justify-between">
            <Text size="base" element="span" class="text-white">
              {m.casestudy_date_october_2025()}
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
    </div>

    <div class="flex justify-center">
      <GradientButton href={localizeHref("/resources")} variant="primary">
        {m.casestudies_cta()}
      </GradientButton>
    </div>
  </div>
</section>
