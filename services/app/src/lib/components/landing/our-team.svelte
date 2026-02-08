<script lang="ts">
  import photoGeorge from "$lib/assets/team/george.png?enhanced";
  import photoNicolas from "$lib/assets/team/nicolas.png?enhanced";
  import photoYuting from "$lib/assets/team/yuting.png?enhanced";
  import * as m from "$lib/paraglide/messages.js";
  import GradientArrow from "$ui/shared/gradient-arrow.svelte";
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
    {
      id: "george",
      photo: photoGeorge,
      name: () => m.team_george_name(),
      role: () => m.team_george_role(),
      profileUrl: "https://www.georgecharnley.com/",
    },
  ];
</script>

<section id="team" class="px-8 py-20">
  <div class="mx-auto max-w-[1120px]">
    <Text size="base" weight="bold" class="mb-12 text-center">
      <GradientText>{m.team_label()}</GradientText>
    </Text>

    <div
      class="
        flex flex-col items-center justify-center gap-12
        md:flex-row md:items-start
      "
    >
      {#each members as member, index (member.id)}
        <div class="flex w-[320px] flex-col">
          <div class="relative">
            <enhanced:img
              src={member.photo}
              alt={member.name()}
              sizes="320px"
              class="size-[320px] rounded-2xl object-cover"
            />
            <div
              class="
                pointer-events-none absolute inset-0 rounded-2xl bg-[#2d226c]
                mix-blend-screen
              "
            ></div>
          </div>
          <div class="mt-6 px-6">
            <Text size="lg" weight="medium" element="h3">
              <GradientLink href={member.profileUrl}
                >{member.name()}</GradientLink
              >
            </Text>
            <Text size="base" class="mt-1 text-secondary-foreground">
              {member.role()}
            </Text>
          </div>
          {#if index === 0}
            <div
              class="
                mt-16 hidden justify-center
                md:flex
              "
            >
              <GradientArrow />
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</section>
