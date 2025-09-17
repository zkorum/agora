import { type Ref } from "vue";
import type { OpinionItem, VotingOption } from "src/shared/types/zod";

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

  return {
    addOpinionAgreement,
    removeOpinionAgreement,
  };
}
