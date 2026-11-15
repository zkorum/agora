<script lang="ts">
  import businessIllustration from "#lib/assets/landing/use-cases/businesses.svg";
  import civicIllustration from "#lib/assets/landing/use-cases/civic-participation.svg";
  import eventsIllustration from "#lib/assets/landing/use-cases/events-conferences.svg";
  import web3Illustration from "#lib/assets/landing/use-cases/web3-dao.svg";
  import * as m from "#lib/paraglide/messages.js";
  import Chip from "$ui/shared/chip.svelte";
  import GradientText from "$ui/shared/gradient-text.svelte";
  import Text from "$ui/shared/text.svelte";

  const useCases = [
    {
      chip: () => m.usecases_public_consultation_chip(),
      tagline: () => m.usecases_public_consultation_tagline(),
      examples: () => m.usecases_public_consultation_examples(),
      image: civicIllustration,
    },
    {
      chip: () => m.usecases_events_chip(),
      tagline: () => m.usecases_events_tagline(),
      examples: () => m.usecases_events_examples(),
      image: eventsIllustration,
    },
    {
      chip: () => m.usecases_web3_chip(),
      tagline: () => m.usecases_web3_tagline(),
      examples: () => m.usecases_web3_examples(),
      image: web3Illustration,
    },
    {
      chip: () => m.usecases_businesses_chip(),
      tagline: () => m.usecases_businesses_tagline(),
      examples: () => m.usecases_businesses_examples(),
      image: businessIllustration,
    },
  ];
</script>

<section id="usecases" class="px-8 py-20">
  <div class="mx-auto max-w-[1120px]">
    <Text size="base" weight="bold" class="mb-8">
      <GradientText>{m.usecases_label()}</GradientText>
    </Text>

    <div
      class="
        grid grid-cols-1 justify-items-center gap-x-5 gap-y-10
        xl:grid-cols-2 xl:justify-items-start
      "
    >
      {#each useCases as useCase (useCase.image)}
        <div
          class="
            flex w-full max-w-[560px] flex-col items-center gap-4
            sm:flex-row sm:items-start sm:gap-6
          "
        >
          <div
            class="
              size-[160px] shrink-0 overflow-hidden rounded-2xl
              bg-linear-[115deg] from-gradient-light-purple from-46%
              to-gradient-light-blue
              sm:size-[192px]
            "
          >
            <img
              src={useCase.image}
              alt=""
              aria-hidden="true"
              width="192"
              height="192"
              loading="lazy"
              class="size-full"
            />
          </div>
          <div
            class="
              flex min-w-0 flex-col gap-[6px] self-stretch
              sm:pt-6
              xl:min-w-[323px]
            "
          >
            <Chip
              class="
                self-center
                sm:self-start
              ">{useCase.chip()}</Chip
            >
            <Text size="base" weight="semibold">
              {useCase.tagline()}
            </Text>
            <ul
              class="
                list-disc pl-6 text-base tracking-base text-secondary-foreground
              "
            >
              {#each useCase.examples().split("|") as example, j (j)}
                <li>{example}</li>
              {/each}
            </ul>
          </div>
        </div>
      {/each}
    </div>
  </div>
</section>
