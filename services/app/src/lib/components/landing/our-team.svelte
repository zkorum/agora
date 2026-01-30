<script lang="ts">
  import * as m from "$lib/paraglide/messages.js";
  import GradientArrow from "$ui/shared/gradient-arrow.svelte";
  import GradientText from "$ui/shared/gradient-text.svelte";

  const members = [
    {
      photo: "/images/team/yuting.png",
      name: () => m.team_yuting_name(),
      role: () => m.team_yuting_role(),
    },
    {
      photo: "/images/team/nicolas.png",
      name: () => m.team_nicolas_name(),
      role: () => m.team_nicolas_role(),
    },
    {
      photo: "/images/team/george.png",
      name: () => m.team_george_name(),
      role: () => m.team_george_role(),
    },
  ];
</script>

<section id="team" class="px-8 py-20">
  <div class="mx-auto max-w-[1120px]">
    <p class="mb-12 text-center text-base font-bold tracking-[-0.16px]">
      <GradientText>{m.team_label()}</GradientText>
    </p>

    <div
      class="
        flex flex-col items-center justify-center gap-12
        md:flex-row md:items-start
      "
    >
      {#each members as member, index (member.photo)}
        <div class="flex w-[320px] flex-col">
          <div class="relative">
            <img
              src={member.photo}
              alt={member.name()}
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
            <h3 class="text-lg/6 font-medium tracking-tight">
              <GradientText>{member.name()}</GradientText>
            </h3>
            <p
              class="
                mt-1 text-base leading-[1.4] tracking-[-0.16px]
                text-text-secondary
              "
            >
              {member.role()}
            </p>
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
