// Non-cryptographic fixture randomness. The avalanche finalizer prevents nearby
// item/cohort identifiers from producing nearly identical probabilities.
export function stableHash(value: string): number {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index++) {
        hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
    }
    hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
    hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
    return (hash ^ (hash >>> 16)) >>> 0;
}
export function stableFraction(value: string): number {
    return stableHash(value) / 0x100000000;
}
