import { onActivated, onDeactivated, onUnmounted } from "vue";

interface UseMaxDiffHistoryUndoParams {
  onUndo: () => void;
  canUndo: () => boolean;
}

interface UseMaxDiffHistoryUndo {
  pushUndoEntry: () => void;
  pushMultipleEntries: (count: number) => void;
  consumeUndoEntry: () => void;
  clearAllUndoEntries: () => void;
}

export function useMaxDiffHistoryUndo({
  onUndo,
  canUndo,
}: UseMaxDiffHistoryUndoParams): UseMaxDiffHistoryUndo {
  let undoCount = 0;
  let skipNextPopstate = false;
  let isClearing = false;

  function handlePopstate(): void {
    if (skipNextPopstate) {
      skipNextPopstate = false;
      return;
    }
    if (isClearing) {
      isClearing = false;
      return;
    }
    if (undoCount > 0) {
      undoCount--;
      if (canUndo()) {
        onUndo();
      }
    }
  }

  function attachListener(): void {
    window.addEventListener("popstate", handlePopstate);
  }

  function detachListener(): void {
    window.removeEventListener("popstate", handlePopstate);
  }

  function pushUndoEntry(): void {
    try {
      history.pushState(null, "", window.location.href);
      undoCount++;
    } catch {
      // WeChat embedded browser may block pushState
    }
  }

  function pushMultipleEntries(count: number): void {
    for (let i = 0; i < count; i++) {
      pushUndoEntry();
    }
  }

  function consumeUndoEntry(): void {
    if (undoCount <= 0) return;
    skipNextPopstate = true;
    undoCount--;
    history.back();
  }

  function clearAllUndoEntries(): void {
    if (undoCount <= 0) return;
    const jumps = undoCount;
    undoCount = 0;
    isClearing = true;
    history.go(-jumps);
  }

  // onActivated fires on initial mount too (KeepAlive), so no need for onMounted
  onUnmounted(() => {
    detachListener();
    if (undoCount > 0) {
      const jumps = undoCount;
      undoCount = 0;
      isClearing = true;
      history.go(-jumps);
    }
  });
  onActivated(attachListener);
  onDeactivated(detachListener);

  return { pushUndoEntry, pushMultipleEntries, consumeUndoEntry, clearAllUndoEntries };
}
