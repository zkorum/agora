<script lang="ts">
  import * as m from "$lib/paraglide/messages.js";
  import GradientButton from "$ui/shared/gradient-button.svelte";
  import GradientText from "$ui/shared/gradient-text.svelte";

  const features = [
    {
      img: "/images/screenshot-polis.png",
      chip: () => m.facilitators_chip_polis(),
      text: () => m.facilitators_feature_polis(),
      source: () => m.facilitators_feature_polis_source(),
      sourceUrl: "https://pol.is/",
    },
    {
      img: "/images/screenshot-sensemaker.png",
      chip: () => m.facilitators_chip_sensemaker(),
      text: () => m.facilitators_feature_sensemaker(),
      source: () => m.facilitators_feature_sensemaker_source(),
      sourceUrl: "https://jigsaw-code.github.io/sensemaking-tools/",
    },
    {
      img: "/images/screenshot-auth.png",
      chip: () => m.facilitators_chip_auth(),
      text: () => m.facilitators_feature_auth(),
      source: null,
      sourceUrl: null,
    },
    {
      img: "/images/screenshot-demographics.png",
      chip: () => m.facilitators_chip_demographics(),
      text: () => m.facilitators_feature_demographics(),
      source: null,
      sourceUrl: null,
    },
  ];
</script>

<section id="facilitators" class="px-8 py-20">
  <div class="mx-auto max-w-[1120px]">
    <div class="mb-8 max-w-[492px]">
      <p class="text-base leading-[1.3] font-bold tracking-[-0.16px]">
        <GradientText angle={81}>{m.facilitators_label()}</GradientText>
      </p>
      <p
        class="
          mt-2 text-2xl leading-[1.3] tracking-[-0.24px] text-text-primary
        "
      >
        {m.facilitators_description()}
      </p>
    </div>

    <div
      class="
        mb-8 flex flex-col items-center gap-[13px]
        md:flex-row md:items-start
      "
    >
      {#each features as feature (feature.img)}
        <div class="flex w-[270px] flex-col gap-[10px]">
          <div
            class="
              flex h-[250px] items-center justify-center overflow-hidden
              bg-[linear-gradient(117deg,var(--color-gradient-light-purple)_46%,var(--color-gradient-light-blue)_100%)]
            "
          >
            <img src={feature.img} alt="" class="size-full object-cover" />
          </div>
          <span
            class="
              inline-flex w-fit items-center rounded-chip px-2 py-[7px]
              text-base/4 tracking-[-0.16px]
            "
          >
            <GradientText angle={154}>{feature.chip()}</GradientText>
          </span>
          <p
            class="
              pl-2 text-base leading-[1.4] tracking-[-0.16px]
              text-text-secondary
            "
          >
            {feature.text()}{#if feature.source}{#if feature.sourceUrl}<a
                  href={feature.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="hover:underline"
                  ><GradientText angle={81}>{feature.source()}</GradientText></a
                >{:else}<GradientText angle={81}
                  >{feature.source()}</GradientText
                >{/if}{/if}
          </p>
        </div>
      {/each}
    </div>

    <div
      class="
        flex justify-center
        md:justify-end
      "
    >
      <GradientButton
        href="https://www.agoracitizen.app/conversation/new/create"
        variant="primary"
      >
        {m.facilitators_cta()}
      </GradientButton>
    </div>
  </div>
</section>
