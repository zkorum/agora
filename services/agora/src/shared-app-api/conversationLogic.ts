/** **** WARNING: GENERATED FROM SHARED-APP-API DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
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
export const DEFAULT_GROUP_AWARE_CONSENSUS_THRESHOLD_BASE = 0.6;
// export const DEFAULT_GROUP_AWARE_CONSENSUS_THRESHOLD_2_CLUSTERS = 0.36; // 0.6 * 0.6
// export const DEFAULT_GROUP_AWARE_CONSENSUS_THRESHOLD_3_CLUSTERS = 0.216; // 0.6 * 0.6 * 0.6
// export const DEFAULT_GROUP_AWARE_CONSENSUS_THRESHOLD_4_CLUSTERS = 0.1296; // 0.6 * 0.6 * 0.6 * 0.6
// export const DEFAULT_GROUP_AWARE_CONSENSUS_THRESHOLD_5_CLUSTERS = 0.07776; // 0.6 * 0.6 * 0.6 * 0.6 * 0.6
// export const DEFAULT_GROUP_AWARE_CONSENSUS_THRESHOLD_6_CLUSTERS = 0.046656; // 0.6 * 0.6 * 0.6 * 0.6 * 0.6 * 0.6

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

export function isMajorityAgree({
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

export function isMajorityDisagree({
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
        isMajorityAgree({ numAgrees, memberCount, threshold: minVoters }) ||
        isMajorityDisagree({ numDisagrees, memberCount, threshold: minVoters })
    ) {
        return true;
    } else {
        return false;
    }
}

export function isGroupAwareConsensusAgree({
    probability,
    numClusters,
    threshold,
}: {
    probability: number | null;
    numClusters: number;
    threshold?: number;
}): boolean {
    if (probability === null) {
        return false;
    }
    const actualThreshold: number =
        threshold !== undefined
            ? threshold * numClusters
            : DEFAULT_GROUP_AWARE_CONSENSUS_THRESHOLD_BASE * numClusters;
    if (probability > actualThreshold) {
        return true;
    } else {
        return false;
    }
}

export function isRepresentativeAgree({
    clusterRepnessProbability,
    clusterRepnessAgreementType,
}: {
    clusterRepnessProbability: number | undefined;
    clusterRepnessAgreementType: "agree" | "disagree" | undefined;
}): boolean {
    if (
        clusterRepnessProbability === undefined ||
        clusterRepnessAgreementType === undefined
    ) {
        return false;
    }
    return clusterRepnessAgreementType === "agree";
}

export function isRepresentativeDisagree({
    clusterRepnessProbability,
    clusterRepnessAgreementType,
}: {
    clusterRepnessProbability: number | undefined;
    clusterRepnessAgreementType: "agree" | "disagree" | undefined;
}): boolean {
    if (
        clusterRepnessProbability === undefined ||
        clusterRepnessAgreementType === undefined
    ) {
        return false;
    }
    return clusterRepnessAgreementType === "disagree";
}
