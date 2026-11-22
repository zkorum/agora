<script lang="ts">
  import photoNicolas from "#lib/assets/team/nicolas.png?enhanced";
  import photoYuting from "#lib/assets/team/yuting.png?enhanced";
  import * as m from "#lib/paraglide/messages.js";
  import GradientLink from "$ui/shared/gradient-link.svelte";
  import GradientText from "$ui/shared/gradient-text.svelte";
  import Text from "$ui/shared/text.svelte";

  const members = [
    {
      id: "yuting",
      photo: photoYuting,
      name: () => m.team_yuting_name(),
      role: () => m.team_yuting_role(),
      profileUrl: "https://www.linkedin.com/in/yuting-jiang-zkorum/",
    },
    {
      id: "nicolas",
      photo: photoNicolas,
      name: () => m.team_nicolas_name(),
      role: () => m.team_nicolas_role(),
      profileUrl: "https://bsky.app/profile/nicobao.dev",
    },
  ];
</script>

<section id="team" class="px-8 py-20">
  <div class="mx-auto max-w-[1120px]">
    <Text element="h2" size="base" weight="bold" class="mb-12 text-center">
      <GradientText>{m.team_label()}</GradientText>
    </Text>

    <div
      class="
        flex flex-col items-center justify-center gap-12
        md:flex-row md:items-start
      "
    >
      {#each members as member (member.id)}
        <div class="flex w-full max-w-80 flex-col">
          <div class="relative">
            <enhanced:img
              src={member.photo}
              alt=""
              loading="lazy"
              class="aspect-square w-full rounded-2xl object-cover"
            />
            <div
              class="
                pointer-events-none absolute inset-0 rounded-2xl
                bg-portrait-tint mix-blend-screen
              "
            ></div>
          </div>
          <div class="mt-6 px-6">
            <Text size="lg" weight="medium" element="h3">
              <GradientLink href={member.profileUrl} underline>
                <bdi>{member.name()}</bdi>
              </GradientLink>
            </Text>
            <Text size="base" class="mt-1 text-secondary-foreground">
              {member.role()}
            </Text>
          </div>
        </div>
      {/each}
    </div>
  </div>
</section>
