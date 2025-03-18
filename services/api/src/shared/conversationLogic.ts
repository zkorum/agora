/** **** WARNING: GENERATED FROM SHARED DIRECTORY, DO NOT MOFIFY THIS FILE DIRECTLY! **** **/
interface ClassifyProps {
    numAgrees: number;
    numDisagrees: number;
    memberCount: number;
    threshold?: number;
}

interface IsPopularProps {
    numAgrees: number;
    memberCount: number;
    threshold?: number;
}

interface IsUnpopularProps {
    numDisagrees: number;
    memberCount: number;
    threshold?: number;
}

export const DEFAULT_THRESHOLD = 0.5;

export function isControversial({
    numAgrees,
    numDisagrees,
    memberCount,
    threshold,
}: ClassifyProps): boolean {
    const actualThreshold: number = threshold ?? DEFAULT_THRESHOLD;
    if (
        (numAgrees + numDisagrees) / memberCount > actualThreshold &&
        Math.abs(numAgrees - numDisagrees) / memberCount < actualThreshold
    ) {
        return true;
    } else {
        return false;
    }
}

export function isPopular({
    numAgrees,
    memberCount,
    threshold,
}: IsPopularProps): boolean {
    const actualThreshold: number = threshold ?? DEFAULT_THRESHOLD;
    if (numAgrees / memberCount > actualThreshold) {
        return true;
    } else {
        return false;
    }
}

export function isUnpopular({
    numDisagrees,
    memberCount,
    threshold,
}: IsUnpopularProps): boolean {
    const actualThreshold: number = threshold ?? DEFAULT_THRESHOLD;
    if (numDisagrees / memberCount > actualThreshold) {
        return true;
    } else {
        return false;
    }
}

export function isMajority({
    numAgrees,
    numDisagrees,
    memberCount,
    threshold,
}: ClassifyProps): boolean {
    if (
        isPopular({ numAgrees, memberCount, threshold }) ||
        isUnpopular({ numDisagrees, memberCount, threshold })
    ) {
        return true;
    } else {
        return false;
    }
}
