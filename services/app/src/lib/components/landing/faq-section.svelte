<script lang="ts">
  import { getLocale, localizeHref } from "$lib/paraglide/runtime";
  import GradientText from "$ui/shared/gradient-text.svelte";
  import Text from "$ui/shared/text.svelte";

  import { getFaqContent } from "./faq-content";

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
      const index = match.index;

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

  function getSegmentHref(href: string) {
    return isExternalHref(href) ? href : localizeHref(href);
  }

  const faqContent = $derived(getFaqContent(getLocale()));
  const faqGroups = $derived(faqContent.groups);
</script>

<section
  id="faq"
  class="
    px-4 py-20
    sm:px-8
  "
>
  <div class="mx-auto max-w-[1120px]">
    <div class="mb-12 max-w-[720px]">
      <Text size="base" weight="bold">
        <GradientText>FAQ</GradientText>
      </Text>
    </div>

    <div class="max-w-[1040px] border-y border-border">
      {#each faqGroups as group (group.title)}
        <details
          class="
            border-b border-border py-2
            last:border-b-0
          "
        >
          <summary
            class="
              flex cursor-pointer list-none items-center justify-between gap-4
              rounded-lg bg-gradient-light-purple/20 p-5
              sm:px-6
            "
          >
            <div>
              <Text size="xl" weight="bold" element="span">
                <GradientText>{group.title}</GradientText>
              </Text>
              <Text size="xs" weight="bold" class="mt-1 text-muted-foreground">
                {group.items.length}
                {faqContent.questionCountLabel}
              </Text>
            </div>
            <span
              class="
                inline-flex size-8 shrink-0 items-center justify-center
                rounded-full border border-border text-lg leading-none
                text-brand-purple
              "
              aria-hidden="true"
            >
              +
            </span>
          </summary>

          <div
            class="
            px-5 pb-5
            sm:px-6
          "
          >
            {#each group.items as item (item.question)}
              <details
                class="
                border-t border-border py-5
                first:border-t-0
              "
              >
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
                      mt-1 inline-flex size-7 shrink-0 items-center
                      justify-center rounded-full border border-border text-base
                      leading-none text-primary-base
                    "
                    aria-hidden="true"
                  >
                    +
                  </span>
                </summary>
                <Text
                  size="base"
                  class="mt-4 max-w-[820px] text-secondary-foreground"
                >
                  {#each parseAnswer(item.answer) as segment, segmentIndex (segmentIndex)}
                    {#if segment.href}
                      <a
                        href={getSegmentHref(segment.href)}
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

  details > summary > span[aria-hidden="true"] {
    transition: transform 150ms ease;
  }

  details[open] > summary > span[aria-hidden="true"] {
    transform: rotate(45deg);
  }
</style>
