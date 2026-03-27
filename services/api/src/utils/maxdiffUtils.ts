/**
 * Shared utility functions for MaxDiff/ranking services.
 */

/**
 * Build an item-to-index mapping from a list of item IDs.
 */
export function buildItemIndex(items: string[]): Map<string, number> {
    const index = new Map<string, number>();
    for (let i = 0; i < items.length; i++) {
        index.set(items[i], i);
    }
    return index;
}

/**
 * Fisher-Yates (Knuth) in-place shuffle.
 * Returns the same array reference, mutated.
 */
export function fisherYatesShuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}
