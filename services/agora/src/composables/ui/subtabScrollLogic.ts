interface SubtabScrollState<T extends string> {
  savePosition: (params: { tab: T; currentScroll: number }) => void;
  getRestorationTarget: (params: {
    tab: T;
    defaultTab: T;
    isExplicitNavigation: boolean;
  }) => number | "action-bar";
  clearAll: () => void;
}

export function createSubtabScrollState<
  T extends string,
>(): SubtabScrollState<T> {
  const positions = new Map<T, number>();

  function savePosition({
    tab,
    currentScroll,
  }: {
    tab: T;
    currentScroll: number;
  }): void {
    positions.set(tab, currentScroll);
  }

  function getRestorationTarget({
    tab,
    defaultTab,
    isExplicitNavigation,
  }: {
    tab: T;
    defaultTab: T;
    isExplicitNavigation: boolean;
  }): number | "action-bar" {
    // Summary (default tab): always scroll to action bar
    if (tab === defaultTab) {
      return "action-bar";
    }

    // Explicit navigation ("View More" / programmatic switchToTab): scroll to action bar
    if (isExplicitNavigation) {
      return "action-bar";
    }

    // Returning to a previously visited subtab: restore saved position
    const saved = positions.get(tab);
    if (saved !== undefined) {
      return saved;
    }

    // First visit: scroll to action bar
    return "action-bar";
  }

  function clearAll(): void {
    positions.clear();
  }

  return { savePosition, getRestorationTarget, clearAll };
}
