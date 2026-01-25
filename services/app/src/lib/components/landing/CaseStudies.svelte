<script lang="ts">
  import GradientText from "$lib/components/shared/GradientText.svelte";
  import * as m from "$lib/paraglide/messages.js";
  import { localizeHref } from "$lib/paraglide/runtime";
</script>

<section
  id="casestudies"
  class="
    px-4 py-20
    sm:px-8
  "
>
  <div class="mx-auto max-w-[1120px]">
    <p class="mb-8 text-center text-base font-bold tracking-[-0.16px]">
      <GradientText>{m.casestudies_label()}</GradientText>
    </p>

    <div
      class="
        mb-8 flex flex-col gap-8
        md:flex-row
      "
    >
      <a
        href={localizeHref("/blog/bloquonstout")}
        class="
          group relative flex flex-1 flex-col justify-end overflow-hidden
          rounded-2xl p-8
        "
        style="aspect-ratio: 544/305;"
      >
        <img
          src="/images/casestudy-bloquonstout.png"
          alt=""
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
          <h3
            class="
              text-xl leading-[1.2] font-semibold tracking-[-0.24px] text-white
              sm:text-2xl sm:leading-[1.1]
            "
          >
            {m.casestudy_bloquonstout_title()}
          </h3>
          <div class="flex items-center justify-between">
            <p class="text-base leading-[1.4] tracking-[-0.16px] text-white">
              September 2025
            </p>
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
          group relative flex flex-1 flex-col justify-end overflow-hidden
          rounded-2xl p-8
        "
        style="aspect-ratio: 544/305;"
      >
        <img
          src="/images/casestudy-tech4nature.png"
          alt=""
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
          <h3
            class="
              text-xl leading-[1.2] font-semibold tracking-[-0.24px] text-white
              sm:text-2xl sm:leading-[1.1]
            "
          >
            {m.casestudy_tech4nature_title()}
          </h3>
          <div class="flex items-center justify-between">
            <p class="text-base leading-[1.4] tracking-[-0.16px] text-white">
              September 2025
            </p>
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
      <a
        href={localizeHref("/blog")}
        class="
          inline-flex h-10 items-center rounded-button bg-linear-to-b
          from-brand-purple to-brand-blue px-4 py-3 text-base font-medium
          tracking-[-0.16px] text-white
        "
      >
        {m.casestudies_cta()}
      </a>
    </div>
  </div>
</section>
