<script module lang="ts">
  import * as m from "#lib/paraglide/messages.js";
  import GradientButton from "$ui/shared/gradient-button.svelte";
  import GradientText from "$ui/shared/gradient-text.svelte";
  import Text from "$ui/shared/text.svelte";

  // This illustration reproduces a snapshot of an English-language conversation.
  const conversationStats = { statements: 23, votes: 608, participants: 34 };

  const exampleStatements = [
    {
      text: "In a desirable future, we can continue to strongly disagree on what a desirable future is.",
      source: "Participant",
    },
    {
      text: "Clean rivers and air for future generations should come before economic growth.",
      source: "Seed statement",
    },
    {
      text: "A good future requires moving beyond capitalism.",
      source: "Seed statement",
    },
  ];
</script>

<section id="citizens" class="px-8 py-20">
  <div
    class="
      relative mx-auto min-h-[784px] max-w-[1376px] overflow-hidden rounded-3xl
    "
  >
    <enhanced:img
      src="#lib/assets/citizens-illustration.png"
      alt=""
      loading="lazy"
      sizes="min(1376px, 100vw)"
      class="absolute inset-0 size-full rounded-3xl object-cover"
    />
    <div
      class="
        relative z-10 grid grid-cols-1 items-center gap-12 px-6 py-12
        sm:px-12 sm:py-16
        md:grid-cols-2 md:px-20 md:py-24
      "
    >
      <div class="flex flex-col gap-2">
        <Text element="h2" size="base" weight="bold">
          <GradientText>{m.citizens_label()}</GradientText>
        </Text>
        <Text size="xl">
          <GradientText>{m.citizens_description()}</GradientText>
        </Text>
        <div
          class="
            mt-6 flex justify-center
            md:justify-start
          "
        >
          <GradientButton
            href="https://www.agoracitizen.app/"
            variant="primary"
          >
            {m.citizens_cta()}
          </GradientButton>
        </div>
      </div>

      <div class="flex justify-center">
        <div
          role="img"
          aria-label={m.citizens_phone_alt()}
          class="w-full max-w-[300px] rounded-4xl bg-[#161620] p-2 shadow-xl"
        >
          <div
            aria-hidden="true"
            lang="en"
            dir="ltr"
            class="
              @container overflow-hidden rounded-3xl bg-sky-lightest
              text-ink-darkest
            "
          >
            <div class="border-b border-sky-lighter px-4 py-3">
              <p class="text-[15px] leading-[1.3] font-medium text-pretty">
                Futures we love, futures we fear
              </p>
            </div>

            <div
              class="
                mx-2.5 mt-1.5 flex items-center justify-between gap-x-1 border-b
                border-sky-lighter text-[10px] font-medium text-ink-light
                tabular-nums
              "
            >
              <div class="flex items-center gap-1.5">
                <span
                  class="
                    inline-flex items-center gap-0.5 border-b-2
                    border-primary-base px-0.5 pt-2 pb-1.5 font-semibold
                    text-primary-base
                  "
                >
                  <span class="icon-[lucide--message-circle] size-3 shrink-0"
                  ></span>
                  {conversationStats.statements}
                </span>
                <span class="inline-flex items-center gap-0.5">
                  <span class="icon-[lucide--chart-pie] size-3 shrink-0"></span>
                  Analysis
                </span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="inline-flex items-center gap-0.5">
                  <span class="icon-[lucide--vote] size-3 shrink-0"></span>
                  {conversationStats.votes}
                </span>
                <span class="inline-flex items-center gap-0.5">
                  <span class="icon-[lucide--users] size-3 shrink-0"></span>
                  {conversationStats.participants}
                </span>
                <span
                  class="
                    hidden items-center gap-0.5
                    @min-[230px]:inline-flex
                  "
                >
                  <span class="icon-[lucide--forward] size-3 shrink-0"></span>
                  Share
                </span>
              </div>
            </div>

            <div
              class="
                mx-2.5 flex items-center justify-end gap-1 px-1 py-2.5
                text-[10px] font-medium text-primary-base
              "
            >
              New
              <span class="icon-[lucide--chevron-down] size-3"></span>
            </div>

            <div class="space-y-2.5 px-2.5 pb-3">
              {#each exampleStatements as { text, source } (text)}
                <div class="rounded-2xl bg-white p-3">
                  <div class="flex items-center justify-between text-ink-light">
                    <p class="text-[11px] font-medium">{source}</p>
                    <span class="icon-[lucide--ellipsis] size-3.5"></span>
                  </div>
                  <p class="mt-1.5 text-[13px] leading-snug">{text}</p>
                  <div
                    class="
                      mt-2.5 grid grid-cols-3 gap-1.5 text-center text-[10px]
                      font-medium
                    "
                  >
                    <span
                      class="
                        rounded-xl bg-linear-to-r from-[#ffefd7] to-[#fff9d7]
                        px-0.5 py-1.5 text-[#a05e03]
                      ">Disagree</span
                    >
                    <span
                      class="
                        rounded-xl bg-sky-lightest px-0.5 py-1.5 text-ink-light
                      ">Unsure</span
                    >
                    <span
                      class="
                        rounded-xl bg-linear-to-r from-[#f1eeff] to-[#e8f1ff]
                        px-0.5 py-1.5 text-primary-base
                      ">Agree</span
                    >
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
