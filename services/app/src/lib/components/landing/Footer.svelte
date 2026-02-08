<script lang="ts">
  import agoraIcon from "$lib/assets/agora-icon.svg";
  import agoraText from "$lib/assets/agora-text.svg";
  import * as m from "$lib/paraglide/messages.js";
  import { localizeHref } from "$lib/paraglide/runtime";
  import GradientLink from "$ui/shared/gradient-link.svelte";
  import SocialIcons from "$ui/shared/social-icons.svelte";
  import Text from "$ui/shared/text.svelte";
</script>

<footer
  class="
    px-4 pb-8
    sm:px-8
  "
>
  <div
    class="
      relative mx-auto min-h-[236px] max-w-[1376px] overflow-hidden rounded-3xl
    "
  >
    <enhanced:img
      src="$lib/assets/hero-bg-base.png"
      alt=""
      sizes="min(1376px, 100vw)"
      class="absolute inset-0 size-full rounded-3xl object-cover"
    />
    <div
      class="
        absolute top-0 left-0 h-[1159px] w-[1739px] scale-y-[-1] rotate-180
      "
    >
      <enhanced:img
        src="$lib/assets/hero-overlay.png"
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
        <img src={agoraIcon} alt="" class="h-[29px] w-auto" />
        <img src={agoraText} alt="Agora" class="h-[25px] w-auto" />
      </a>

      <!-- Social icons -->
      <div class="mt-[30px]">
        <SocialIcons />
      </div>

      <!-- Copyright -->
      <Text size="sm" weight="medium" class="mt-4">
        {m.footer_copyright()}
      </Text>

      <!-- Legal Notice -->
      <Text size="sm" weight="medium" element="span" class="mt-2">
        <GradientLink
          href="https://www.agoracitizen.app/legal/terms/"
          underline
        >
          {m.footer_legal()}
        </GradientLink>
      </Text>

      <!-- EU Funding Acknowledgement -->
      <p
        class="
          mt-4 max-w-md text-[10px]/relaxed text-muted-foreground
          sm:text-xs/relaxed
        "
      >
        {m.footer_eu_funding_1()}
        <a
          href="https://trustchain.ngi.eu/"
          target="_blank"
          rel="noopener noreferrer"
          class="
            underline transition-opacity
            hover:opacity-70
          "
        >
          NGI TRUSTCHAIN
        </a>
        {m.footer_eu_funding_2()}
        <a
          href="https://ngisargasso.eu/"
          target="_blank"
          rel="noopener noreferrer"
          class="
            underline transition-opacity
            hover:opacity-70
          "
        >
          NGI SARGASSO
        </a>
        {m.footer_eu_funding_3()}
      </p>
    </div>
  </div>
</footer>
