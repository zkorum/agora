import { readonly, ref } from "vue";

export function useVotingActionGuard() {
  const isPending = ref(false);
  let generation = 0;

  function capture(): () => boolean {
    const currentGeneration = generation;
    return () => currentGeneration === generation;
  }

  async function run<T>(
    action: (isCurrent: () => boolean) => Promise<T>
  ): Promise<T | undefined> {
    if (isPending.value) return undefined;
    isPending.value = true;
    const isCurrent = capture();
    try {
      const result = await action(isCurrent);
      return isCurrent() ? result : undefined;
    } finally {
      if (isCurrent()) isPending.value = false;
    }
  }

  function invalidate(): void {
    generation += 1;
    isPending.value = false;
  }

  return { isPending: readonly(isPending), capture, run, invalidate };
}
