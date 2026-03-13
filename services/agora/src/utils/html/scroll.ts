export function getHeaderHeight(): number {
  return document.querySelector(".q-header")?.clientHeight ?? 0;
}

export function getElementScrollTop({
  element,
  scrollContainer,
}: {
  element: HTMLElement;
  scrollContainer?: HTMLElement | null;
}): number {
  if (scrollContainer) {
    return (
      element.getBoundingClientRect().top -
      scrollContainer.getBoundingClientRect().top +
      scrollContainer.scrollTop
    );
  }
  return element.getBoundingClientRect().top + window.scrollY;
}

export function scrollTo({
  top,
  behavior,
  scrollContainer,
}: {
  top: number;
  behavior?: ScrollBehavior;
  scrollContainer?: HTMLElement | null;
}): void {
  if (scrollContainer) {
    scrollContainer.scrollTo({ top, behavior });
  } else {
    window.scrollTo({ top, behavior });
  }
}

export function getScrollTop({
  scrollContainer,
}: {
  scrollContainer?: HTMLElement | null;
}): number {
  return scrollContainer?.scrollTop ?? window.scrollY;
}

export function getViewportHeight({
  scrollContainer,
}: {
  scrollContainer?: HTMLElement | null;
}): number {
  return scrollContainer?.clientHeight ?? window.innerHeight;
}
