<script lang="ts">
  import * as m from "$lib/paraglide/messages.js";

  const partners = [
    {
      src: "/images/partners/villededemain.png",
      alt: "Ville de Demain",
      href: "https://www.ville-demain.com/",
    },
    {
      src: "/images/partners/eu.png",
      alt: "European Union",
      href: "https://research-and-innovation.ec.europa.eu/funding/funding-opportunities/funding-programmes-and-open-calls/horizon-europe_en",
    },
    {
      src: "/images/partners/save-my-identity.png",
      alt: "Save My Identity",
      href: "https://savemyidentity.org/",
    },
    {
      src: "/images/partners/rarimo.png",
      alt: "Rarimo",
      href: "https://rarimo.com/",
    },
    {
      src: "/images/partners/blockchain-for-human-rights.png",
      alt: "Blockchain for Human Rights",
      href: "https://bchain4hr.com/",
    },
    { src: "/images/partners/ngi.png", alt: "NGI", href: "https://ngi.eu/" },
    {
      src: "/images/partners/france2030.png",
      alt: "France 2030",
      href: "https://www.info.gouv.fr/grand-dossier/france-2030",
    },
    {
      src: "/images/partners/ft_blanc.png",
      alt: "French Tech",
      href: "https://www.frenchtech-grandparis.com/",
    },
    {
      src: "/images/partners/stationf.png",
      alt: "Station F",
      href: "https://stationf.co/",
    },
    {
      src: "/images/partners/bpifrance.png",
      alt: "Bpifrance",
      href: "https://www.bpifrance.fr/",
    },
    {
      src: "/images/partners/unesco.png",
      alt: "UNESCO",
      href: "https://www.unesco.org/",
    },
    {
      src: "/images/partners/gcc.png",
      alt: "GCC",
      href: "https://www.gccofficial.org/",
    },
    {
      src: "/images/partners/devconnect.jpg",
      alt: "Devconnect",
      href: "https://devconnect.org/",
    },
  ];
</script>

<section class="w-full overflow-hidden px-6 py-12">
  <p class="mb-8 text-center text-sm font-medium text-text-muted">
    {m.partners_intro()}
  </p>

  <div class="relative">
    <div
      class="
        flex w-max animate-[marquee-scroll_20s_linear_infinite] items-center
        gap-8
        sm:gap-12
      "
    >
      {#each partners as partner (partner.src)}
        <a
          href={partner.href}
          target="_blank"
          rel="external noopener noreferrer"
        >
          <img
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
      {#each partners as partner (`dup-${partner.src}`)}
        <a
          href={partner.href}
          target="_blank"
          rel="external noopener noreferrer"
        >
          <img
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
