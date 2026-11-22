<script lang="ts">
  import { Button as BitsButton, Meter } from "bits-ui";

  import Button from "$ui/shared/button.svelte";
  import ExpandableText from "$ui/shared/expandable-text.svelte";
  import Icon from "$ui/shared/icon.svelte";

  import type { QvAllocationView } from "./view-types.js";

  let {
    rows,
    remaining,
    remainingPercent,
    onallocationchange,
    disabled = false,
    onread,
  }: {
    rows: readonly QvAllocationView[];
    remaining: string;
    remainingPercent: number;
    onallocationchange: (change: {
      id: string;
      direction: "fewer" | "more";
    }) => void;
    disabled?: boolean;
    onread: (id: string) => void;
  } = $props();

  // A reduced allowance can leave a refundable draft over budget, but a meter
  // must still expose a value within its declared range.
  const meterPercent = $derived(Math.max(0, Math.min(100, remainingPercent)));
</script>

<section
  class="
    rounded-xl border border-sky-lighter bg-sky-white px-6 pt-10 pb-6
    max-md:rounded-none max-md:border-0 max-md:bg-transparent max-md:px-0
    max-md:pt-4 max-md:pb-0
  "
  aria-label="Quadratic voting visual preview"
>
  <header
    class="
      mb-7
      max-md:mb-6
    "
  >
    <p
      class="
        mb-2 text-sm text-ink-light
        max-md:mb-1
      "
    >
      Quadratic voting
    </p>
    <h3
      class="
        text-base leading-[1.6] font-medium
        max-md:text-lg/6 max-md:font-semibold
      "
    >
      Give more votes to the statements you care about. Each statement’s cost is
      its votes squared.
    </h3>
  </header>
  <div
    class="
      grid grid-cols-[minmax(0,1fr)_150px_80px] items-center gap-8 border-b
      border-sky-lighter p-4 text-xs text-ink-light
      max-md:hidden
      [&>span:not(:first-child)]:text-center
    "
    aria-hidden="true"
  >
    <span>Statement</span><span>Votes</span><span>Credits</span>
  </div>
  <ul
    class="
      m-0 list-none p-0
      max-md:flex max-md:flex-col max-md:gap-4
    "
  >
    {#each rows as row (row.id)}
      <li
        class="
          grid min-h-[166px] grid-cols-[minmax(0,1fr)_150px_80px] items-center
          gap-8 border-b border-sky-lighter px-4 py-6
          max-md:min-h-[247px] max-md:grid-cols-[150px_minmax(0,1fr)]
          max-md:gap-4 max-md:rounded-xl max-md:border max-md:bg-sky-white
          max-md:pb-4
        "
      >
        <div
          class="
            min-w-0
            max-md:col-span-full
          "
        >
          <h4
            class="
              mb-2 text-lg/6.5 font-semibold
              max-md:leading-6
            "
          >
            {row.title}
          </h4>
          <div
            class="
              text-base/6 text-ink-light
              max-md:text-sm max-md:leading-[23.5px]
            "
          >
            <ExpandableText text={row.description} lines={2} />
          </div>
          <BitsButton.Root
            class="
              relative mt-3 block cursor-pointer border-0 bg-transparent p-0
              text-start text-base text-sky-dark underline
              focus-visible:outline-3 focus-visible:outline-offset-3
              focus-visible:outline-primary-light
            "
            type="button"
            onclick={() => {
              onread(row.id);
            }}
            >Read full response<span class="sr-only">: {row.title}</span
            ></BitsButton.Root
          >
        </div>
        <div
          class="
            flex items-center justify-center
            max-md:justify-start
            [&_button]:size-12.5
          "
          role="group"
          aria-label={`Votes for ${row.title}`}
        >
          <Button
            disabled={disabled || row.fewerDisabled}
            variant="neutral"
            size="icon"
            aria-label={`Preview fewer votes for ${row.title}`}
            onclick={() => {
              onallocationchange({ id: row.id, direction: "fewer" });
            }}><Icon name="thumbsDown" size={16} /></Button
          ><output
            class={[
              "min-w-12 text-center text-base",
              row.tone === "support" && "text-primary-base",
              row.tone === "opposition" && "text-red-darkest",
            ]}
            aria-label={`Votes: ${row.votes}`}>{row.votes}</output
          ><Button
            disabled={disabled || row.moreDisabled}
            variant="neutral"
            size="icon"
            aria-label={`Preview more votes for ${row.title}`}
            onclick={() => {
              onallocationchange({ id: row.id, direction: "more" });
            }}><Icon name="thumbsUp" size={16} /></Button
          >
        </div>
        <figure
          class="
            m-0 flex flex-col items-center gap-2
            max-md:flex-row-reverse max-md:justify-self-end
          "
        >
          <div
            class="
              flex size-20 items-end overflow-hidden rounded-[3px]
              bg-sky-lighter
              max-md:size-12.5
            "
            role="img"
            aria-label={`${row.credits}, ${row.votes} votes`}
          >
            <span
              class={[
                "block size-(--square-size) rounded-xs",
                row.tone === "opposition" ? "bg-red-base" : "bg-primary-base",
              ]}
              style:--square-size={`${row.squarePercent}%`}
            ></span>
          </div>
          <figcaption
            class="
              text-xs text-ink-light
              max-md:text-sm max-md:whitespace-nowrap
            "
          >
            {row.credits}
          </figcaption>
        </figure>
      </li>
    {/each}
  </ul>
  <footer
    class="
      sticky bottom-0 z-1 mt-6 flex flex-wrap items-center justify-between gap-5
      border-t border-sky-lighter bg-sky-white pt-6
      pb-[max(24px,env(safe-area-inset-bottom,0px))]
      max-md:mx-(--qv-footer-inset,0px) max-md:block max-md:px-5 max-md:pt-3
      max-md:pb-[max(40px,env(safe-area-inset-bottom,0px))]
      max-md:[&_button]:mt-4 max-md:[&_button]:min-h-12.5
      max-md:[&_button]:w-full max-md:[&_button]:rounded-full
      max-md:[&_button]:text-base max-md:[&_button]:font-normal
    "
  >
    <div>
      <div
        class="
          flex flex-wrap items-center gap-3 text-sm
          max-md:flex-nowrap max-md:text-base max-md:whitespace-nowrap
        "
      >
        <span aria-live="polite" aria-atomic="true">{remaining}</span
        ><Meter.Root
          class="
            h-1.5 w-20 rounded-full bg-sky-lighter
            max-md:min-w-0 max-md:flex-1
          "
          min={0}
          max={100}
          value={meterPercent}
          aria-label="Credits remaining"
          ><span
            class="
              block h-full w-(--remaining) rounded-[inherit] bg-primary-base
            "
            style:--remaining={`${meterPercent}%`}
          ></span></Meter.Root
        >
      </div>
      <p
        class="
          mt-2 text-xs text-ink-light
          max-md:hidden
        "
      >
        You can submit without spending all your credits.
      </p>
    </div>
    <Button variant="solid" size="control" disabled>Submit votes</Button>
  </footer>
</section>
