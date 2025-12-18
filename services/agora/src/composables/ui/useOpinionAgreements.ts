import type { OpinionItem, VotingOption } from "src/shared/types/zod";
import { type Ref } from "vue";

export interface OpinionAgreementSnapshot {
  opinionSlugId: string;
  numAgrees: number;
  numDisagrees: number;
  numPasses: number;
}

export function useOpinionAgreements(opinionList: Ref<OpinionItem[]>) {
  function updateOpinionAgreementCount(
    opinionSlugId: string,
    agreementType: VotingOption,
    increment: boolean
  ) {
    const updateOpinionItem = (opinionItem: OpinionItem) => {
      if (opinionItem.opinionSlugId === opinionSlugId) {
        const delta = increment ? 1 : -1;
        switch (agreementType) {
          case "agree":
            opinionItem.numAgrees = opinionItem.numAgrees + delta;
            break;
          case "disagree":
            opinionItem.numDisagrees = opinionItem.numDisagrees + delta;
            break;
          case "pass":
            opinionItem.numPasses = opinionItem.numPasses + delta;
            break;
        }
      }
      return opinionItem;
    };

    opinionList.value = opinionList.value.map(updateOpinionItem);
  }

  function addOpinionAgreement(
    opinionSlugId: string,
    agreementType: VotingOption
  ) {
    updateOpinionAgreementCount(opinionSlugId, agreementType, true);
  }

  function removeOpinionAgreement(
    opinionSlugId: string,
    originalAgreement: VotingOption
  ) {
    updateOpinionAgreementCount(opinionSlugId, originalAgreement, false);
  }

  function createSnapshot(
    opinionSlugId: string
  ): OpinionAgreementSnapshot | null {
    const opinion = opinionList.value.find(
      (item) => item.opinionSlugId === opinionSlugId
    );

    if (!opinion) return null;

    return {
      opinionSlugId: opinion.opinionSlugId,
      numAgrees: opinion.numAgrees,
      numDisagrees: opinion.numDisagrees,
      numPasses: opinion.numPasses,
    };
  }

  function restoreSnapshot(snapshot: OpinionAgreementSnapshot): void {
    const updateOpinionItem = (opinionItem: OpinionItem) => {
      if (opinionItem.opinionSlugId === snapshot.opinionSlugId) {
        opinionItem.numAgrees = snapshot.numAgrees;
        opinionItem.numDisagrees = snapshot.numDisagrees;
        opinionItem.numPasses = snapshot.numPasses;
      }
      return opinionItem;
    };

    opinionList.value = opinionList.value.map(updateOpinionItem);
  }

  return {
    addOpinionAgreement,
    removeOpinionAgreement,
    createSnapshot,
    restoreSnapshot,
  };
}
