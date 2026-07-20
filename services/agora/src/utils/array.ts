export function getFirstItem<T>(items: readonly T[]): T | undefined {
  return items[0];
}

export function getLastItem<T>(items: readonly T[]): T | undefined {
  return items[items.length - 1];
}
