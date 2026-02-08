<script lang="ts">
  import screenshotAuth from "$lib/assets/screenshot-auth.png?enhanced";
  import screenshotDemographics from "$lib/assets/screenshot-demographics.png?enhanced";
  import screenshotPolis from "$lib/assets/screenshot-polis.png?enhanced";
  import screenshotSensemaker from "$lib/assets/screenshot-sensemaker.png?enhanced";
  import * as m from "$lib/paraglide/messages.js";
  import Chip from "$ui/shared/chip.svelte";
  import GradientButton from "$ui/shared/gradient-button.svelte";
  import GradientText from "$ui/shared/gradient-text.svelte";
  import Text from "$ui/shared/text.svelte";

  const features = [
    {
      id: "polis",
      img: screenshotPolis,
      chip: () => m.facilitators_chip_polis(),
      text: () => m.facilitators_feature_polis(),
      source: () => m.facilitators_feature_polis_source(),
      sourceUrl: "https://pol.is/",
    },
    {
      id: "sensemaker",
      img: screenshotSensemaker,
      chip: () => m.facilitators_chip_sensemaker(),
      text: () => m.facilitators_feature_sensemaker(),
      source: () => m.facilitators_feature_sensemaker_source(),
      sourceUrl: "https://jigsaw-code.github.io/sensemaking-tools/",
    },
    {
      id: "auth",
      img: screenshotAuth,
      chip: () => m.facilitators_chip_auth(),
      text: () => m.facilitators_feature_auth(),
      source: null,
      sourceUrl: null,
    },
    {
      id: "demographics",
      img: screenshotDemographics,
      chip: () => m.facilitators_chip_demographics(),
      text: () => m.facilitators_feature_demographics(),
      source: null,
      sourceUrl: null,
    },
  ];
</script>

<section id="facilitators" class="px-8 py-20">
  <div class="mx-auto max-w-[1120px]">
    <div
      class="
        mb-8 flex flex-col
        md:flex-row md:items-end md:justify-between
      "
    >
      <div class="max-w-[492px]">
        <Text size="base" weight="bold">
          <GradientText angle={81}>{m.facilitators_label()}</GradientText>
        </Text>
        <Text size="xl" class="mt-2">
          <GradientText>{m.facilitators_description()}</GradientText>
        </Text>
      </div>
      <div
        class="
          hidden
          md:block
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

    <div
      class="
        mb-8 flex flex-col items-center gap-[13px]
        md:flex-row md:items-start
      "
    >
      {#each features as feature (feature.id)}
        <div class="flex w-[270px] flex-col gap-[10px]">
          <div
            class="
              flex h-[250px] items-center justify-center overflow-hidden
              bg-linear-[117deg] from-gradient-light-purple from-46%
              to-gradient-light-blue
            "
          >
            <enhanced:img
              src={feature.img}
              alt=""
              sizes="270px"
              class="size-full object-cover"
            />
          </div>
          <Chip>{feature.chip()}</Chip>
          <Text size="base" class="pl-2 text-secondary-foreground">
            {feature.text()}{#if feature.source}{#if feature.sourceUrl}<a
                  href={feature.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="hover:underline"
                  ><GradientText angle={81}>{feature.source()}</GradientText></a
                >{:else}<GradientText angle={81}
                  >{feature.source()}</GradientText
                >{/if}{/if}
          </Text>
        </div>
      {/each}
    </div>

    <div
      class="
        flex justify-center
        md:hidden
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
