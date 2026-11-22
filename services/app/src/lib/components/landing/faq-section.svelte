<script lang="ts">
  import * as m from "#lib/paraglide/messages.js";
  import { getLocale, localizeHref } from "#lib/paraglide/runtime.js";
  import FaqDisclosure from "$ui/landing/faq-disclosure.svelte";
  import GradientText from "$ui/shared/gradient-text.svelte";
  import Text from "$ui/shared/text.svelte";

  import { getFaqContent } from "./faq-content.js";

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
        <GradientText>{m.faq_label()}</GradientText>
      </Text>
    </div>

    <div class="max-w-[1040px] border-y border-border">
      {#each faqGroups as group (group.title)}
        <FaqDisclosure level="group" label={group.title}>
          {#snippet heading()}
            <span>
              <Text size="xl" weight="bold" element="span"
                ><GradientText>{group.title}</GradientText></Text
              >
              <Text
                size="xs"
                weight="bold"
                element="span"
                class="mt-1 block text-muted-foreground"
                >{group.items.length} {faqContent.questionCountLabel}</Text
              >
            </span>
          {/snippet}

          <div
            class="
              px-5 pb-5
              sm:px-6
            "
          >
            {#each group.items as item (item.question)}
              <FaqDisclosure level="question" label={item.question}>
                {#snippet heading()}<Text
                    size="base"
                    weight="semibold"
                    element="span">{item.question}</Text
                  >{/snippet}
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
                {#if item.comparison}
                  <div
                    class="
                      mt-6 overflow-hidden rounded-xl border border-border
                    "
                  >
                    <table
                      class="
                        w-full table-fixed border-collapse text-start text-sm
                        wrap-break-word
                      "
                    >
                      <caption class="sr-only">{item.question}</caption>
                      <thead class="bg-gradient-light-purple/20">
                        <tr>
                          <th
                            scope="col"
                            class="
                              w-[44%] px-2 py-3 font-semibold text-foreground
                              sm:px-4
                            "
                          >
                            {item.comparison.firstColumnLabel}
                          </th>
                          {#each item.comparison.columns as column (column)}
                            <th
                              scope="col"
                              class="
                                w-[28%] border-s border-border px-2 py-3
                                font-semibold text-foreground
                                sm:px-4
                              "
                            >
                              {column}
                            </th>
                          {/each}
                        </tr>
                      </thead>
                      <tbody>
                        {#each item.comparison.rows as row (row.feature)}
                          <tr class="border-t border-border align-top">
                            <th
                              scope="row"
                              class="
                                px-2 py-3 font-medium text-foreground
                                sm:px-4
                              "
                            >
                              {row.feature}
                            </th>
                            {#each row.values as value, valueIndex (valueIndex)}
                              <td
                                class="
                                  border-s border-border px-2 py-3
                                  text-secondary-foreground
                                  sm:px-4
                                "
                              >
                                {value}
                              </td>
                            {/each}
                          </tr>
                        {/each}
                      </tbody>
                    </table>
                  </div>
                {/if}
              </FaqDisclosure>
            {/each}
          </div>
        </FaqDisclosure>
      {/each}
    </div>
  </div>
</section>
