<script lang="ts">
  import * as m from "$lib/paraglide/messages.js";
  import GradientLink from "$ui/shared/gradient-link.svelte";
  import GradientText from "$ui/shared/gradient-text.svelte";
  import Text from "$ui/shared/text.svelte";

  const contributors: {
    name: string;
    role: () => string;
    profileUrl?: string;
  }[] = [
    {
      name: "George Charnley",
      role: m.contributors_design,
      profileUrl: "https://www.georgecharnley.com/",
    },
    { name: "Puja Ohlhaver", role: m.contributors_advisor },
    { name: "Jean Lou Fourquet", role: m.contributors_partner },
    { name: "Hanaan", role: m.contributors_open_source },
    { name: "Patcon", role: m.contributors_open_source },
    { name: "François Taddei", role: m.contributors_partner },
    { name: "Christophe Gautier", role: m.contributors_partner },
    { name: "Michael Backlund", role: m.contributors_partner },
    { name: "Boris Mann", role: m.contributors_advisor },
  ];
</script>

<section id="contributors" class="scroll-mt-20 px-8 pb-20">
  <div class="mx-auto max-w-3xl">
    <Text element="h2" weight="bold" class="mb-6 text-center">
      <GradientText>{m.contributors_label()}</GradientText>
    </Text>

    <ul
      class="
        grid gap-3
        min-[480px]:grid-cols-2
        md:grid-cols-3
      "
    >
      {#each contributors as contributor (contributor.name)}
        <li class="rounded-xl border border-border px-4 py-3">
          <Text weight="semibold">
            {#if contributor.profileUrl}
              <GradientLink href={contributor.profileUrl}>
                {contributor.name}
              </GradientLink>
            {:else}
              {contributor.name}
            {/if}
          </Text>
          <Text size="sm" class="mt-1 text-secondary-foreground">
            {contributor.role()}
          </Text>
        </li>
      {/each}
    </ul>
  </div>
</section>
