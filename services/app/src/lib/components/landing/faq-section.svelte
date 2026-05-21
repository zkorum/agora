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

  function getSegmentHref(href: string) {
    return isExternalHref(href) ? href : localizeHref(href);
  }

  const faqContent = $derived(getFaqContent(getLocale()));
  const faqGroups = $derived(faqContent.groups);
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
                {group.items.length} {faqContent.questionCountLabel}
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

  .faq-group-icon,
  .faq-item-icon {
    transition: transform 150ms ease;
  }

  .faq-group[open] > summary .faq-group-icon,
  .faq-item[open] > summary .faq-item-icon {
    transform: rotate(45deg);
  }
</style>
