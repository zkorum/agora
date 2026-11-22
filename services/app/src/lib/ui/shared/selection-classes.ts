// Both Bits widgets use the same field, portal, keyboard-highlight and touch-target presentation.
export const selectionClasses = {
  control:
    "items-center min-w-0 border border-sky-lighter bg-sky-white font-sans font-medium text-start text-ink-base cursor-pointer outline-none [&:hover:not(:disabled):not([data-disabled]):not(:focus-within)]:border-sky-dark focus-within:border-primary-base focus-within:ring-2 focus-within:ring-primary-light focus-visible:border-primary-base focus-visible:ring-2 focus-visible:ring-primary-light aria-invalid:border-red-darkest disabled:bg-sky-lightest disabled:opacity-55 disabled:cursor-not-allowed data-disabled:bg-sky-lightest data-disabled:opacity-55 data-disabled:cursor-not-allowed",
  compactControl:
    "inline-flex min-h-10 gap-2 rounded-lg px-3 py-2 text-sm leading-5",
  fieldControl:
    "flex w-full min-h-15 gap-3 rounded-xl p-[17px] text-base leading-6",
  action:
    "grid min-w-8 min-h-6 shrink-0 cursor-pointer place-items-center self-stretch rounded-sm border-0 bg-transparent p-0 text-ink-light focus-visible:outline-2 focus-visible:outline-primary-base focus-visible:outline-offset-2 disabled:cursor-not-allowed pointer-coarse:min-h-11 pointer-coarse:min-w-11",
  content:
    "z-100 max-h-[min(340px,var(--selection-available-height))] max-w-[min(calc(100vw-24px),var(--selection-available-width))] overflow-hidden rounded-xl border border-sky-lighter bg-sky-white p-1 text-start font-sans text-ink-base shadow-[0_8px_24px_#211a3326] [--avatar-size:32px] [--avatar-name-size:16px] [--avatar-gap:12px] [--avatar-detail-display:none]",
  compactContent:
    "min-w-[min(max(12rem,var(--selection-anchor-width)),var(--selection-available-width))] text-sm leading-5",
  fieldContent: "w-(--selection-anchor-width) min-w-0 text-base leading-6",
  viewport:
    "min-h-0 max-h-[max(0px,calc(min(340px,var(--selection-available-height))-10px))] overscroll-contain",
  option:
    "flex min-h-11 shrink-0 cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 outline-none data-selected:font-medium data-selected:not-data-highlighted:bg-primary-lightest data-highlighted:bg-sky-lighter data-disabled:cursor-not-allowed data-disabled:opacity-45",
  status: "m-0 px-3 py-3.5 text-sm leading-5 text-ink-light",
};
