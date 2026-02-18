<script lang="ts">
  import * as m from "$lib/paraglide/messages.js";
  import { localizeHref } from "$lib/paraglide/runtime";
  import GradientButton from "$ui/shared/gradient-button.svelte";
  import GradientText from "$ui/shared/gradient-text.svelte";
  import Text from "$ui/shared/text.svelte";
</script>

<section
  id="casestudies"
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
        mb-8 flex flex-col gap-8
        md:flex-row
      "
    >
      <a
        href={localizeHref("/blog/bloquonstout")}
        class="
          group relative flex aspect-544/305 flex-1 flex-col justify-end
          overflow-hidden rounded-2xl p-8
        "
      >
        <enhanced:img
          src="$lib/assets/casestudy-bloquonstout.png"
          alt=""
          sizes="(min-width: 768px) 50vw, 100vw"
          class="
            absolute inset-0 size-full object-cover transition-transform
            duration-300
            group-hover:scale-105
          "
        />
        <div
          class="
            absolute inset-0 bg-linear-to-b from-transparent from-50%
            to-overlay-dark
          "
        ></div>
        <div class="relative z-10 flex flex-col gap-2">
          <Text size="xl" weight="semibold" element="h3" class="text-white">
            {m.casestudy_bloquonstout_title()}
          </Text>
          <div class="flex items-center justify-between">
            <Text size="base" element="span" class="text-white">
              September 2025
            </Text>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 256 256"
              fill="white"
            >
              <path
                d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm45.66-93.66a8,8,0,0,1,0,11.32l-32,32a8,8,0,0,1-11.32-11.32L148.69,136H88a8,8,0,0,1,0-16h60.69l-18.35-18.34a8,8,0,0,1,11.32-11.32Z"
              />
            </svg>
          </div>
        </div>
      </a>

      <a
        href={localizeHref("/blog/tech4nature")}
        class="
          group relative flex aspect-544/305 flex-1 flex-col justify-end
          overflow-hidden rounded-2xl p-8
        "
      >
        <enhanced:img
          src="$lib/assets/casestudy-tech4nature.png"
          alt=""
          sizes="(min-width: 768px) 50vw, 100vw"
          class="
            absolute inset-0 size-full object-cover transition-transform
            duration-300
            group-hover:scale-105
          "
        />
        <div
          class="
            absolute inset-0 bg-linear-to-b from-transparent from-50%
            to-overlay-dark
          "
        ></div>
        <div class="relative z-10 flex flex-col gap-2">
          <Text size="xl" weight="semibold" element="h3" class="text-white">
            {m.casestudy_tech4nature_title()}
          </Text>
          <div class="flex items-center justify-between">
            <Text size="base" element="span" class="text-white">
              September 2025
            </Text>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 256 256"
              fill="white"
            >
              <path
                d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm45.66-93.66a8,8,0,0,1,0,11.32l-32,32a8,8,0,0,1-11.32-11.32L148.69,136H88a8,8,0,0,1,0-16h60.69l-18.35-18.34a8,8,0,0,1,11.32-11.32Z"
              />
            </svg>
          </div>
        </div>
      </a>
    </div>

    <div class="flex justify-center">
      <GradientButton href={localizeHref("/blog")} variant="primary">
        {m.casestudies_cta()}
      </GradientButton>
    </div>
  </div>
</section>
