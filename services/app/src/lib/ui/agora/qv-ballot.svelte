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

<section class="qv" aria-label="Quadratic voting visual preview">
  <header>
    <p>Quadratic voting</p>
    <h3>
      Give more votes to the statements you care about. Each statement’s cost is
      its votes squared.
    </h3>
  </header>
  <div class="table-heading" aria-hidden="true">
    <span>Statement</span><span>Votes</span><span>Credits</span>
  </div>
  <ul class="rows">
    {#each rows as row (row.id)}
      <li>
        <div class="item">
          <h4>{row.title}</h4>
          <div class="description">
            <ExpandableText text={row.description} lines={2} />
          </div>
          <BitsButton.Root
            class="read-item"
            type="button"
            onclick={() => {
              onread(row.id);
            }}
            >Read full response<span class="sr-only">: {row.title}</span
            ></BitsButton.Root
          >
        </div>
        <div
          class="controls"
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
          ><output class={row.tone} aria-label={`Votes: ${row.votes}`}
            >{row.votes}</output
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
        <figure>
          <div
            class="
              square
              {row.tone}"
            role="img"
            aria-label={`${row.credits}, ${row.votes} votes`}
          >
            <span
              style:width={`${row.squarePercent}%`}
              style:height={`${row.squarePercent}%`}
            ></span>
          </div>
          <figcaption>{row.credits}</figcaption>
        </figure>
      </li>
    {/each}
  </ul>
  <footer>
    <div>
      <div class="balance">
        <span aria-live="polite" aria-atomic="true">{remaining}</span
        ><Meter.Root
          class="agora-credit-meter"
          min={0}
          max={100}
          value={meterPercent}
          aria-label="Credits remaining"
          ><span class="meter-fill" style:width={`${meterPercent}%`}
          ></span></Meter.Root
        >
      </div>
      <p>You can submit without spending all your credits.</p>
    </div>
    <Button variant="solid" size="control" disabled>Submit votes</Button>
  </footer>
</section>

<style>
  .qv {
    padding: 40px 24px 24px;
    background: white;
    border: 1px solid var(--sky-lighter);
    border-radius: 12px;
  }
  header {
    margin-block-end: 28px;
  }
  header p {
    font-size: 14px;
    color: var(--ink-light);
    margin-block-end: 8px;
  }
  h3 {
    font-size: 16px;
    font-weight: 500;
    line-height: 1.6;
  }
  .table-heading,
  li {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 150px 80px;
    gap: 32px;
    align-items: center;
  }
  .table-heading {
    padding: 16px;
    border-block-end: 1px solid var(--sky-lighter);
    font-size: 12px;
    color: var(--ink-light);
  }
  .table-heading span:not(:first-child) {
    text-align: center;
  }
  .rows {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  li {
    min-height: 166px;
    padding: 24px 16px;
    border-block-end: 1px solid var(--sky-lighter);
  }
  h4 {
    font-size: 18px;
    font-weight: 600;
    line-height: 26px;
    margin: 0 0 8px;
  }
  .description {
    color: var(--ink-light);
    font-size: 16px;
    line-height: 24px;
  }
  .item :global(.read-item) {
    position: relative;
    display: block;
    padding: 0;
    margin-block-start: 12px;
    background: transparent;
    border: 0;
    color: var(--sky-dark);
    text-align: start;
    font: inherit;
    font-size: 16px;
    text-decoration: underline;
    cursor: pointer;
  }
  .item :global(.read-item:focus-visible) {
    outline: 3px solid var(--primary-light);
    outline-offset: 3px;
  }
  .controls {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .controls :global(button) {
    width: 50px;
    height: 50px;
  }
  output {
    min-width: 48px;
    text-align: center;
    font-size: 16px;
  }
  output.support {
    color: var(--primary-base);
  }
  output.opposition {
    color: var(--red-darkest);
  }
  figure {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    margin: 0;
  }
  .square {
    display: flex;
    align-items: flex-end;
    width: 80px;
    height: 80px;
    background: var(--sky-lighter);
    border-radius: 3px;
    overflow: hidden;
  }
  .square span {
    display: block;
    background: var(--primary-base);
    border-radius: 2px;
  }
  .square.opposition span {
    background: var(--red-base);
  }
  figcaption {
    font-size: 12px;
    color: var(--ink-light);
  }
  footer {
    position: sticky;
    inset-block-end: 0;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    flex-wrap: wrap;
    border-block-start: 1px solid var(--sky-lighter);
    margin-block-start: 24px;
    padding-block: 24px max(24px, env(safe-area-inset-bottom, 0px));
    background: var(--sky-white);
  }
  .balance {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    font-size: 14px;
  }
  :global(.agora-credit-meter) {
    width: 80px;
    height: 6px;
    background: var(--sky-lighter);
    border-radius: 99px;
  }
  .meter-fill {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: var(--primary-base);
  }
  footer p {
    margin-block-start: 8px;
    font-size: 12px;
    color: var(--ink-light);
  }
  @media (max-width: 760px) {
    .qv {
      padding: 16px 0 0;
      border: 0;
      border-radius: 0;
      background: transparent;
    }
    header {
      margin-block-end: 24px;
    }
    header p {
      font-size: 14px;
      margin-block-end: 4px;
    }
    h3 {
      font-size: 18px;
      font-weight: 600;
      line-height: 24px;
    }
    .rows {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .table-heading {
      display: none;
    }
    li {
      grid-template-columns: 150px minmax(0, 1fr);
      min-height: 247px;
      padding: 24px 16px 16px;
      border: 1px solid var(--sky-lighter);
      border-radius: 12px;
      background: white;
      gap: 16px;
    }
    .statement {
      grid-column: 1 / -1;
    }
    .controls {
      justify-content: flex-start;
    }
    h4 {
      line-height: 24px;
    }
    .description {
      font-size: 14px;
      line-height: 23.5px;
    }
    figure {
      flex-direction: row-reverse;
      justify-self: end;
    }
    .square {
      width: 50px;
      height: 50px;
    }
    figcaption {
      white-space: nowrap;
      font-size: 14px;
    }
    footer {
      display: block;
      margin-inline: var(--qv-footer-inset, 0px);
      margin-block-start: 24px;
      padding: 12px 20px max(40px, env(safe-area-inset-bottom, 0px));
    }
    footer p {
      display: none;
    }
    .balance {
      flex-wrap: nowrap;
      gap: 12px;
      white-space: nowrap;
      font-size: 16px;
    }
    :global(.agora-credit-meter) {
      flex: 1;
      min-width: 0;
    }
    footer :global(button) {
      margin-block-start: 16px;
      width: 100%;
      min-height: 50px;
      border-radius: 999px;
      font-size: 16px;
      font-weight: 400;
    }
  }
</style>
