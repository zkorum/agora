<script lang="ts">
  import GradientButton from "$lib/components/shared/GradientButton.svelte";
  import GradientText from "$lib/components/shared/GradientText.svelte";
  import * as m from "$lib/paraglide/messages.js";

  const features = [
    {
      img: "/images/screenshot-polis.png",
      chip: () => m.facilitators_chip_polis(),
      text: () => m.facilitators_feature_polis(),
      source: () => m.facilitators_feature_polis_source(),
    },
    {
      img: "/images/screenshot-sensemaker.png",
      chip: () => m.facilitators_chip_sensemaker(),
      text: () => m.facilitators_feature_sensemaker(),
      source: () => m.facilitators_feature_sensemaker_source(),
    },
    {
      img: "/images/screenshot-auth.png",
      chip: () => m.facilitators_chip_auth(),
      text: () => m.facilitators_feature_auth(),
      source: null,
    },
    {
      img: "/images/screenshot-demographics.png",
      chip: () => m.facilitators_chip_demographics(),
      text: () => m.facilitators_feature_demographics(),
      source: null,
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
          mt-2 text-base leading-[1.4] tracking-[-0.16px] text-text-secondary
        "
      >
        {m.facilitators_description()}
      </p>
    </div>

    <div
      class="
        mb-8 flex flex-col gap-[13px]
        md:flex-row
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
              text-base leading-[1.4] tracking-[-0.16px] text-text-secondary
            "
          >
            {feature.text()}{#if feature.source}<GradientText angle={81}
                >{feature.source()}</GradientText
              >{/if}
          </p>
        </div>
      {/each}
    </div>

    <div class="flex justify-end">
      <GradientButton
        href="https://www.agoracitizen.app/conversation/new/create"
        variant="primary"
      >
        {m.facilitators_cta()}
      </GradientButton>
    </div>
  </div>
</section>
