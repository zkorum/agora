<script lang="ts">
  import * as m from "$lib/paraglide/messages.js";
  import { localizeHref } from "$lib/paraglide/runtime";
  import GradientText from "$ui/shared/gradient-text.svelte";
  import SocialIcons from "$ui/shared/social-icons.svelte";
</script>

<footer
  class="
    px-4 pb-8
    sm:px-8
  "
>
  <div
    class="relative mx-auto max-w-[1376px] overflow-hidden rounded-3xl"
    style="min-height: 236px;"
  >
    <img
      src="/images/hero-bg-base.png"
      alt=""
      class="absolute inset-0 size-full rounded-3xl object-cover"
    />
    <div
      class="
        absolute top-0 left-0 h-[1159px] w-[1739px] scale-y-[-1] rotate-180
      "
    >
      <img
        src="/images/hero-overlay.png"
        alt=""
        class="size-full object-cover"
      />
    </div>
    <div
      class="
        relative z-10 flex flex-col p-4
        sm:p-8
      "
    >
      <!-- Logo -->
      <a href={localizeHref("/")} class="flex shrink-0 items-center gap-3">
        <img src="/images/agora-icon.svg" alt="" class="h-[29px] w-auto" />
        <img src="/images/agora-text.svg" alt="Agora" class="h-[25px] w-auto" />
      </a>

      <!-- Social icons -->
      <div class="mt-[30px]">
        <SocialIcons />
      </div>

      <!-- Copyright -->
      <p
        class="
          mt-4 text-sm leading-[1.3] font-medium tracking-[-0.16px]
          text-text-dark
          sm:text-base
        "
      >
        {m.footer_copyright()}
      </p>

      <!-- Legal Notice -->
      <a
        href="https://www.agoracitizen.app/legal/terms/"
        target="_blank"
        rel="noopener noreferrer"
        class="
          mt-2 text-sm leading-[1.3] font-medium tracking-[-0.16px] underline
          sm:text-base
        "
      >
        <GradientText angle={82}>{m.footer_legal()}</GradientText>
      </a>

      <!-- EU Funding Acknowledgement -->
      <p
        class="
          mt-4 max-w-md text-[10px]/relaxed text-text-muted
          sm:text-xs/relaxed
        "
      >
        {m.footer_eu_funding_1()}
        <a
          href="https://trustchain.ngi.eu/"
          target="_blank"
          rel="noopener noreferrer"
          class="underline"
        >
          NGI TRUSTCHAIN
        </a>
        {m.footer_eu_funding_2()}
        <a
          href="https://ngisargasso.eu/"
          target="_blank"
          rel="noopener noreferrer"
          class="underline"
        >
          NGI SARGASSO
        </a>
        {m.footer_eu_funding_3()}
      </p>
    </div>
  </div>
</footer>
