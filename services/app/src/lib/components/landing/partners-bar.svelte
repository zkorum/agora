<script lang="ts">
  import imgBlockchainHR from "$lib/assets/partners/blockchain-for-human-rights.png?enhanced";
  import imgBpifrance from "$lib/assets/partners/bpifrance.png?enhanced";
  import imgDevconnect from "$lib/assets/partners/devconnect.jpg?enhanced";
  import imgEu from "$lib/assets/partners/eu.png?enhanced";
  import imgFrance2030 from "$lib/assets/partners/france2030.png?enhanced";
  import imgFrenchTech from "$lib/assets/partners/ft_blanc.png?enhanced";
  import imgGcc from "$lib/assets/partners/gcc.png?enhanced";
  import imgNgi from "$lib/assets/partners/ngi.png?enhanced";
  import imgRarimo from "$lib/assets/partners/rarimo.png?enhanced";
  import imgSaveMyIdentity from "$lib/assets/partners/save-my-identity.png?enhanced";
  import imgStationf from "$lib/assets/partners/stationf.png?enhanced";
  import imgTechSocialCohesion from "$lib/assets/partners/techandsocialcohesion.png?enhanced";
  import imgUnesco from "$lib/assets/partners/unesco.png?enhanced";
  import imgVillededemain from "$lib/assets/partners/villededemain.png?enhanced";
  import * as m from "$lib/paraglide/messages.js";
  import Text from "$ui/shared/text.svelte";

  const partners = [
    {
      src: imgVillededemain,
      alt: "Ville de Demain",
      href: "https://www.ville-demain.com/",
    },
    {
      src: imgEu,
      alt: "European Union",
      href: "https://research-and-innovation.ec.europa.eu/funding/funding-opportunities/funding-programmes-and-open-calls/horizon-europe_en",
    },
    {
      src: imgSaveMyIdentity,
      alt: "Save My Identity",
      href: "https://savemyidentity.org/",
    },
    {
      src: imgRarimo,
      alt: "Rarimo",
      href: "https://rarimo.com/",
    },
    {
      src: imgBlockchainHR,
      alt: "Blockchain for Human Rights",
      href: "https://bchain4hr.com/",
    },
    { src: imgNgi, alt: "NGI", href: "https://ngi.eu/" },
    {
      src: imgFrance2030,
      alt: "France 2030",
      href: "https://www.info.gouv.fr/grand-dossier/france-2030",
    },
    {
      src: imgFrenchTech,
      alt: "French Tech",
      href: "https://www.frenchtech-grandparis.com/",
    },
    {
      src: imgStationf,
      alt: "Station F",
      href: "https://stationf.co/",
    },
    {
      src: imgBpifrance,
      alt: "Bpifrance",
      href: "https://www.bpifrance.fr/",
    },
    {
      src: imgUnesco,
      alt: "UNESCO",
      href: "https://www.unesco.org/",
    },
    {
      src: imgGcc,
      alt: "GCC",
      href: "https://www.gccofficial.org/",
    },
    {
      src: imgDevconnect,
      alt: "Devconnect",
      href: "https://devconnect.org/",
    },
    {
      src: imgTechSocialCohesion,
      alt: "Council on Technology and Social Cohesion",
      href: "https://www.techandsocialcohesion.org/",
    },
  ];
</script>

<section class="w-full overflow-hidden px-6 py-12">
  <Text size="sm" class="mb-8 text-center text-muted-foreground">
    {m.partners_intro()}
  </Text>

  <div class="relative mask-content-fade">
    <div
      class="
        flex w-max animate-[marquee-scroll_20s_linear_infinite] items-center
        gap-8
        sm:gap-12
      "
    >
      {#each partners as partner (partner.alt)}
        <a
          href={partner.href}
          target="_blank"
          rel="external noopener noreferrer"
          aria-label={partner.alt}
        >
          <enhanced:img
            src={partner.src}
            alt={partner.alt}
            class="
              h-12 w-auto object-contain opacity-70 grayscale transition-all
              hover:opacity-100 hover:grayscale-0
              sm:h-10
            "
          />
        </a>
      {/each}
      {#each partners as partner (`dup-${partner.alt}`)}
        <a
          href={partner.href}
          target="_blank"
          rel="external noopener noreferrer"
          aria-label={partner.alt}
        >
          <enhanced:img
            src={partner.src}
            alt={partner.alt}
            class="
              h-12 w-auto object-contain opacity-70 grayscale transition-all
              hover:opacity-100 hover:grayscale-0
              sm:h-10
            "
          />
        </a>
      {/each}
    </div>
  </div>
</section>
