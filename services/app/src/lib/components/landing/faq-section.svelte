<script lang="ts">
  import GradientText from "$ui/shared/gradient-text.svelte";
  import Text from "$ui/shared/text.svelte";

  interface FaqItem {
    question: string;
    answer: string;
    link?: {
      href: string;
      label: string;
    };
  }

  interface FaqGroup {
    title: string;
    items: FaqItem[];
  }

  interface AnswerSegment {
    text: string;
    href?: string;
  }

  const markdownLinkPattern = /\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)]+)\)/g;

  function parseAnswer(answer: string): AnswerSegment[] {
    const segments: AnswerSegment[] = [];
    let lastIndex = 0;

    for (const match of answer.matchAll(markdownLinkPattern)) {
      const [raw, label, href] = match;
      const index = match.index ?? 0;

      if (index > lastIndex) {
        segments.push({ text: answer.slice(lastIndex, index) });
      }

      segments.push({ text: label, href });
      lastIndex = index + raw.length;
    }

    if (lastIndex < answer.length) {
      segments.push({ text: answer.slice(lastIndex) });
    }

    return segments.length > 0 ? segments : [{ text: answer }];
  }

  function isExternalHref(href: string) {
    return href.startsWith("http");
  }

  const faqGroups: FaqGroup[] = [
    {
      title: "Using Agora",
      items: [
        {
          question: "Who is Agora for?",
          answer:
            "Agora is for facilitators, event organizers, civic engagement teams, community managers, companies, DAOs, NGOs, public institutions, and any group that needs to understand people across differences.",
        },
        {
          question:
            "How do I choose between Conversation Mode and Prioritization Mode?",
          answer:
            "Use Conversation Mode when the question is still open and you want to gather perspectives, map disagreement, and find common ground. Use Prioritization Mode when you already have proposals and need a ranked list of what matters most. [Read the Facilitation Guide](/resources/facilitation-guide).",
        },
        {
          question: "Can I use both modes together?",
          answer:
            "Yes. A common process is to start with Conversation Mode, identify strong or bridging proposals, then use Prioritization Mode to turn them into an actionable ranking.",
        },
      ],
    },
    {
      title: "How Consensus Works",
      items: [
        {
          question: "How does Agora find common ground?",
          answer:
            "Participants vote agree, disagree, or unsure on statements. Agora then maps patterns in those votes, not the wording of the statements, to show where people cluster, where they diverge, and which statements receive support across different opinion groups. The opinion mapping is based on machine learning, not LLM, using [Red Dwarf](https://github.com/polis-community/red-dwarf), an open-source reimplementation of the original [Pol.is](https://compdemocracy.org/Polis/).",
        },
        {
          question: "What is the difference between consensus and majority?",
          answer:
            "A majority statement is supported by most participants overall. A consensus statement is supported across opinion groups, so it cannot simply override a smaller group. In Agora, consensus does not mean everyone agrees; it means the statement has legitimacy across the main differences in the room.",
        },
        {
          question: "What are opinion groups and bridging statements?",
          answer:
            "Opinion groups are clusters of participants who vote in similar ways. They are inferred from voting behavior, not from demographics or AI labels. Bridging statements are statements that different groups support, even when those same groups disagree on many other things. This is the Pol.is-inspired part of the algorithm that makes hidden common ground visible.",
        },
        {
          question: "Is AI deciding the results?",
          answer:
            "No. The opinion groups and common-ground signals come from deterministic voting-pattern analysis, not from generative AI. After the opinion grouping step, Agora uses Mistral Large to label and summarize the representative opinions of each group, but those summaries are only an aid for reading the results. The source statements remain visible under each group, and AI summaries can be turned off by conversation owners.",
        },
        {
          question: "What is Plural Voting?",
          answer:
            "Plural Voting is used when a group needs to prioritize proposals, not just map opinions. It helps produce a ranked list while accounting for diversity within the group. Instead of only rewarding the largest bloc, it looks for priorities that can hold legitimacy across differences.",
        },
      ],
    },
    {
      title: "Privacy & Trust",
      items: [
        {
          question: "How does Agora protect privacy with zero-knowledge proofs?",
          answer:
            "[Zero-knowledge proofs (ZKP)](https://en.wikipedia.org/wiki/Zero-knowledge_proof) let participants prove eligibility or uniqueness without revealing any personal data. For example, proving your age group to Agora without revealing your actual age. Currently Agora supports [ZK Passport](https://rarimo.com/), which allows you to prove citizenship, age, and gender anonymously. Contact us if you want to discover and configure other identity systems such as anonymous proof of event attendence, GPS location, or even WiFi connection.",
        },
        {
          question: "Is participation on Agora anonymous?",
          answer:
            "Agora supports privacy-preserving participation, but anonymity depends on the setup and on what people write. [Why ZKPs alone aren't enough to protect privacy](https://docs.google.com/presentation/d/e/2PACX-1vRKRJW4-ZUHso3o-KzzwemuezH7ifLENCpvJCr9552PlRHzOtyxetsLM-4ghHDwCA/pub?start=false&loop=false&delayms=3000).",
        },
        {
          question: "How does moderation work?",
          answer:
            "Anyone can report content such as spam, misleading, antisocial, sexual, doxxing, or illegal content. Conversation creators and moderators can act on reports, and moderation actions are recorded in moderation history.",
        },
        {
          question: "Is Agora GDPR compliant?",
          answer:
            "Agora is developed by ZKorum SAS in France and is designed around privacy by design, data minimization, user rights, and GDPR obligations.",
        },
      ],
    },
    {
      title: "Open Infrastructure",
      items: [
        {
          question: "Is Agora open source?",
          answer:
            "Yes. Agora's code is available on [GitHub](https://github.com/zkorum/agora) under open-source licenses. We encourage auditing, feedback, and contributions from the community. We uphold the vision that democracy needs digital infrastructure that anyone can use, modify, and improve.",
        },
        {
          question: "Can Agora work with other tools?",
          answer:
            "Yes. Agora supports practical interoperability through imports, exports, embeds, APIs (under development), and open-source code. We also launched the [DDS (Decentralized Deliberation Standard)](https://dds.xyz) initiative, for broader protocol-level interoperability.",
        },
      ],
    },
  ];
</script>

<section
  id="faq"
  class="
    px-4 py-14
    sm:px-8
  "
>
  <div class="mx-auto max-w-[1120px]">
    <div class="mb-8 max-w-[640px]">
      <Text size="base" weight="bold">
        <GradientText>FAQ</GradientText>
      </Text>
    </div>

    <div class="max-w-[920px] border-y border-border">
      {#each faqGroups as group (group.title)}
        <details class="faq-group border-b border-border last:border-b-0">
          <summary
            class="
              flex cursor-pointer list-none items-center justify-between gap-4
              py-5
            "
          >
            <div>
              <Text size="base" weight="bold" element="span">
                {group.title}
              </Text>
              <Text size="xs" class="mt-1 text-secondary-foreground">
                {group.items.length} questions
              </Text>
            </div>
            <span
              class="
                faq-group-icon inline-flex size-7 shrink-0 items-center
                justify-center rounded-full border border-border text-lg
                leading-none text-brand-purple
              "
              aria-hidden="true"
            >
              +
            </span>
          </summary>

          <div class="pb-5">
            {#each group.items as item (item.question)}
              <details class="faq-item border-t border-border py-4">
                <summary
                  class="
                    flex cursor-pointer list-none items-start justify-between
                    gap-4
                  "
                >
                  <Text size="base" weight="semibold" element="span">
                    {item.question}
                  </Text>
                  <span
                    class="
                      faq-item-icon mt-1 inline-flex size-6 shrink-0 items-center
                      justify-center rounded-full border border-border text-base
                      leading-none text-brand-purple
                    "
                    aria-hidden="true"
                  >
                    +
                  </span>
                </summary>
                <Text
                  size="sm"
                  class="mt-3 max-w-[760px] text-secondary-foreground"
                >
                  {#each parseAnswer(item.answer) as segment}
                    {#if segment.href}
                      <a
                        href={segment.href}
                        target={isExternalHref(segment.href)
                          ? "_blank"
                          : undefined}
                        rel={isExternalHref(segment.href)
                          ? "noreferrer"
                          : undefined}
                        class="
                          font-semibold text-brand-purple underline
                          underline-offset-2
                        "
                      >
                        {segment.text}
                      </a>
                    {:else}
                      {segment.text}
                    {/if}
                  {/each}
                  {#if item.link}
                    <a
                      href={item.link.href}
                      target="_blank"
                      rel="noreferrer"
                      class="
                        ml-1 font-semibold text-brand-purple underline
                        underline-offset-2
                      "
                    >
                      {item.link.label}
                    </a>.
                  {/if}
                </Text>
              </details>
            {/each}
          </div>
        </details>
      {/each}
    </div>
  </div>
</section>

<style>
  summary::-webkit-details-marker {
    display: none;
  }

  .faq-group-icon,
  .faq-item-icon {
    transition: transform 150ms ease;
  }

  .faq-group[open] > summary .faq-group-icon,
  .faq-item[open] > summary .faq-item-icon {
    transform: rotate(45deg);
  }
</style>
