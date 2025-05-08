/** **** WARNING: GENERATED FROM SHARED DIRECTORY, DO NOT MOFIFY THIS FILE DIRECTLY! **** **/
interface ClassifyProps {
    numAgrees: number;
    numDisagrees: number;
    memberCount: number;
    minVoters?: number;
    differenceThreshold?: number;
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

export const DEFAULT_MIN_VOTERS = 0.5;
export const DEFAULT_DIFFERENCE_THRESHOLD = 0.2;
export const DEFAULT_MAJORITY_THRESHOLD = 0.6;

export function isControversial({
    numAgrees,
    numDisagrees,
    memberCount,
    minVoters,
    differenceThreshold,
}: ClassifyProps): boolean {
    const actualMinVoters: number = minVoters ?? DEFAULT_MIN_VOTERS;
    const actualDifferenceThreshold: number =
        differenceThreshold ?? DEFAULT_DIFFERENCE_THRESHOLD;
    if (
        (numAgrees + numDisagrees) / memberCount >= actualMinVoters &&
        Math.abs(numAgrees - numDisagrees) / memberCount <=
            actualDifferenceThreshold
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
    const actualThreshold: number = threshold ?? DEFAULT_MAJORITY_THRESHOLD;
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
    const actualThreshold: number = threshold ?? DEFAULT_MAJORITY_THRESHOLD;
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
    minVoters,
}: ClassifyProps): boolean {
    if (
        isPopular({ numAgrees, memberCount, threshold: minVoters }) ||
        isUnpopular({ numDisagrees, memberCount, threshold: minVoters })
    ) {
        return true;
    } else {
        return false;
    }
}
